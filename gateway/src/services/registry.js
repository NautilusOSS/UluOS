const fs = require("fs");
const path = require("path");
const { StdioMcpClient } = require("./stdio-client");
const logger = require("../utils/logger");

class ServiceRegistry {
  constructor(services = []) {
    this._services = new Map();
    this._clients = new Map();
    this._stubbed = [];

    for (const svc of services) {
      this._services.set(svc.name, svc);
    }
  }

  get(name) {
    return this._services.get(name) || null;
  }

  getClient(name) {
    return this._clients.get(name) || null;
  }

  all() {
    return Array.from(this._services.values());
  }

  publicList() {
    return this.all().filter((s) => s.visibility !== "internal");
  }

  isRoutable(name) {
    const svc = this.get(name);
    if (!svc) return false;
    return svc.visibility !== "internal";
  }

  stubbedServices() {
    return this._stubbed;
  }

  async startAll() {
    const useStubs = process.env.ULUOS_NO_STUBS !== "true";
    const stubScript = path.resolve(__dirname, "stub-mcp-service.js");
    const repoRoot = path.resolve(__dirname, "..", "..", "..");
    const startups = [];

    for (const svc of this._services.values()) {
      if (svc.transport === "stdio" && svc.command) {
        const resolvedArgs = (svc.args || []).map((a) =>
          a.startsWith("/") ? a : path.resolve(repoRoot, a)
        );
        const client = new StdioMcpClient(svc.name, svc.command, resolvedArgs, {
          env: svc.env,
          cwd: svc.cwd,
        });
        this._clients.set(svc.name, client);
        startups.push(
          client.start().catch(async (err) => {
            logger.warn({ msg: "service unavailable, trying stub", service: svc.name, err: err.message });
            this._clients.delete(svc.name);

            if (!useStubs) return;

            const stub = new StdioMcpClient(svc.name, "node", [stubScript], {
              env: { STUB_SERVICE_NAME: svc.name },
            });
            try {
              await stub.start();
              this._clients.set(svc.name, stub);
              this._stubbed.push(svc.name);
            } catch (stubErr) {
              logger.error({ msg: "stub also failed", service: svc.name, err: stubErr.message });
            }
          }),
        );
      }
    }
    await Promise.all(startups);
    logger.info({
      msg: "service registry ready",
      started: Array.from(this._clients.keys()),
      stubbed: this._stubbed,
      total: this._clients.size,
    });
  }

  async stopAll() {
    const stops = [];
    for (const [name, client] of this._clients) {
      stops.push(
        client.stop().catch((err) => {
          logger.warn({ msg: "error stopping service", service: name, err: err.message });
        }),
      );
    }
    await Promise.all(stops);
    this._clients.clear();
  }
}

function loadCapabilities(dir) {
  const capabilities = [];
  const resolved = path.resolve(dir);
  if (!fs.existsSync(resolved)) {
    logger.warn({ msg: "capabilities directory not found", dir: resolved });
    return capabilities;
  }
  const files = fs.readdirSync(resolved).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    try {
      const items = JSON.parse(
        fs.readFileSync(path.join(resolved, file), "utf-8"),
      );
      if (Array.isArray(items)) capabilities.push(...items);
    } catch (err) {
      logger.error({ msg: "failed to load capability file", file, err: err.message });
    }
  }
  return capabilities;
}

module.exports = { ServiceRegistry, loadCapabilities };
