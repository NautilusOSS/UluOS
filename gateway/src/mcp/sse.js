const { Router } = require("express");
const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");

const SESSION_TTL_MS = 30 * 60 * 1000;

function sseRoutes(mcpProtocol) {
  const router = Router();
  const sessions = new Map();

  function expireSessions() {
    const now = Date.now();
    for (const [id, session] of sessions) {
      if (now - session.createdAt > SESSION_TTL_MS) {
        try { session.res.end(); } catch {}
        sessions.delete(id);
        logger.info({ msg: "mcp sse session expired", sessionId: id });
      }
    }
  }

  const expiryTimer = setInterval(expireSessions, 60_000);
  expiryTimer.unref();

  router.get("/mcp/sse", (req, res) => {
    const sessionId = uuidv4();

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    sessions.set(sessionId, {
      res,
      createdAt: Date.now(),
      writing: false,
      queue: [],
    });
    logger.info({ msg: "mcp sse session opened", sessionId });

    const messagesUrl = `/mcp/messages?sessionId=${sessionId}`;
    res.write(`event: endpoint\ndata: ${messagesUrl}\n\n`);

    req.on("close", () => {
      sessions.delete(sessionId);
      logger.info({ msg: "mcp sse session closed", sessionId });
    });
  });

  function drainQueue(session) {
    if (session.writing || session.queue.length === 0) return;
    session.writing = true;
    while (session.queue.length > 0) {
      const data = session.queue.shift();
      try {
        session.res.write(`event: message\ndata: ${data}\n\n`);
      } catch (err) {
        logger.warn({ msg: "sse write failed", err: err.message });
        break;
      }
    }
    session.writing = false;
  }

  // Streamable HTTP transport — Cursor and newer MCP clients POST directly
  // to the same URL used for SSE, expecting a JSON-RPC response back.
  router.post("/mcp/sse", async (req, res) => {
    const message = req.body;

    logger.debug({ msg: "mcp http request", method: message?.method });

    if (message && !message.id) {
      await mcpProtocol.handle(message);
      return res.status(202).end();
    }

    try {
      const response = await mcpProtocol.handle(message);
      if (response) {
        return res.json(response);
      }
      res.status(202).end();
    } catch (err) {
      logger.error({ msg: "mcp http error", err: err.message });
      res.json({
        jsonrpc: "2.0",
        id: message?.id || null,
        error: { code: -32603, message: "Internal error" },
      });
    }
  });

  // Legacy SSE transport — older clients POST messages to a separate endpoint
  // and receive responses on the SSE stream opened via GET /mcp/sse.
  router.post("/mcp/messages", async (req, res) => {
    const sessionId = req.query.sessionId;

    if (!sessionId || !sessions.has(sessionId)) {
      return res.status(400).json({ error: "Invalid or expired session" });
    }

    const session = sessions.get(sessionId);
    const message = req.body;

    logger.debug({ msg: "mcp message received", sessionId, method: message?.method });

    try {
      const response = await mcpProtocol.handle(message);

      if (response) {
        session.queue.push(JSON.stringify(response));
        drainQueue(session);
      }
    } catch (err) {
      logger.error({ msg: "mcp handle error", sessionId, err: err.message });
      const errorResponse = {
        jsonrpc: "2.0",
        id: message?.id || null,
        error: { code: -32603, message: "Internal error" },
      };
      session.queue.push(JSON.stringify(errorResponse));
      drainQueue(session);
    }

    res.status(202).end();
  });

  return router;
}

module.exports = sseRoutes;
