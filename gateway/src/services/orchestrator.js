const envelope = require("../utils/envelope");
const logger = require("../utils/logger");

function extractArray(data, ...keys) {
  if (!data) return null;
  for (const key of keys) {
    if (Array.isArray(data[key]) && data[key].length > 0) return data[key];
  }
  return Array.isArray(data) && data.length > 0 ? data : null;
}

async function dorkfiAction(registry, action, body, requestId) {
  const { chain, symbol, amount, sender, signerId, ...extra } = body;

  const dorkfiClient = registry.getClient("dorkfi");
  const walletClient = registry.getClient("wallet");
  const broadcastClient = registry.getClient("broadcast");

  if (!dorkfiClient || !walletClient || !broadcastClient) {
    return envelope.error("gateway", action, "SERVICE_UNAVAILABLE",
      "Required services (dorkfi, wallet, broadcast) not all running");
  }

  const toolName = `${action}_txn`;
  const buildBody = { chain, symbol, amount, sender, ...extra };

  // Step 1: build unsigned transactions
  logger.info({ requestId, step: "build", service: "dorkfi", tool: toolName });
  let buildResult;
  try {
    buildResult = await dorkfiClient.callTool(toolName, buildBody);
  } catch (err) {
    return envelope.error("dorkfi", action, "BUILD_FAILED", err.message, { step: "build" });
  }

  const buildData = buildResult.data;
  const unsignedTxns = extractArray(buildData, "txns", "transactions");
  if (!unsignedTxns || unsignedTxns.length === 0) {
    return envelope.error("dorkfi", action, "BUILD_FAILED",
      "No transactions returned from build step", { step: "build" });
  }

  // Step 2: sign transactions
  logger.info({ requestId, step: "sign", service: "wallet", txnCount: unsignedTxns.length });
  let signResult;
  try {
    signResult = await walletClient.callTool("wallet_sign_transactions", {
      signerId: signerId || "default",
      transactions: unsignedTxns,
    });
  } catch (err) {
    return envelope.error("wallet", action, "SIGN_FAILED", err.message, { step: "sign" });
  }

  const signData = signResult.data;
  const signedTxns = extractArray(signData, "signedTransactions", "txns", "transactions");
  if (!signedTxns || signedTxns.length === 0) {
    return envelope.error("wallet", action, "SIGN_FAILED",
      "No signed transactions returned", { step: "sign" });
  }

  // Step 3: broadcast
  const network = chain.includes("-") ? chain : `${chain}-mainnet`;
  logger.info({ requestId, step: "broadcast", service: "broadcast", network });
  let broadcastResult;
  try {
    broadcastResult = await broadcastClient.callTool("broadcast_transactions", {
      network,
      txns: signedTxns,
    });
  } catch (err) {
    return envelope.error("broadcast", action, "BROADCAST_FAILED", err.message, { step: "broadcast" });
  }

  const txids = broadcastResult.data?.txids || broadcastResult.data?.txIds || [];
  const firstTxid = Array.isArray(txids) && txids.length > 0 ? txids[0] : null;

  // Step 4: wait for confirmation
  let confirmed = false;
  let confirmedRound = null;
  if (firstTxid) {
    logger.info({ requestId, step: "confirm", service: "broadcast", txid: firstTxid });
    try {
      const confirmResult = await broadcastClient.callTool("wait_for_confirmation", {
        network,
        txid: firstTxid,
        rounds: 5,
      });
      if (confirmResult.status === 200) {
        confirmed = true;
        confirmedRound = confirmResult.data?.confirmedRound || confirmResult.data?.["confirmed-round"];
      }
    } catch (err) {
      logger.warn({ requestId, step: "confirm", msg: "confirmation wait failed", err: err.message });
      return envelope.error("broadcast", action, "CONFIRM_FAILED", err.message, {
        step: "confirm", txids,
      });
    }
  }

  return envelope.success("dorkfi", action, { txids, confirmed, confirmedRound });
}

async function humbleSwapAction(registry, action, body, requestId) {
  const { sender, signerId, ...params } = body;

  const humbleClient = registry.getClient("humble-swap");
  const walletClient = registry.getClient("wallet");
  const broadcastClient = registry.getClient("broadcast");

  if (!humbleClient || !walletClient || !broadcastClient) {
    return envelope.error("gateway", action, "SERVICE_UNAVAILABLE",
      "Required services (humble-swap, wallet, broadcast) not all running");
  }

  const toolName = `${action}_txn`;
  const buildBody = { ...params, sender };

  logger.info({ requestId, step: "build", service: "humble-swap", tool: toolName });
  let buildResult;
  try {
    buildResult = await humbleClient.callTool(toolName, buildBody);
  } catch (err) {
    return envelope.error("humble-swap", action, "BUILD_FAILED", err.message, { step: "build" });
  }

  const buildData = buildResult.data;
  const unsignedTxns = extractArray(buildData, "txns", "transactions");
  if (!unsignedTxns || unsignedTxns.length === 0) {
    return envelope.error("humble-swap", action, "BUILD_FAILED",
      "No transactions returned from build step", { step: "build" });
  }

  logger.info({ requestId, step: "sign", service: "wallet", txnCount: unsignedTxns.length });
  let signResult;
  try {
    signResult = await walletClient.callTool("wallet_sign_transactions", {
      signerId: signerId || "default",
      transactions: unsignedTxns,
    });
  } catch (err) {
    return envelope.error("wallet", action, "SIGN_FAILED", err.message, { step: "sign" });
  }

  const signData = signResult.data;
  const signedTxns = extractArray(signData, "signedTransactions", "txns", "transactions");
  if (!signedTxns || signedTxns.length === 0) {
    return envelope.error("wallet", action, "SIGN_FAILED",
      "No signed transactions returned", { step: "sign" });
  }

  const network = "voi-mainnet";
  logger.info({ requestId, step: "broadcast", service: "broadcast", network });
  let broadcastResult;
  try {
    broadcastResult = await broadcastClient.callTool("broadcast_transactions", {
      network,
      txns: signedTxns,
    });
  } catch (err) {
    return envelope.error("broadcast", action, "BROADCAST_FAILED", err.message, { step: "broadcast" });
  }

  const txids = broadcastResult.data?.txids || broadcastResult.data?.txIds || [];
  const firstTxid = Array.isArray(txids) && txids.length > 0 ? txids[0] : null;

  let confirmed = false;
  let confirmedRound = null;
  if (firstTxid) {
    logger.info({ requestId, step: "confirm", service: "broadcast", txid: firstTxid });
    try {
      const confirmResult = await broadcastClient.callTool("wait_for_confirmation", {
        network,
        txid: firstTxid,
        rounds: 5,
      });
      if (confirmResult.status === 200) {
        confirmed = true;
        confirmedRound = confirmResult.data?.confirmedRound || confirmResult.data?.["confirmed-round"];
      }
    } catch (err) {
      logger.warn({ requestId, step: "confirm", msg: "confirmation wait failed", err: err.message });
      return envelope.error("broadcast", action, "CONFIRM_FAILED", err.message, {
        step: "confirm", txids,
      });
    }
  }

  return envelope.success("humble-swap", action, { txids, confirmed, confirmedRound });
}

module.exports = { dorkfiAction, humbleSwapAction };
