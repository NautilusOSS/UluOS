const fs = require("fs");
const path = require("path");

function loadJson(filePath) {
  const resolved = path.resolve(filePath);
  try {
    return JSON.parse(fs.readFileSync(resolved, "utf-8"));
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw new Error(`Failed to load ${resolved}: ${err.message}`);
  }
}

function validate(config) {
  const errors = [];
  if (typeof config.port !== "number" || config.port < 1 || config.port > 65535) {
    errors.push(`Invalid port: ${config.port}`);
  }
  if (!config.auth || !["none", "api-key"].includes(config.auth.mode)) {
    errors.push(`Invalid auth.mode: ${config.auth?.mode} (expected "none" or "api-key")`);
  }
  if (config.auth?.mode === "api-key" && config.apiKey === "change-me-in-production") {
    errors.push("Refusing to start with default API key when auth is enabled — set ULUOS_API_KEY");
  }
  if (config.rateLimit?.enabled) {
    if (!config.rateLimit.windowMs || !config.rateLimit.maxRequests) {
      errors.push("rateLimit is enabled but windowMs or maxRequests is missing");
    }
  }
  return errors;
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

  const fileConfig = loadJson(configPath) || {};
  const config = {
    ...defaults,
    ...fileConfig,
    auth: { ...defaults.auth, ...fileConfig.auth },
    rateLimit: { ...defaults.rateLimit, ...fileConfig.rateLimit },
  };
  config.port = parseInt(process.env.PORT, 10) || config.port;

  const servicesFile = loadJson(servicesPath);
  config.services = servicesFile ? servicesFile.services : [];

  config.apiKey = process.env.ULUOS_API_KEY || "change-me-in-production";

  const errors = validate(config);
  if (errors.length > 0) {
    throw new Error(`Config validation failed:\n  - ${errors.join("\n  - ")}`);
  }

  return config;
}

module.exports = { load };
