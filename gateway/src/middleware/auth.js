const envelope = require("../utils/envelope");

function auth(config) {
  return (req, res, next) => {
    if (config.auth.mode === "none") return next();

    if (req.skipAuth) return next();

    const headerName = config.auth.headerName || "X-API-Key";
    const provided = req.headers[headerName.toLowerCase()];

    if (!provided || provided !== config.apiKey) {
      return res.status(401).json(
        envelope.error("gateway", "auth", "UNAUTHORIZED", "Invalid or missing API key"),
      );
    }

    next();
  };
}

module.exports = auth;
