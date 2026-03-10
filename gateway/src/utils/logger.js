const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

let currentLevel = LEVELS.info;

function setLevel(name) {
  if (name in LEVELS) currentLevel = LEVELS[name];
}

function emit(level, fields) {
  if (LEVELS[level] > currentLevel) return;
  const entry = { ts: new Date().toISOString(), level, ...fields };
  process.stdout.write(JSON.stringify(entry) + "\n");
}

module.exports = {
  setLevel,
  error: (fields) => emit("error", fields),
  warn: (fields) => emit("warn", fields),
  info: (fields) => emit("info", fields),
  debug: (fields) => emit("debug", fields),
};
