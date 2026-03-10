const { Router } = require("express");
const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");

function sseRoutes(mcpProtocol) {
  const router = Router();
  const sessions = new Map();

  router.get("/mcp/sse", (req, res) => {
    const sessionId = uuidv4();

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    sessions.set(sessionId, res);
    logger.info({ msg: "mcp sse session opened", sessionId });

    const messagesUrl = `/mcp/messages?sessionId=${sessionId}`;
    res.write(`event: endpoint\ndata: ${messagesUrl}\n\n`);

    req.on("close", () => {
      sessions.delete(sessionId);
      logger.info({ msg: "mcp sse session closed", sessionId });
    });
  });

  router.post("/mcp/messages", async (req, res) => {
    const sessionId = req.query.sessionId;

    if (!sessionId || !sessions.has(sessionId)) {
      return res.status(400).json({ error: "Invalid or expired session" });
    }

    const sseRes = sessions.get(sessionId);
    const message = req.body;

    logger.debug({ msg: "mcp message received", sessionId, method: message?.method });

    const response = await mcpProtocol.handle(message);

    if (response) {
      sseRes.write(`event: message\ndata: ${JSON.stringify(response)}\n\n`);
    }

    res.status(202).end();
  });

  return router;
}

module.exports = sseRoutes;
