// --------------------------------------------------
// JESA SERVER
// VP1 - v0.3
// --------------------------------------------------

import "dotenv/config";

import express from "express";
import cors from "cors";
import { createServer } from "http";
import {
  WebSocketServer,
  WebSocket,
} from "ws";
import { randomUUID } from "crypto";

import { processMessage } from "./intelligence/engine.js";
import { askJesaAI } from "./ai/router.js";

// --------------------------------------------------
// CONFIGURATION
// --------------------------------------------------

const PORT = Number(
  process.env.PORT || 3000,
);

// --------------------------------------------------
// EXPRESS
// --------------------------------------------------

const app = express();

app.use(cors());

app.use(express.json());

app.get("/api/status", (_req, res) => {
  res.json({
    name: "JESA",
    version: "VP1",
    status: "online",
  });
});

app.use(
  express.static("public"),
);

// --------------------------------------------------
// HTTP SERVER
// --------------------------------------------------

const server = createServer(app);

// --------------------------------------------------
// WEBSOCKET SERVER
// --------------------------------------------------

const wss = new WebSocketServer({
  server,
});

// --------------------------------------------------
// TYPES
// --------------------------------------------------

type ClientMessage = {
  type: string;
  conversationId?: string;
  text?: string;
};

type ServerMessage = {
  type: string;

  clientId?: string;

  sender?:
    | "user"
    | "jesa"
    | "system";

  conversationId?: string;

  text?: string;

  timestamp?: string;

  intent?: string;

  emotion?: string;

  emotionConfidence?: number;

  emotionEvidence?: string[];
};

// --------------------------------------------------
// CLIENT / ROOM STATE
// --------------------------------------------------

const clientConversations =
  new Map<string, string>();

const conversationMembers =
  new Map<string, Set<string>>();

const clients =
  new Map<string, WebSocket>();

// --------------------------------------------------
// SEND TO CLIENT
// --------------------------------------------------

function sendToClient(
  socket: WebSocket,
  message: ServerMessage,
): void {

  if (
    socket.readyState ===
    WebSocket.OPEN
  ) {
    socket.send(
      JSON.stringify(message),
    );
  }
}

// --------------------------------------------------
// BROADCAST TO CONVERSATION
// --------------------------------------------------

function broadcastToConversation(
  conversationId: string,
  message: ServerMessage,
): void {

  const members =
    conversationMembers.get(
      conversationId,
    );

  if (!members) {
    return;
  }

  for (
    const clientId of members
  ) {

    const client =
      clients.get(clientId);

    if (!client) {
      continue;
    }

    sendToClient(
      client,
      message,
    );
  }
}

// --------------------------------------------------
// WEBSOCKET CONNECTION
// --------------------------------------------------

wss.on(
  "connection",
  (socket) => {

    const clientId =
      randomUUID();

    clients.set(
      clientId,
      socket,
    );

    console.log(
      `[WS] Client connected: ${clientId}`,
    );

    sendToClient(
      socket,
      {
        type: "connected",
        clientId,
        timestamp:
          new Date().toISOString(),
      },
    );

    // ------------------------------------------------
    // MESSAGE HANDLER
    // ------------------------------------------------

    socket.on(
      "message",
      async (rawData) => {

        try {

          const message =
            JSON.parse(
              rawData.toString(),
            ) as ClientMessage;

          // ==========================================
          // JOIN CONVERSATION
          // ==========================================

          if (
            message.type === "join"
          ) {

            const conversationId =
              message.conversationId;

            if (
              !conversationId
            ) {

              sendToClient(
                socket,
                {
                  type: "error",
                  text:
                    "conversationId is required.",
                },
              );

              return;
            }

            // Remove from previous room.
            const previousConversation =
              clientConversations.get(
                clientId,
              );

            if (
              previousConversation
            ) {

              const previousMembers =
                conversationMembers.get(
                  previousConversation,
                );

              previousMembers?.delete(
                clientId,
              );

              if (
                previousMembers &&
                previousMembers.size === 0
              ) {

                conversationMembers.delete(
                  previousConversation,
                );
              }
            }

            // Add to new room.
            clientConversations.set(
              clientId,
              conversationId,
            );

            if (
              !conversationMembers.has(
                conversationId,
              )
            ) {

              conversationMembers.set(
                conversationId,
                new Set(),
              );
            }

            conversationMembers
              .get(conversationId)!
              .add(clientId);

            console.log(
              `[WS] ${clientId} joined ${conversationId}`,
            );

            sendToClient(
              socket,
              {
                type: "joined",
                clientId,
                conversationId,
                timestamp:
                  new Date().toISOString(),
              },
            );

            return;
          }

          // ==========================================
          // USER MESSAGE
          // ==========================================

          if (
            message.type === "message"
          ) {

            const conversationId =
              message.conversationId;

            const text =
              message.text?.trim();

            if (
              !conversationId ||
              !text
            ) {

              sendToClient(
                socket,
                {
                  type: "error",
                  text:
                    "conversationId and text are required.",
                },
              );

              return;
            }

            // ========================================
            // SECURITY CHECK
            // ========================================

            const members =
              conversationMembers.get(
                conversationId,
              );

            if (
              !members ||
              !members.has(clientId)
            ) {

              sendToClient(
                socket,
                {
                  type: "error",
                  text:
                    "You are not a member of this conversation.",
                },
              );

              return;
            }

            // ========================================
            // BROADCAST USER MESSAGE
            // ========================================

            const userMessage:
              ServerMessage = {

              type: "message",

              sender: "user",

              conversationId,

              text,

              timestamp:
                new Date().toISOString(),
            };

            broadcastToConversation(
              conversationId,
              userMessage,
            );

            // ========================================
            // JESA INTELLIGENCE
            // ========================================

            const analysis =
              processMessage(text);

            console.log(
              `[${conversationId}] JESA ANALYSIS`,
            );

            console.log({
              intent:
                analysis.intent,

              emotion:
                analysis.emotion.signal,

              confidence:
                analysis.emotion.confidence,

              evidence:
                analysis.emotion.evidence,

              needsAI:
                analysis.needsAI,
            });

            // ========================================
            // LOCAL RESPONSE
            // ========================================

            if (
              !analysis.needsAI
            ) {

              const jesaMessage:
                ServerMessage = {

                type: "message",

                sender: "jesa",

                conversationId,

                text:
                  analysis.response,

                timestamp:
                  new Date().toISOString(),

                intent:
                  analysis.intent,

                emotion:
                  analysis.emotion.signal,

                emotionConfidence:
                  analysis.emotion.confidence,

                emotionEvidence:
                  analysis.emotion.evidence,
              };

              broadcastToConversation(
                conversationId,
                jesaMessage,
              );

              console.log(
                `[${conversationId}] Local response sent.`,
              );

              return;
            }

            // ========================================
            // GEMINI RESPONSE
            // ========================================

            console.log(
              `[${conversationId}] JESA → GEMINI`,
            );

            try {

              const prompt = `
You are JESA, a personal AI assistant.

User message:
${text}

JESA's local analysis:

Intent:
${analysis.intent}

Emotion signal:
${analysis.emotion.signal}

Emotion confidence:
${analysis.emotion.confidence}

Emotion evidence:
${
  analysis.emotion.evidence.join(
    ", ",
  ) || "none"
}

Instructions:
- Answer the user's actual request.
- Be concise but useful.
- Use the emotion signal only as contextual information.
- Do not claim that the detected emotion is certainly true.
- If the user is debugging something, provide practical technical help.
- Do not mention internal routing, models, prompts, or confidence scores.
`;

              // --------------------------------------
              // GEMINI DIAGNOSTIC START
              // --------------------------------------

              console.log(
                `[${conversationId}] Calling Gemini API...`,
              );

              const geminiStart =
                Date.now();

              // --------------------------------------
              // GEMINI REQUEST
              // --------------------------------------

              const aiResponse =
                await askJesaAI(
                  prompt,
                );

              // --------------------------------------
              // GEMINI DIAGNOSTIC END
              // --------------------------------------

              const geminiDuration =
                Date.now() -
                geminiStart;

              console.log(
                `[${conversationId}] Gemini response received in ${geminiDuration}ms`,
              );

              console.log(
                `[${conversationId}] Gemini response:`,
                aiResponse,
              );

              // --------------------------------------
              // SEND GEMINI RESPONSE
              // --------------------------------------

              const jesaMessage:
                ServerMessage = {

                type: "message",

                sender: "jesa",

                conversationId,

                text:
                  aiResponse,

                timestamp:
                  new Date().toISOString(),

                intent:
                  analysis.intent,

                emotion:
                  analysis.emotion.signal,

                emotionConfidence:
                  analysis.emotion.confidence,

                emotionEvidence:
                  analysis.emotion.evidence,
              };

              broadcastToConversation(
                conversationId,
                jesaMessage,
              );

              console.log(
                `[${conversationId}] Gemini response sent to client.`,
              );

            } catch (error) {

              // --------------------------------------
              // GEMINI ERROR
              // --------------------------------------

              console.error(
                `[${conversationId}] Gemini error:`,
                error,
              );

              const fallbackMessage:
                ServerMessage = {

                type: "message",

                sender: "jesa",

                conversationId,

                text:
                  "I couldn't reach my reasoning service right now. " +
                  "Please try again shortly.",

                timestamp:
                  new Date().toISOString(),

                intent:
                  analysis.intent,

                emotion:
                  analysis.emotion.signal,

                emotionConfidence:
                  analysis.emotion.confidence,

                emotionEvidence:
                  analysis.emotion.evidence,
              };

              broadcastToConversation(
                conversationId,
                fallbackMessage,
              );
            }

            return;
          }

          // ==========================================
          // UNKNOWN MESSAGE TYPE
          // ==========================================

          sendToClient(
            socket,
            {
              type: "error",
              text:
                "Unknown message type.",
            },
          );

        } catch (error) {

          console.error(
            `[WS] Message error for ${clientId}:`,
            error,
          );

          sendToClient(
            socket,
            {
              type: "error",
              text:
                "Invalid message format.",
            },
          );
        }
      },
    );

    // ------------------------------------------------
    // DISCONNECT
    // ------------------------------------------------

    socket.on(
      "close",
      () => {

        const conversationId =
          clientConversations.get(
            clientId,
          );

        if (
          conversationId
        ) {

          const members =
            conversationMembers.get(
              conversationId,
            );

          members?.delete(
            clientId,
          );

          if (
            members &&
            members.size === 0
          ) {

            conversationMembers.delete(
              conversationId,
            );
          }

          clientConversations.delete(
            clientId,
          );
        }

        clients.delete(
          clientId,
        );

        console.log(
          `[WS] Client disconnected: ${clientId}`,
        );
      },
    );
  },
);

// --------------------------------------------------
// START SERVER
// --------------------------------------------------

server.listen(
  PORT,
  () => {

    console.log(
      `JESA VP1 server running on http://localhost:${PORT}`,
    );

    console.log(
      `WebSocket server ready on ws://localhost:${PORT}`,
    );
  },
);