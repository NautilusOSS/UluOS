const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

describe("config", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    delete require.cache[require.resolve("../src/config")];
  });

  it("loads defaults when no config file exists", () => {
    process.env.GATEWAY_CONFIG = "/nonexistent/config.json";
    process.env.SERVICES_CONFIG = "/nonexistent/services.json";
    const { load } = require("../src/config");
    const config = load();
    assert.equal(config.port, 3000);
    assert.equal(config.auth.mode, "none");
    assert.equal(config.rateLimit.enabled, false);
  });

  it("rejects invalid port via PORT env", () => {
    process.env.GATEWAY_CONFIG = "/nonexistent/config.json";
    process.env.SERVICES_CONFIG = "/nonexistent/services.json";
    process.env.PORT = "99999";
    const { load } = require("../src/config");
    assert.throws(() => load(), /Invalid port/);
  });

  it("rejects default API key when auth is enabled", () => {
    process.env.GATEWAY_CONFIG = "/nonexistent/config.json";
    process.env.SERVICES_CONFIG = "/nonexistent/services.json";
    delete process.env.ULUOS_API_KEY;
    const { load } = require("../src/config");

    const path = require("path");
    const fs = require("fs");
    const tmpConfig = path.join(__dirname, "_tmp_config.json");
    fs.writeFileSync(tmpConfig, JSON.stringify({ auth: { mode: "api-key" } }));
    process.env.GATEWAY_CONFIG = tmpConfig;

    try {
      assert.throws(() => load(), /default API key/);
    } finally {
      fs.unlinkSync(tmpConfig);
    }
  });
});
