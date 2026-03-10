const { Router } = require("express");
const { forward } = require("../services/proxy");
const envelope = require("../utils/envelope");
const logger = require("../utils/logger");

function executeRoutes(registry, config) {
  const router = Router();

  router.post("/execute/:service/:tool", async (req, res) => {
    const { service: serviceName, tool } = req.params;
    const start = Date.now();

    const svc = registry.get(serviceName);
    if (!svc) {
      return res.status(404).json(
        envelope.error("gateway", "execute", "SERVICE_NOT_FOUND",
          `No service registered with name '${serviceName}'`),
      );
    }

    if (svc.visibility === "internal") {
      return res.status(403).json(
        envelope.error("gateway", "execute", "SERVICE_FORBIDDEN",
          `Service '${serviceName}' is not directly routable`),
      );
    }

    logger.info({ requestId: req.requestId, service: serviceName, tool, action: "execute" });

    try {
      const client = registry.getClient(serviceName);
      let result;

      if (client) {
        result = await client.callTool(tool, req.body);
      } else {
        result = await forward(svc.baseUrl, tool, req.body);
      }

      const durationMs = Date.now() - start;

      logger.info({
        requestId: req.requestId, service: serviceName, tool,
        status: result.status, durationMs,
      });

      if (result.status >= 400) {
        const errData = typeof result.data === "object" ? result.data : {};
        return res.status(result.status).json(
          envelope.error(serviceName, tool,
            errData.code || `UPSTREAM_${result.status}`,
            errData.message || "Upstream service returned an error"),
        );
      }

      res.json(envelope.success(serviceName, tool, result.data, {
        requestId: req.requestId,
        durationMs,
      }));
    } catch (err) {
      const durationMs = Date.now() - start;
      logger.error({ requestId: req.requestId, service: serviceName, tool, err: err.message, durationMs });
      res.status(502).json(
        envelope.error(serviceName, tool, "UPSTREAM_ERROR", err.message),
      );
    }
  });

  return router;
}

module.exports = executeRoutes;
