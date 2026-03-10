function success(service, operation, data, meta = {}) {
  return {
    ok: true,
    service,
    operation,
    data,
    meta,
  };
}

function error(service, operation, code, message, extra = {}) {
  return {
    ok: false,
    service,
    operation,
    error: { code, message, ...extra },
  };
}

module.exports = { success, error };
