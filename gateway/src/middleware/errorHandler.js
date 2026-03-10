const envelope = require("../utils/envelope");
const logger = require("../utils/logger");

function errorHandler() {
  return (err, req, res, _next) => {
    logger.error({
      requestId: req.requestId,
      msg: "unhandled error",
      err: err.message,
      stack: err.stack,
    });

    const status = err.statusCode || 500;
    res.status(status).json(
      envelope.error("gateway", "internal", "INTERNAL_ERROR", err.message),
    );
  };
}

module.exports = errorHandler;
