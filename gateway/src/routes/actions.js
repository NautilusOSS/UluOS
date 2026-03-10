const { Router } = require("express");
const { dorkfiAction } = require("../services/orchestrator");
const envelope = require("../utils/envelope");
const logger = require("../utils/logger");

function actionsRoutes(registry, config) {
  const router = Router();

  const DORKFI_ACTIONS = ["deposit", "borrow", "repay", "withdraw"];

  for (const action of DORKFI_ACTIONS) {
    router.post(`/actions/dorkfi/${action}`, async (req, res) => {
      const start = Date.now();
      logger.info({ requestId: req.requestId, action: `dorkfi.${action}`, type: "orchestrated" });

      const { chain, symbol, amount, sender, signerId } = req.body || {};
      if (!chain || !symbol || !amount || !sender) {
        return res.status(400).json(
          envelope.error("gateway", action, "VALIDATION_ERROR",
            "Missing required fields: chain, symbol, amount, sender"),
        );
      }

      try {
        const result = await dorkfiAction(registry, action, req.body, req.requestId);
        const durationMs = Date.now() - start;

        if (result.meta) result.meta.requestId = req.requestId;
        if (result.meta) result.meta.durationMs = durationMs;
        if (!result.meta && result.ok) {
          result.meta = { requestId: req.requestId, durationMs };
        }

        logger.info({ requestId: req.requestId, action: `dorkfi.${action}`, ok: result.ok, durationMs });

        const status = result.ok ? 200 : 502;
        res.status(status).json(result);
      } catch (err) {
        const durationMs = Date.now() - start;
        logger.error({ requestId: req.requestId, action: `dorkfi.${action}`, err: err.message, durationMs });
        res.status(502).json(
          envelope.error("gateway", action, "ORCHESTRATION_ERROR", err.message),
        );
      }
    });
  }

  return router;
}

module.exports = actionsRoutes;
