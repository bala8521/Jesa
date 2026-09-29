import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

import express from "express";
import { WebSocketServer, WebSocket } from "ws";

const PORT = Number(process.env.PORT) || 3000;

// --------------------------------------------------
// PATH SETUP
// --------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicPath = path.join(__dirname, "../public");

// --------------------------------------------------
// HTTP SERVER
// --------------------------------------------------

const app = express();

// --------------------------------------------------
// CORS
// --------------------------------------------------

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Methods",
    "GET,HEAD,PUT,PATCH,POST,DELETE",
  );
  res.header(
    "Access-Control-Allow-Headers",
    req.header("Access-Control-Request-Headers")
      ?? "Content-Type, Authorization",
  );

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
});

app.use(express.json());

// --------------------------------------------------
// API STATUS
// --------------------------------------------------

app.get("/api/status", (_req, res) => {
  res.json({
    name: "JESA",
    version: "VP1",
    status: "online",
  });
});

// --------------------------------------------------
// SERVE FRONTEND
// --------------------------------------------------

app.use(express.static(publicPath));

// --------------------------------------------------
// HTTP SERVER
// --------------------------------------------------

const server = http.createServer(app);

// --------------------------------------------------
// WEBSOCKET SERVER
// --------------------------------------------------

const wss = new WebSocketServer({
  server,
});

// --------------------------------------------------
// CLIENT STORAGE
// --------------------------------------------------

// clientId → WebSocket
const clients = new Map<string, WebSocket>();

// conversationId → Set of clientIds
const conversations = new Map<string, Set<string>>();

// --------------------------------------------------
// TYPES
// --------------------------------------------------

type ClientMessage =
  | {
      type: "join";
      conversationId: string;
    }
  | {
      type: "message";
      conversationId: string;
      text: string;
    };

type ServerMessage = {
  type: string;
  clientId?: string;
  conversationId?: string;
  text?: string;
  timestamp?: string;
};

// --------------------------------------------------
// SEND HELPER
// --------------------------------------------------

function send(
  socket: WebSocket,
  message: ServerMessage,
) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

// --------------------------------------------------
// BROADCAST TO ONE CONVERSATION
// --------------------------------------------------

function broadcastToConversation(
  conversationId: string,
  message: ServerMessage,
) {
  const members = conversations.get(conversationId);

  if (!members) {
    return;
  }

  for (const clientId of members) {
    const socket = clients.get(clientId);

    if (socket) {
      send(socket, message);
    }
  }
}

// --------------------------------------------------
// CLIENT CONNECTED
// --------------------------------------------------

wss.on("connection", (socket) => {
  const clientId = randomUUID();

  clients.set(clientId, socket);

  console.log(
    `Client connected: ${clientId}`,
  );

  // Tell client that connection succeeded
  send(socket, {
    type: "connected",
    clientId,
  });

  // ------------------------------------------------
  // MESSAGE RECEIVED
  // ------------------------------------------------

  socket.on("message", (rawData) => {
    try {
      const message =
        JSON.parse(
          rawData.toString(),
        ) as ClientMessage;

      // ==============================================
      // JOIN CONVERSATION
      // ==============================================

      if (message.type === "join") {
        const conversationId =
          message.conversationId.trim();

        if (!conversationId) {
          send(socket, {
            type: "error",
            text: "conversationId is required",
          });

          return;
        }

        // Create conversation if necessary
        if (!conversations.has(conversationId)) {
          conversations.set(
            conversationId,
            new Set(),
          );
        }

        // Add this client
        conversations
          .get(conversationId)!
          .add(clientId);

        console.log(
          `Client ${clientId} joined conversation ${conversationId}`,
        );

        send(socket, {
          type: "joined",
          conversationId,
          clientId,
        });

        return;
      }

      // ==============================================
      // CHAT MESSAGE
      // ==============================================

      if (message.type === "message") {
        const conversationId =
          message.conversationId.trim();

        const text =
          message.text.trim();

        if (!conversationId || !text) {
          send(socket, {
            type: "error",
            text:
              "conversationId and text are required",
          });

          return;
        }

        // --------------------------------------------
        // SECURITY CHECK
        // --------------------------------------------

        const members =
          conversations.get(
            conversationId,
          );

        if (
          !members ||
          !members.has(clientId)
        ) {
          send(socket, {
            type: "error",
            text:
              "You are not a member of this conversation",
          });

          return;
        }

        // --------------------------------------------
        // CREATE MESSAGE
        // --------------------------------------------

        const outgoingMessage: ServerMessage = {
          type: "message",
          clientId,
          conversationId,
          text,
          timestamp:
            new Date().toISOString(),
        };

        console.log(
          `[${conversationId}] ${clientId}: ${text}`,
        );

        // --------------------------------------------
        // SEND ONLY TO THIS CONVERSATION
        // --------------------------------------------

        broadcastToConversation(
          conversationId,
          outgoingMessage,
        );

        return;
      }

      // ==============================================
      // UNKNOWN MESSAGE
      // ==============================================

      send(socket, {
        type: "error",
        text: "Unknown message type",
      });

    } catch (error) {
      console.error(
        "Invalid WebSocket message:",
        error,
      );

      send(socket, {
        type: "error",
        text: "Invalid JSON message",
      });
    }
  });

  // ------------------------------------------------
  // CLIENT DISCONNECTED
  // ------------------------------------------------

  socket.on("close", () => {
    clients.delete(clientId);

    // Remove client from all conversations
    for (
      const [
        conversationId,
        members,
      ] of conversations
    ) {
      members.delete(clientId);

      // Remove empty conversation
      if (members.size === 0) {
        conversations.delete(
          conversationId,
        );
      }
    }

    console.log(
      `Client disconnected: ${clientId}`,
    );
  });
});

// --------------------------------------------------
// SERVER START
// --------------------------------------------------

server.listen(PORT, () => {
  console.log(
    "----------------------------------------",
  );

  console.log("JESA VP1");

  console.log(
    "----------------------------------------",
  );

  console.log(
    `HTTP:      http://localhost:${PORT}`,
  );

  console.log(
    `API:       http://localhost:${PORT}/api/status`,
  );

  console.log(
    `WebSocket: ws://localhost:${PORT}`,
  );

  console.log(
    "----------------------------------------",
  );
});