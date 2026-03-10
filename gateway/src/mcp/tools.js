const { dorkfiAction } = require("../services/orchestrator");
const logger = require("../utils/logger");

const ORCHESTRATED_ACTIONS = [
  {
    name: "actions.dorkfi.deposit",
    description: "Orchestrated DorkFi deposit: builds unsigned transactions, signs via WalletMCP, broadcasts via BroadcastMCP, and waits for confirmation. Returns confirmed transaction IDs.",
    inputSchema: {
      type: "object",
      properties: {
        chain: { type: "string", enum: ["voi", "algorand"], description: "Blockchain network" },
        symbol: { type: "string", description: "Token symbol (e.g. VOI, USDC)" },
        amount: { type: "string", description: "Amount in human-readable units" },
        sender: { type: "string", description: "Sender wallet address" },
        signerId: { type: "string", description: "Wallet signer ID to use for signing" },
      },
      required: ["chain", "symbol", "amount", "sender", "signerId"],
    },
    _action: "deposit",
  },
  {
    name: "actions.dorkfi.borrow",
    description: "Orchestrated DorkFi borrow: builds, signs, broadcasts, and confirms. Requires sufficient collateral.",
    inputSchema: {
      type: "object",
      properties: {
        chain: { type: "string", enum: ["voi", "algorand"] },
        symbol: { type: "string", description: "Token symbol to borrow" },
        amount: { type: "string", description: "Amount in human-readable units" },
        sender: { type: "string", description: "Borrower wallet address" },
        signerId: { type: "string", description: "Wallet signer ID" },
      },
      required: ["chain", "symbol", "amount", "sender", "signerId"],
    },
    _action: "borrow",
  },
  {
    name: "actions.dorkfi.repay",
    description: "Orchestrated DorkFi repay: builds, signs, broadcasts, and confirms.",
    inputSchema: {
      type: "object",
      properties: {
        chain: { type: "string", enum: ["voi", "algorand"] },
        symbol: { type: "string", description: "Token symbol to repay" },
        amount: { type: "string", description: "Amount in human-readable units" },
        sender: { type: "string", description: "Repayer wallet address" },
        signerId: { type: "string", description: "Wallet signer ID" },
      },
      required: ["chain", "symbol", "amount", "sender", "signerId"],
    },
    _action: "repay",
  },
  {
    name: "actions.dorkfi.withdraw",
    description: "Orchestrated DorkFi withdraw: builds, signs, broadcasts, and confirms.",
    inputSchema: {
      type: "object",
      properties: {
        chain: { type: "string", enum: ["voi", "algorand"] },
        symbol: { type: "string", description: "Token symbol to withdraw" },
        amount: { type: "string", description: "Amount in human-readable units" },
        sender: { type: "string", description: "Withdrawer wallet address" },
        signerId: { type: "string", description: "Wallet signer ID" },
      },
      required: ["chain", "symbol", "amount", "sender", "signerId"],
    },
    _action: "withdraw",
  },
];

class ToolRegistry {
  constructor(capabilities, serviceRegistry) {
    this._serviceRegistry = serviceRegistry;
    this._directTools = new Map();
    this._actionTools = new Map();

    const publicCaps = capabilities.filter((c) => c.service !== "wallet");
    for (const cap of publicCaps) {
      this._directTools.set(cap.name, cap);
    }

    for (const action of ORCHESTRATED_ACTIONS) {
      this._actionTools.set(action.name, action);
    }
  }

  list() {
    const tools = [];

    for (const cap of this._directTools.values()) {
      tools.push({
        name: cap.name,
        description: cap.description || `${cap.service}.${cap.tool}`,
        inputSchema: cap.parameters || { type: "object", properties: {} },
      });
    }

    for (const action of this._actionTools.values()) {
      tools.push({
        name: action.name,
        description: action.description,
        inputSchema: action.inputSchema,
      });
    }

    return tools;
  }

  async call(name, args) {
    if (this._actionTools.has(name)) {
      return this._callAction(name, args);
    }

    if (this._directTools.has(name)) {
      return this._callDirect(name, args);
    }

    throw new Error(`Unknown tool: ${name}`);
  }

  async _callDirect(name, args) {
    const cap = this._directTools.get(name);
    const svc = this._serviceRegistry.get(cap.service);

    if (!svc) {
      throw new Error(`Service '${cap.service}' not registered`);
    }

    if (svc.visibility === "internal") {
      throw new Error(`Service '${cap.service}' is not directly callable`);
    }

    const client = this._serviceRegistry.getClient(cap.service);
    if (!client) {
      throw new Error(`No active client for service '${cap.service}'`);
    }

    logger.info({ msg: "mcp tool call", tool: name, service: cap.service });
    const result = await client.callTool(cap.tool, args);

    if (result.status >= 400) {
      const errMsg = result.data?.message || result.data?.error?.message || `Upstream returned ${result.status}`;
      return {
        content: [{ type: "text", text: JSON.stringify({ ok: false, error: errMsg }) }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }],
    };
  }

  async _callAction(name, args) {
    const action = this._actionTools.get(name);
    logger.info({ msg: "mcp orchestrated action", action: name });

    const result = await dorkfiAction(
      this._serviceRegistry,
      action._action,
      args,
      `mcp_${Date.now()}`,
    );

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      isError: !result.ok,
    };
  }
}

module.exports = { ToolRegistry };
