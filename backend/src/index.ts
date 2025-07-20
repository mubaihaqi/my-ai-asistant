import { PORT, systemInstructionContent } from "./config";
import { handleAuth, handleVerifyToken, verifyToken } from "./auth";
import { handleChat } from "./gemini";
import { getMessagesForFrontend } from "./database";

// Logging informasi saat server dijalankan
console.log(`[${new Date().toISOString()}] Starting Bun backend server...`);
// console.log(`[${new Date().toISOString()}] Using AI model: ${MODEL_NAME}`); // MODEL_NAME is now in gemini/index.ts
const personaPreviewLine = systemInstructionContent.split("\n")[1];
console.log(
  `[${new Date().toISOString()}] Initializing with persona preview: "${
    personaPreviewLine ? personaPreviewLine.trim() : "No preview available"
  }..."`
);

// Inisialisasi dan konfigurasi server Bun
Bun.serve({
  port: PORT,
  websocket: {
    message() {},
  },
  async fetch(request: Request) {
    const url = new URL(request.url); // Define url here

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
