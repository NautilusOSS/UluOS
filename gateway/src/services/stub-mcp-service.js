#!/usr/bin/env node

const readline = require("readline");

const SERVICE_NAME = process.env.STUB_SERVICE_NAME || "stub";
const PROTOCOL_VERSION = "2024-11-05";

const rl = readline.createInterface({ input: process.stdin, terminal: false });

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

rl.on("line", (line) => {
  if (!line.trim()) return;

  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
    return;
  }

  if (!msg.id) return;

  switch (msg.method) {
    case "initialize":
      send({
        jsonrpc: "2.0",
        id: msg.id,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: { name: `${SERVICE_NAME}-stub`, version: "0.0.1" },
        },
      });
      break;

    case "tools/list":
      send({ jsonrpc: "2.0", id: msg.id, result: { tools: [] } });
      break;

    case "tools/call":
      send({
        jsonrpc: "2.0",
        id: msg.id,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                stub: true,
                service: SERVICE_NAME,
                tool: msg.params?.name,
                message: `${SERVICE_NAME} service is not installed. Install the real service for live data.`,
                input: msg.params?.arguments || {},
              }),
            },
          ],
        },
      });
      break;

    default:
      send({
        jsonrpc: "2.0",
        id: msg.id,
        error: { code: -32601, message: `Unknown method: ${msg.method}` },
      });
  }
});
