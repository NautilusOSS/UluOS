const logger = require("../utils/logger");

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_INFO = { name: "ulu-gateway", version: "0.1.0" };

class McpProtocol {
  constructor(toolRegistry) {
    this._tools = toolRegistry;
  }

  async handle(message) {
    if (!message || !message.method) {
      if (message?.id) {
        return jsonRpcError(message.id, -32600, "Invalid request");
      }
      return null;
    }

    if (!message.id) {
      return this._handleNotification(message);
    }

    switch (message.method) {
      case "initialize":
        return this._initialize(message);
      case "ping":
        return jsonRpcResult(message.id, {});
      case "tools/list":
        return this._listTools(message);
      case "tools/call":
        return this._callTool(message);
      default:
        return jsonRpcError(message.id, -32601, `Unknown method: ${message.method}`);
    }
  }

  _handleNotification(message) {
    if (message.method === "notifications/initialized") {
      logger.debug({ msg: "mcp client initialized" });
    }
    return null;
  }

  _initialize(message) {
    return jsonRpcResult(message.id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: SERVER_INFO,
    });
  }

  _listTools(message) {
    const cursor = message.params?.cursor;
    const tools = this._tools.list();
    return jsonRpcResult(message.id, { tools });
  }

  async _callTool(message) {
    const { name, arguments: args } = message.params || {};

    if (!name) {
      return jsonRpcError(message.id, -32602, "Missing tool name");
    }

    try {
      const result = await this._tools.call(name, args || {});
      return jsonRpcResult(message.id, result);
    } catch (err) {
      logger.error({ msg: "tool call failed", tool: name, err: err.message });
      return jsonRpcResult(message.id, {
        content: [{ type: "text", text: JSON.stringify({ error: err.message }) }],
        isError: true,
      });
    }
  }
}

function jsonRpcResult(id, result) {
  return { jsonrpc: "2.0", id, result };
}

function jsonRpcError(id, code, message) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

module.exports = { McpProtocol };
