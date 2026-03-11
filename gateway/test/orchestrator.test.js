const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { dorkfiAction, humbleSwapAction } = require("../src/services/orchestrator");

function fakeClient(toolResults = {}) {
  return {
    callTool: async (tool, args) => {
      if (toolResults[tool] instanceof Error) throw toolResults[tool];
      return toolResults[tool] || { status: 200, data: {} };
    },
  };
}

function fakeRegistry(clients = {}) {
  return {
    getClient: (name) => clients[name] || null,
  };
}

describe("dorkfiAction", () => {
  it("returns SERVICE_UNAVAILABLE when clients missing", async () => {
    const result = await dorkfiAction(fakeRegistry(), "deposit", {
      chain: "voi", symbol: "VOI", amount: "100", sender: "ADDR",
    }, "req_1");
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "SERVICE_UNAVAILABLE");
  });

  it("returns BUILD_FAILED when no txns returned", async () => {
    const registry = fakeRegistry({
      dorkfi: fakeClient({ deposit_txn: { status: 200, data: {} } }),
      wallet: fakeClient(),
      broadcast: fakeClient(),
    });
    const result = await dorkfiAction(registry, "deposit", {
      chain: "voi", symbol: "VOI", amount: "100", sender: "ADDR",
    }, "req_2");
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "BUILD_FAILED");
  });

  it("returns BUILD_FAILED when dorkfi throws", async () => {
    const registry = fakeRegistry({
      dorkfi: fakeClient({ deposit_txn: new Error("contract error") }),
      wallet: fakeClient(),
      broadcast: fakeClient(),
    });
    const result = await dorkfiAction(registry, "deposit", {
      chain: "voi", symbol: "VOI", amount: "100", sender: "ADDR",
    }, "req_3");
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "BUILD_FAILED");
    assert.ok(result.error.message.includes("contract error"));
  });

  it("returns SIGN_FAILED when wallet throws", async () => {
    const registry = fakeRegistry({
      dorkfi: fakeClient({ deposit_txn: { status: 200, data: { txns: ["tx1"] } } }),
      wallet: fakeClient({ wallet_sign_transactions: new Error("bad signer") }),
      broadcast: fakeClient(),
    });
    const result = await dorkfiAction(registry, "deposit", {
      chain: "voi", symbol: "VOI", amount: "100", sender: "ADDR",
    }, "req_4");
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "SIGN_FAILED");
  });

  it("completes full pipeline successfully", async () => {
    const registry = fakeRegistry({
      dorkfi: fakeClient({ deposit_txn: { status: 200, data: { txns: ["unsigned1"] } } }),
      wallet: fakeClient({ wallet_sign_transactions: { status: 200, data: { signedTransactions: ["signed1"] } } }),
      broadcast: fakeClient({
        broadcast_transactions: { status: 200, data: { txids: ["TXID1"] } },
        wait_for_confirmation: { status: 200, data: { confirmedRound: 12345 } },
      }),
    });
    const result = await dorkfiAction(registry, "deposit", {
      chain: "voi", symbol: "VOI", amount: "100", sender: "ADDR", signerId: "hot",
    }, "req_5");
    assert.equal(result.ok, true);
    assert.deepEqual(result.data.txids, ["TXID1"]);
    assert.equal(result.data.confirmed, true);
    assert.equal(result.data.confirmedRound, 12345);
  });

  it("maps chain without hyphen to mainnet", async () => {
    let broadcastNetwork;
    const broadcastClient = {
      callTool: async (tool, args) => {
        if (tool === "broadcast_transactions") {
          broadcastNetwork = args.network;
          return { status: 200, data: { txids: ["TXID1"] } };
        }
        return { status: 200, data: { confirmedRound: 1 } };
      },
    };
    const registry = fakeRegistry({
      dorkfi: fakeClient({ deposit_txn: { status: 200, data: { txns: ["u1"] } } }),
      wallet: fakeClient({ wallet_sign_transactions: { status: 200, data: { signedTransactions: ["s1"] } } }),
      broadcast: broadcastClient,
    });
    await dorkfiAction(registry, "deposit", {
      chain: "voi", symbol: "VOI", amount: "1", sender: "A", signerId: "s",
    }, "req_6");
    assert.equal(broadcastNetwork, "voi-mainnet");
  });
});

describe("humbleSwapAction", () => {
  it("returns SERVICE_UNAVAILABLE when clients missing", async () => {
    const result = await humbleSwapAction(fakeRegistry(), "swap", {
      fromToken: "VOI", toToken: "aUSDC", amount: "100", sender: "ADDR",
    }, "req_h1");
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "SERVICE_UNAVAILABLE");
  });

  it("returns BUILD_FAILED when no txns returned", async () => {
    const registry = fakeRegistry({
      "humble-swap": fakeClient({ swap_txn: { status: 200, data: {} } }),
      wallet: fakeClient(),
      broadcast: fakeClient(),
    });
    const result = await humbleSwapAction(registry, "swap", {
      fromToken: "VOI", toToken: "aUSDC", amount: "100", sender: "ADDR",
    }, "req_h2");
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "BUILD_FAILED");
  });

  it("returns BUILD_FAILED when humble-swap throws", async () => {
    const registry = fakeRegistry({
      "humble-swap": fakeClient({ swap_txn: new Error("pool not found") }),
      wallet: fakeClient(),
      broadcast: fakeClient(),
    });
    const result = await humbleSwapAction(registry, "swap", {
      fromToken: "VOI", toToken: "aUSDC", amount: "100", sender: "ADDR",
    }, "req_h3");
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "BUILD_FAILED");
    assert.ok(result.error.message.includes("pool not found"));
  });

  it("returns SIGN_FAILED when wallet throws", async () => {
    const registry = fakeRegistry({
      "humble-swap": fakeClient({ swap_txn: { status: 200, data: { txns: ["tx1"] } } }),
      wallet: fakeClient({ wallet_sign_transactions: new Error("bad signer") }),
      broadcast: fakeClient(),
    });
    const result = await humbleSwapAction(registry, "swap", {
      fromToken: "VOI", toToken: "aUSDC", amount: "100", sender: "ADDR",
    }, "req_h4");
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "SIGN_FAILED");
  });

  it("completes full swap pipeline successfully", async () => {
    const registry = fakeRegistry({
      "humble-swap": fakeClient({ swap_txn: { status: 200, data: { txns: ["unsigned1"] } } }),
      wallet: fakeClient({ wallet_sign_transactions: { status: 200, data: { signedTransactions: ["signed1"] } } }),
      broadcast: fakeClient({
        broadcast_transactions: { status: 200, data: { txids: ["TXID1"] } },
        wait_for_confirmation: { status: 200, data: { confirmedRound: 99999 } },
      }),
    });
    const result = await humbleSwapAction(registry, "swap", {
      fromToken: "VOI", toToken: "aUSDC", amount: "100", sender: "ADDR", signerId: "hot",
    }, "req_h5");
    assert.equal(result.ok, true);
    assert.deepEqual(result.data.txids, ["TXID1"]);
    assert.equal(result.data.confirmed, true);
    assert.equal(result.data.confirmedRound, 99999);
  });

  it("completes add_liquidity pipeline", async () => {
    const registry = fakeRegistry({
      "humble-swap": fakeClient({ add_liquidity_txn: { status: 200, data: { txns: ["u1", "u2"] } } }),
      wallet: fakeClient({ wallet_sign_transactions: { status: 200, data: { signedTransactions: ["s1", "s2"] } } }),
      broadcast: fakeClient({
        broadcast_transactions: { status: 200, data: { txids: ["TXLP1"] } },
        wait_for_confirmation: { status: 200, data: { confirmedRound: 55555 } },
      }),
    });
    const result = await humbleSwapAction(registry, "add_liquidity", {
      poolId: 12345, amountA: "50", amountB: "100", sender: "ADDR", signerId: "hot",
    }, "req_h6");
    assert.equal(result.ok, true);
    assert.deepEqual(result.data.txids, ["TXLP1"]);
    assert.equal(result.data.confirmed, true);
  });

  it("completes remove_liquidity pipeline", async () => {
    const registry = fakeRegistry({
      "humble-swap": fakeClient({ remove_liquidity_txn: { status: 200, data: { txns: ["u1"] } } }),
      wallet: fakeClient({ wallet_sign_transactions: { status: 200, data: { signedTransactions: ["s1"] } } }),
      broadcast: fakeClient({
        broadcast_transactions: { status: 200, data: { txids: ["TXRM1"] } },
        wait_for_confirmation: { status: 200, data: { confirmedRound: 77777 } },
      }),
    });
    const result = await humbleSwapAction(registry, "remove_liquidity", {
      poolId: 12345, lpAmount: "25", sender: "ADDR", signerId: "hot",
    }, "req_h7");
    assert.equal(result.ok, true);
    assert.deepEqual(result.data.txids, ["TXRM1"]);
    assert.equal(result.data.confirmed, true);
  });

  it("always broadcasts on voi-mainnet", async () => {
    let broadcastNetwork;
    const broadcastClient = {
      callTool: async (tool, args) => {
        if (tool === "broadcast_transactions") {
          broadcastNetwork = args.network;
          return { status: 200, data: { txids: ["TXID1"] } };
        }
        return { status: 200, data: { confirmedRound: 1 } };
      },
    };
    const registry = fakeRegistry({
      "humble-swap": fakeClient({ swap_txn: { status: 200, data: { txns: ["u1"] } } }),
      wallet: fakeClient({ wallet_sign_transactions: { status: 200, data: { signedTransactions: ["s1"] } } }),
      broadcast: broadcastClient,
    });
    await humbleSwapAction(registry, "swap", {
      fromToken: "VOI", toToken: "aUSDC", amount: "1", sender: "A", signerId: "s",
    }, "req_h8");
    assert.equal(broadcastNetwork, "voi-mainnet");
  });
});
