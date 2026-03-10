const { Router } = require("express");

function healthRoutes() {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "gateway", timestamp: new Date().toISOString() });
  });

  return router;
}

module.exports = healthRoutes;
