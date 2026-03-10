const { spawn } = require("child_process");
const readline = require("readline");
const logger = require("../utils/logger");

const PROTOCOL_VERSION = "2024-11-05";

class StdioMcpClient {
  constructor(serviceName, command, args = [], opts = {}) {
    this._name = serviceName;
    this._command = command;
    this._args = args;
    this._env = { ...process.env, ...opts.env };
    this._cwd = opts.cwd || undefined;
    this._proc = null;
    this._rl = null;
    this._nextId = 1;
    this._pending = new Map();
    this._ready = false;
  }

  get name() {
    return this._name;
  }

  async start() {
    this._proc = spawn(this._command, this._args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: this._env,
      cwd: this._cwd,
    });

    this._proc.stderr.on("data", (chunk) => {
      logger.debug({ msg: "child stderr", service: this._name, text: chunk.toString().trim() });
    });

    this._proc.on("exit", (code, signal) => {
      logger.warn({ msg: "child exited", service: this._name, code, signal });
      this._rejectAll(new Error(`${this._name} process exited (code=${code}, signal=${signal})`));
      this._ready = false;
    });

    this._proc.on("error", (err) => {
      logger.error({ msg: "child spawn error", service: this._name, err: err.message });
      this._rejectAll(err);
    });

    this._rl = readline.createInterface({ input: this._proc.stdout, terminal: false });
    this._rl.on("line", (line) => this._onLine(line));

    await this._initialize();
    this._ready = true;
    logger.info({ msg: "stdio client ready", service: this._name });
  }

  async callTool(toolName, args) {
    if (!this._ready) {
      throw new Error(`${this._name} client not ready`);
    }

    const result = await this._request("tools/call", {
      name: toolName,
      arguments: args,
    });

    if (result.isError) {
      const text = result.content?.[0]?.text || "Tool call failed";
      const err = new Error(text);
      err.isToolError = true;
      throw err;
    }

    const text = result.content?.[0]?.text;
    if (text) {
      try {
        return { status: 200, data: JSON.parse(text) };
      } catch {
        return { status: 200, data: text };
      }
    }

    return { status: 200, data: result };
  }

  async stop() {
    this._ready = false;
    this._rejectAll(new Error("Client stopped"));

    if (this._rl) {
      this._rl.close();
      this._rl = null;
    }

    if (this._proc && !this._proc.killed) {
      this._proc.stdin.end();
      await new Promise((resolve) => {
        const timer = setTimeout(() => {
          this._proc.kill("SIGKILL");
          resolve();
        }, 3000);
        this._proc.on("exit", () => {
          clearTimeout(timer);
          resolve();
        });
      });
    }
  }

  async _initialize() {
    const result = await this._request("initialize", {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: "ulu-gateway", version: "0.1.0" },
    });

    this._send({
      jsonrpc: "2.0",
      method: "notifications/initialized",
    });

    return result;
  }

  _request(method, params) {
    return new Promise((resolve, reject) => {
      const id = this._nextId++;
      const timeout = setTimeout(() => {
        this._pending.delete(id);
        reject(new Error(`${this._name}: timeout on ${method} (id=${id})`));
      }, 30000);

      this._pending.set(id, { resolve, reject, timeout });
      this._send({ jsonrpc: "2.0", id, method, params });
    });
  }

  _send(obj) {
    if (!this._proc || this._proc.killed) {
      throw new Error(`${this._name}: process not running`);
    }
    this._proc.stdin.write(JSON.stringify(obj) + "\n");
  }

  _onLine(line) {
    if (!line.trim()) return;

    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      logger.debug({ msg: "non-json from child", service: this._name, line });
      return;
    }

    if (msg.id != null && this._pending.has(msg.id)) {
      const { resolve, reject, timeout } = this._pending.get(msg.id);
      this._pending.delete(msg.id);
      clearTimeout(timeout);

      if (msg.error) {
        reject(new Error(msg.error.message || JSON.stringify(msg.error)));
      } else {
        resolve(msg.result);
      }
    }
  }

  _rejectAll(err) {
    for (const [id, { reject, timeout }] of this._pending) {
      clearTimeout(timeout);
      reject(err);
    }
    this._pending.clear();
  }
}

module.exports = { StdioMcpClient };
