const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const auth = require("../src/middleware/auth");

function makeReqRes(headers = {}) {
  const req = { headers, skipAuth: false };
  let statusCode;
  let body;
  const res = {
    status(code) { statusCode = code; return this; },
    json(data) { body = data; },
  };
  return { req, res, getStatus: () => statusCode, getBody: () => body };
}

describe("auth middleware", () => {
  it("skips auth when mode is none", (_, done) => {
    const middleware = auth({ auth: { mode: "none" }, apiKey: "secret" });
    const { req, res } = makeReqRes();
    middleware(req, res, () => done());
  });

  it("skips auth when req.skipAuth is true", (_, done) => {
    const middleware = auth({ auth: { mode: "api-key", headerName: "X-API-Key" }, apiKey: "secret" });
    const { req, res } = makeReqRes();
    req.skipAuth = true;
    middleware(req, res, () => done());
  });

  it("rejects missing API key", () => {
    const middleware = auth({ auth: { mode: "api-key", headerName: "X-API-Key" }, apiKey: "secret" });
    const { req, res, getStatus } = makeReqRes({});
    middleware(req, res, () => assert.fail("should not call next"));
    assert.equal(getStatus(), 401);
  });

  it("rejects wrong API key", () => {
    const middleware = auth({ auth: { mode: "api-key", headerName: "X-API-Key" }, apiKey: "secret" });
    const { req, res, getStatus } = makeReqRes({ "x-api-key": "wrong" });
    middleware(req, res, () => assert.fail("should not call next"));
    assert.equal(getStatus(), 401);
  });

  it("accepts correct API key", (_, done) => {
    const middleware = auth({ auth: { mode: "api-key", headerName: "X-API-Key" }, apiKey: "secret" });
    const { req, res } = makeReqRes({ "x-api-key": "secret" });
    middleware(req, res, () => done());
  });
});
