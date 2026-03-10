const { v4: uuidv4 } = require("uuid");

function requestId() {
  return (req, _res, next) => {
    req.requestId = req.headers["x-request-id"] || `req_${uuidv4().replace(/-/g, "").slice(0, 16)}`;
    next();
  };
}

module.exports = requestId;
