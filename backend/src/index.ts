import { PORT, systemInstructionContent } from "./config";
import { handleAuth, handleVerifyToken, verifyToken } from "./auth";
import { handleChat, handleProactiveMessage } from "./gemini";
import { getMessagesForFrontend } from "./database";

// Logging informasi saat server dijalankan
console.log(`[${new Date().toISOString()}] Starting Bun backend server...`);
// console.log(`[${new Date().toISOString()}] Using AI model: ${MODEL_NAME}`); // MODEL_NAME is now in gemini/index.ts
// const personaPreviewLine = systemInstructionContent.split("\n")[1];
// console.log(
//   `[${new Date().toISOString()}] Initializing with persona preview: "${
//     personaPreviewLine ? personaPreviewLine.trim() : "No preview available"
//   }..."`
// );

// Inisialisasi dan konfigurasi server Bun
import type { ServerWebSocket, WebSocketHandler } from "bun";

// Map untuk menyimpan koneksi WebSocket aktif. Key bisa berupa userId atau sessionId.
// Untuk saat ini, kita akan menggunakan 'single-user-session' sebagai key.
export const activeWebSockets = new Map<string, ServerWebSocket<unknown>>();

export function sendWebSocketMessage(sessionId: string, message: any) {
  const ws = activeWebSockets.get(sessionId);
  if (ws) {
    ws.send(JSON.stringify(message));
    console.log(`[${new Date().toISOString()}] Sent WebSocket message to ${sessionId}: ${JSON.stringify(message).substring(0, 100)}...`);
  } else {
    console.warn(`[${new Date().toISOString()}] No active WebSocket found for session: ${sessionId}`);
  }
}

const websocketHandlers: WebSocketHandler<unknown> = {
  open(ws) {
    console.log(`[${new Date().toISOString()}] WebSocket opened for client: ${ws.remoteAddress}`);
    // Asosiasikan koneksi WebSocket dengan sesi pengguna.
    // Untuk demo ini, kita asumsikan satu sesi pengguna.
    activeWebSockets.set("single-user-session", ws);
  },
  message(ws, message) {
    console.log(`[${new Date().toISOString()}] Received WebSocket message from client ${ws.remoteAddress}: ${message}`);
    // Handle pesan masuk dari WebSocket jika diperlukan
  },
  close(ws, code, message) {
    console.log(`[${new Date().toISOString()}] WebSocket closed for client ${ws.remoteAddress} with code ${code}: ${message}`);
    activeWebSockets.delete("single-user-session");
  },
  drain(ws) {
    console.log(`[${new Date().toISOString()}] WebSocket backpressure relieved for client: ${ws.remoteAddress}`);
  },
};

Bun.serve({
  port: PORT,
  websocket: websocketHandlers,
  async fetch(request: Request, server) {
    const url = new URL(request.url);

    // Handle WebSocket upgrade request
    if (url.pathname === "/api/connect-websocket") {
      const upgraded = server.upgrade(request, {
        data: "single-user-session", // Data yang akan diasosiasikan dengan WebSocket
      });
      if (upgraded) {
        return; // do not return a Response
      }
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Endpoint untuk autentikasi
    if (url.pathname === "/api/auth" && request.method === "POST") {
      return handleAuth(request, corsHeaders);
    }

    // Endpoint untuk verifikasi token
    if (url.pathname === "/api/verify-token" && request.method === "POST") {
      return handleVerifyToken(request, corsHeaders);
    }

    if (url.pathname === "/api/chat" && request.method === "POST") {
      const authResult = verifyToken(request);
      if (!authResult.authorized) {
        return authResult.response;
      }
      return handleChat(request, corsHeaders);
    }

    // Endpoint baru untuk mengambil riwayat chat
    if (url.pathname === "/api/chat-history" && request.method === "GET") {
      const authResult = verifyToken(request);
      if (!authResult.authorized) {
        return authResult.response;
      }
      const urlParams = new URLSearchParams(url.search);
      const limit = parseInt(urlParams.get("limit") || "20");
      const beforeTimestamp = urlParams.get("before");

      const messages = await getMessagesForFrontend(
        "single-user-session",
        limit,
        beforeTimestamp
      );
      return new Response(JSON.stringify(messages), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Endpoint baru untuk memicu pesan proaktif
    if (url.pathname === "/api/trigger-proactive" && request.method === "POST") {
      const authResult = verifyToken(request);
      if (!authResult.authorized) {
        return authResult.response;
      }
      const { idleCount } = (await request.json()) as { idleCount?: number };
      // Panggil fungsi untuk menghasilkan dan mengirim pesan proaktif
      await handleProactiveMessage("single-user-session", idleCount || 0);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Response default jika endpoint tidak ditemukan
    return new Response("Not Found", { status: 404, headers: corsHeaders });
  },
});

// Logging info server berjalan dan konfigurasi CORS
console.log(
  `[${new Date().toISOString()}] Bun server listening on http://localhost:${PORT}`
);
console.log(
  `[${new Date().toISOString()}] CORS allows requests from any origin for development purposes. This should be restricted in production.`
);
console.log(
  `[${new Date().toISOString()}] Remember to set GEMINI_API_KEY in your backend/.env file.`
);
