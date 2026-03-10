const http = require("http");
const PORT = process.env.PORT || 3000;
const NAME = process.env.SERVICE_NAME || "stub";

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ status: "ok", service: NAME }));
  }

  if (req.url === "/capabilities") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end("[]");
  }

  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    let body = {};
    try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch {}
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ stub: true, service: NAME, tool: req.url.slice(1), input: body }));
  });
});

server.listen(PORT, () => console.log(`${NAME} stub listening on :${PORT}`));
