const express = require("express");
const path = require("path");

const { load: loadConfig } = require("./config");
const { ServiceRegistry, loadCapabilities } = require("./services/registry");
const logger = require("./utils/logger");

const requestId = require("./middleware/requestId");
const auth = require("./middleware/auth");
const rateLimit = require("./middleware/rateLimit");
const errorHandler = require("./middleware/errorHandler");

const healthRoutes = require("./routes/health");
const servicesRoutes = require("./routes/services");
const capabilitiesRoutes = require("./routes/capabilities");
const pricingRoutes = require("./routes/pricing");
const executeRoutes = require("./routes/execute");
const actionsRoutes = require("./routes/actions");
const sseRoutes = require("./mcp/sse");
const { ToolRegistry } = require("./mcp/tools");
const { McpProtocol } = require("./mcp/protocol");

const config = loadConfig();
logger.setLevel(config.telemetry?.logLevel || "info");

const registry = new ServiceRegistry(config.services);
const capDir =
  process.env.CAPABILITIES_DIR ||
  path.resolve(__dirname, "..", "..", "examples", "capabilities");
const capabilities = loadCapabilities(capDir);

const tools = new ToolRegistry(capabilities, registry);
const mcpProtocol = new McpProtocol(tools);

logger.info({
  msg: "config loaded",
  services: registry.all().length,
  capabilities: capabilities.length,
  mcpTools: tools.list().length,
});

const app = express();

app.use(express.json({ limit: "256kb" }));
app.use(requestId());
app.use(rateLimit(config));

// MCP protocol (SSE transport, no auth — MCP handles its own session)
app.use(sseRoutes(mcpProtocol));

// Root info route
app.get("/", (_req, res) => {
  res.json({
    service: "ulu-gateway",
    version: "0.1.0",
    endpoints: ["/health", "/services", "/capabilities", "/pricing", "/mcp/sse"],
  });
});

// Public routes (no auth)
app.use(healthRoutes(registry));
app.use(servicesRoutes(registry));
app.use(capabilitiesRoutes(capabilities));
app.use(pricingRoutes());

// Auth-gated routes
app.use(auth(config));
app.use(executeRoutes(registry, config));
app.use(actionsRoutes(registry, config));

app.use(errorHandler());

async function start() {
  await registry.startAll();

  const server = app.listen(config.port, () => {
    logger.info({ msg: "UluGateway started", port: config.port });
  });

  async function shutdown(signal) {
    logger.info({ msg: `${signal} received, shutting down` });
    await registry.stopAll();
    server.close(() => process.exit(0));
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start().catch((err) => {
  logger.error({ msg: "failed to start gateway", err: err.message });
  process.exit(1);
});
