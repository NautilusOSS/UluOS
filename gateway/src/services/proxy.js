const http = require("http");
const https = require("https");
const logger = require("../utils/logger");

function forward(baseUrl, tool, body, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const url = new URL(`/${tool}`, baseUrl);
    const transport = url.protocol === "https:" ? https : http;
    const payload = JSON.stringify(body);

    const req = transport.request(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
        timeout: timeoutMs,
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString();
          try {
            resolve({ status: res.statusCode, data: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode, data: raw });
          }
        });
      },
    );

    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Upstream timeout after ${timeoutMs}ms`));
    });

    req.on("error", (err) => {
      logger.error({ msg: "proxy error", url: url.toString(), err: err.message });
      reject(err);
    });

    req.write(payload);
    req.end();
  });
}

module.exports = { forward };
