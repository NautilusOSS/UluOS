const { Router } = require("express");

function pricingRoutes() {
  const router = Router();

  const tiers = {
    free: {
      name: "Free",
      description: "Capability discovery, health checks, basic protocol discovery",
      requiresAuth: false,
      requiresPayment: false,
    },
    standard: {
      name: "Standard",
      description: "Indexed reads, simulations, market data, name resolution",
      requiresAuth: false,
      requiresPayment: false,
    },
    premium: {
      name: "Premium",
      description: "Signing, state-changing actions, transaction building, orchestrated workflows",
      requiresAuth: true,
      requiresPayment: false,
    },
    enterprise: {
      name: "Enterprise",
      description: "Dedicated quotas, private deployments, custom policy controls",
      requiresAuth: true,
      requiresPayment: true,
    },
  };

  router.get("/pricing", (_req, res) => {
    res.json(tiers);
  });

  return router;
}

module.exports = pricingRoutes;
