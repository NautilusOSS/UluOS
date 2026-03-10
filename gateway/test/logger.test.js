const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

describe("logger", () => {
  let logger;

  beforeEach(() => {
    delete require.cache[require.resolve("../src/utils/logger")];
    logger = require("../src/utils/logger");
  });

  it("ignores unknown log levels without crashing", () => {
    logger.setLevel("info");
    logger.setLevel("nonexistent");
    logger.info({ msg: "still works" });
  });

  it("creates child loggers with default fields", () => {
    const child = logger.child({ requestId: "req_123" });
    assert.equal(typeof child.info, "function");
    assert.equal(typeof child.error, "function");
    assert.equal(typeof child.child, "function");
  });

  it("child loggers nest defaults", () => {
    const child1 = logger.child({ requestId: "req_1" });
    const child2 = child1.child({ step: "build" });
    assert.equal(typeof child2.info, "function");
  });
});
