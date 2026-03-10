const fs = require("fs");
const path = require("path");

function loadJson(filePath) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) return null;
  return JSON.parse(fs.readFileSync(resolved, "utf-8"));
}

function load() {
  const configPath =
    process.env.GATEWAY_CONFIG || path.join(__dirname, "..", "config.json");
  const servicesPath =
    process.env.SERVICES_CONFIG || path.join(__dirname, "..", "services.json");

  const defaults = {
    port: 3000,
    auth: { mode: "none", headerName: "X-API-Key" },
    rateLimit: { enabled: false, windowMs: 60000, maxRequests: 120 },
    pricing: { mode: "disabled" },
    telemetry: { enabled: true, logLevel: "info" },
    cors: { enabled: true, origins: ["*"] },
  };

  const config = { ...defaults, ...loadJson(configPath) };
  config.port = parseInt(process.env.PORT, 10) || config.port;

  const servicesFile = loadJson(servicesPath);
  config.services = servicesFile ? servicesFile.services : [];

  config.apiKey = process.env.ULUOS_API_KEY || "change-me-in-production";

  return config;
}

module.exports = { load };
