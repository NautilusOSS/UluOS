#!/usr/bin/env node

const path = require("path");
const readline = require("readline");

const { load: loadConfig } = require("./config");
const { ServiceRegistry, loadCapabilities } = require("./services/registry");
const { ToolRegistry } = require("./mcp/tools");
const { McpProtocol } = require("./mcp/protocol");
const logger = require("./utils/logger");

logger.setLevel("error");

async function main() {
  const config = loadConfig();
  const registry = new ServiceRegistry(config.services);

  process.stderr.write("UluOS: starting child services...\n");
  await registry.startAll();
  const live = registry.all().filter(s => registry.getClient(s.name)).length;
  const stubbed = registry.stubbedServices();
  process.stderr.write(`UluOS: ${live}/${config.services.length} services ready`
    + (stubbed.length ? ` (${stubbed.length} stubbed: ${stubbed.join(", ")})` : "")
    + "\n");

  const capDir =
    process.env.CAPABILITIES_DIR ||
    path.resolve(__dirname, "..", "..", "examples", "capabilities");
  const capabilities = loadCapabilities(capDir);

  const tools = new ToolRegistry(capabilities, registry);
  const protocol = new McpProtocol(tools);

  const rl = readline.createInterface({ input: process.stdin, terminal: false });

  function send(obj) {
    process.stdout.write(JSON.stringify(obj) + "\n");
  }

  rl.on("line", async (line) => {
    if (!line.trim()) return;

    let message;
    try {
      message = JSON.parse(line);
    } catch {
      send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
      return;
    }

    const response = await protocol.handle(message);
    if (response) {
      send(response);
    }
  });

  rl.on("close", async () => {
    await registry.stopAll();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    await registry.stopAll();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await registry.stopAll();
    process.exit(0);
  });

  process.stderr.write("UluOS MCP stdio server ready\n");
}

main().catch((err) => {
  process.stderr.write(`UluOS: fatal error: ${err.message}\n`);
  process.exit(1);
});
