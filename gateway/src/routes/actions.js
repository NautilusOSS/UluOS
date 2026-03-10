const { Router } = require("express");
const { dorkfiAction } = require("../services/orchestrator");
const logger = require("../utils/logger");

function actionsRoutes(registry, config) {
  const router = Router();

  const DORKFI_ACTIONS = ["deposit", "borrow", "repay", "withdraw"];

  for (const action of DORKFI_ACTIONS) {
    router.post(`/actions/dorkfi/${action}`, async (req, res) => {
      const start = Date.now();
      logger.info({ requestId: req.requestId, action: `dorkfi.${action}`, type: "orchestrated" });

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
    });
  }

  return router;
}

module.exports = actionsRoutes;
