const { Router } = require("express");

function capabilitiesRoutes(capabilities) {
  const router = Router();

  const publicCaps = capabilities.filter((c) => c.service !== "wallet");

  router.get("/capabilities", (req, res) => {
    const { service, chain, readOnly, pricingTier } = req.query;

    let result = publicCaps;

    if (service) {
      result = result.filter((c) => c.service === service);
    }
    if (chain) {
      result = result.filter((c) => c.chains && c.chains.includes(chain));
    }
    if (readOnly !== undefined) {
      const flag = readOnly === "true";
      result = result.filter((c) => c.readOnly === flag);
    }
    if (pricingTier) {
      result = result.filter((c) => c.pricingTier === pricingTier);
    }

    res.json(result);
  });

  return router;
}

module.exports = capabilitiesRoutes;
