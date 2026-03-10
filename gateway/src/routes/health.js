const { Router } = require("express");

function healthRoutes(registry) {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "gateway", timestamp: new Date().toISOString() });
  });

  router.get("/health/ready", (_req, res) => {
    if (!registry) {
      return res.json({ status: "ok", service: "gateway", services: {} });
    }

    const services = {};
    for (const svc of registry.all()) {
      const client = registry.getClient(svc.name);
      services[svc.name] = {
        connected: !!client,
        stubbed: registry.stubbedServices().includes(svc.name),
      };
    }

    const allConnected = Object.values(services).every((s) => s.connected);
    const status = allConnected ? "ready" : "degraded";
    const code = allConnected ? 200 : 503;

    res.status(code).json({ status, service: "gateway", services });
  });

  return router;
}

module.exports = healthRoutes;
