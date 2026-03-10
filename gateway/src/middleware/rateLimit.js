const envelope = require("../utils/envelope");

function rateLimit(config) {
  if (!config.rateLimit.enabled) {
    return (_req, _res, next) => next();
  }

  const { windowMs, maxRequests } = config.rateLimit;
  const hits = new Map();

  setInterval(() => hits.clear(), windowMs);

  return (req, res, next) => {
    const authHeader = (config.auth.headerName || "X-API-Key").toLowerCase();
    const key =
      req.headers[authHeader] || req.ip || "anonymous";
    const count = (hits.get(key) || 0) + 1;
    hits.set(key, count);

    if (count > maxRequests) {
      return res.status(429).json(
        envelope.error("gateway", "rateLimit", "RATE_LIMITED",
          `Rate limit exceeded (${maxRequests} per ${windowMs / 1000}s)`),
      );
    }

    next();
  };
}

module.exports = rateLimit;
