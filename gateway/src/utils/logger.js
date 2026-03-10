const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

let currentLevel = LEVELS.info;

function setLevel(name) {
  if (!(name in LEVELS)) {
    emit("warn", { msg: `Unknown log level '${name}', keeping current level` });
    return;
  }
  currentLevel = LEVELS[name];
}

function emit(level, fields) {
  if (LEVELS[level] > currentLevel) return;
  const entry = { ts: new Date().toISOString(), level, ...fields };
  try {
    process.stdout.write(JSON.stringify(entry) + "\n");
  } catch {
    process.stdout.write(`{"ts":"${entry.ts}","level":"${level}","msg":"log serialization failed"}\n`);
  }
}

function child(defaults) {
  return {
    error: (fields) => emit("error", { ...defaults, ...fields }),
    warn: (fields) => emit("warn", { ...defaults, ...fields }),
    info: (fields) => emit("info", { ...defaults, ...fields }),
    debug: (fields) => emit("debug", { ...defaults, ...fields }),
    child: (extra) => child({ ...defaults, ...extra }),
  };
}

module.exports = {
  setLevel,
  child,
  error: (fields) => emit("error", fields),
  warn: (fields) => emit("warn", fields),
  info: (fields) => emit("info", fields),
  debug: (fields) => emit("debug", fields),
};
