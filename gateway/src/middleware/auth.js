const crypto = require("crypto");
const envelope = require("../utils/envelope");

function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function auth(config) {
  return (req, res, next) => {
    if (config.auth.mode === "none") return next();

    if (req.skipAuth) return next();

    const headerName = config.auth.headerName || "X-API-Key";
    const provided = req.headers[headerName.toLowerCase()];

    if (!provided || !timingSafeEqual(provided, config.apiKey)) {
      return res.status(401).json(
        envelope.error("gateway", "auth", "UNAUTHORIZED", "Invalid or missing API key"),
      );
    }

    next();
  };
}

module.exports = auth;
