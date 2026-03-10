const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const envelope = require("../src/utils/envelope");

describe("envelope", () => {
  it("builds a success envelope", () => {
    const result = envelope.success("dorkfi", "get_markets", { markets: [] });
    assert.equal(result.ok, true);
    assert.equal(result.service, "dorkfi");
    assert.equal(result.operation, "get_markets");
    assert.deepEqual(result.data, { markets: [] });
  });

  it("builds an error envelope", () => {
    const result = envelope.error("gateway", "auth", "UNAUTHORIZED", "Bad key");
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "UNAUTHORIZED");
    assert.equal(result.error.message, "Bad key");
  });

  it("merges extra fields into error", () => {
    const result = envelope.error("gateway", "build", "BUILD_FAILED", "nope", { step: "build" });
    assert.equal(result.error.step, "build");
  });
});
