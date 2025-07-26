import { PORT } from "./config";
import { initializeScheduledJobs } from "./schedule";
import { handleRoutes } from "./routes";
import { websocketHandlers } from "./websocket";

console.log(`[${new Date().toISOString()}] Starting Bun backend server...`);

Bun.serve({
  hostname: "0.0.0.0",
  port: PORT,
  websocket: websocketHandlers,
  async fetch(request: Request, server) {
    const url = new URL(request.url);

    // Handle WebSocket upgrade request
    if (url.pathname === "/api/connect-websocket") {
      const upgraded = server.upgrade(request, {
        data: "single-user-session",
      });
      if (upgraded) {
        return;
      }
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    // Handle semua API routes
    return await handleRoutes(request);
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

// Inisialisasi cron jobs setelah server siap
initializeScheduledJobs();
