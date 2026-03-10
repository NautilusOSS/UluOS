const { Router } = require("express");

function servicesRoutes(registry) {
  const router = Router();

  router.get("/services", (_req, res) => {
    const services = registry.publicList().map((svc) => ({
      name: svc.name,
      version: svc.version,
      layer: svc.layer,
      chains: svc.chains,
      tags: svc.tags,
      description: svc.description,
      healthPath: svc.healthPath,
    }));
    res.json(services);
  });

  return router;
}

module.exports = servicesRoutes;
