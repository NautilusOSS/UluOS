const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { McpProtocol } = require("../src/mcp/protocol");

function makeFakeToolRegistry(tools = [], callResult = null) {
  return {
    list: () => tools,
    call: async (name, args) => {
      if (callResult instanceof Error) throw callResult;
      return callResult || { content: [{ type: "text", text: "{}" }] };
    },
  };
}

describe("McpProtocol", () => {
  it("responds to initialize", async () => {
    const protocol = new McpProtocol(makeFakeToolRegistry());
    const res = await protocol.handle({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test" } },
    });
    assert.equal(res.id, 1);
    assert.equal(res.result.protocolVersion, "2024-11-05");
    assert.ok(res.result.serverInfo);
  });

  it("responds to ping", async () => {
    const protocol = new McpProtocol(makeFakeToolRegistry());
    const res = await protocol.handle({ jsonrpc: "2.0", id: 2, method: "ping" });
    assert.equal(res.id, 2);
    assert.deepEqual(res.result, {});
  });

  it("lists tools", async () => {
    const tools = [{ name: "test.tool", description: "A test", inputSchema: {} }];
    const protocol = new McpProtocol(makeFakeToolRegistry(tools));
    const res = await protocol.handle({ jsonrpc: "2.0", id: 3, method: "tools/list" });
    assert.equal(res.result.tools.length, 1);
    assert.equal(res.result.tools[0].name, "test.tool");
  });

  it("calls a tool successfully", async () => {
    const result = { content: [{ type: "text", text: '{"ok":true}' }] };
    const protocol = new McpProtocol(makeFakeToolRegistry([], result));
    const res = await protocol.handle({
      jsonrpc: "2.0", id: 4, method: "tools/call",
      params: { name: "test.tool", arguments: {} },
    });
    assert.equal(res.id, 4);
    assert.ok(res.result);
    assert.ok(!res.error);
  });

  it("returns isError when tool call throws", async () => {
    const protocol = new McpProtocol(makeFakeToolRegistry([], new Error("boom")));
    const res = await protocol.handle({
      jsonrpc: "2.0", id: 5, method: "tools/call",
      params: { name: "test.tool", arguments: {} },
    });
    assert.equal(res.id, 5);
    assert.equal(res.result.isError, true);
    assert.ok(res.result.content[0].text.includes("boom"));
  });

  it("returns error for missing tool name", async () => {
    const protocol = new McpProtocol(makeFakeToolRegistry());
    const res = await protocol.handle({
      jsonrpc: "2.0", id: 6, method: "tools/call",
      params: {},
    });
    assert.ok(res.error);
    assert.equal(res.error.code, -32602);
  });

  it("returns error for unknown method", async () => {
    const protocol = new McpProtocol(makeFakeToolRegistry());
    const res = await protocol.handle({ jsonrpc: "2.0", id: 7, method: "bogus/method" });
    assert.ok(res.error);
    assert.equal(res.error.code, -32601);
  });

  it("returns null for notifications", async () => {
    const protocol = new McpProtocol(makeFakeToolRegistry());
    const res = await protocol.handle({ jsonrpc: "2.0", method: "notifications/initialized" });
    assert.equal(res, null);
  });

  it("returns error for invalid request without method", async () => {
    const protocol = new McpProtocol(makeFakeToolRegistry());
    const res = await protocol.handle({ jsonrpc: "2.0", id: 8 });
    assert.ok(res.error);
    assert.equal(res.error.code, -32600);
  });
});
