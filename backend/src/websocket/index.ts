import type { ServerWebSocket, WebSocketHandler } from "bun";

// Map untuk menyimpan koneksi WebSocket aktif
export const activeWebSockets = new Map<string, ServerWebSocket<unknown>>();

// Kirim pesan ke WebSocket
export function sendWebSocketMessage(sessionId: string, message: any) {
  const ws = activeWebSockets.get(sessionId);
  if (ws) {
    ws.send(JSON.stringify(message));
    console.log(
      `[${new Date().toISOString()}] Sent WebSocket message to ${sessionId}: ${JSON.stringify(
        message
      ).substring(0, 100)}...`
    );
  } else {
    console.warn(
      `[${new Date().toISOString()}] No active WebSocket found for session: ${sessionId}`
    );
  }
}

// Handler untuk WebSocket
export const websocketHandlers: WebSocketHandler<unknown> = {
  open(ws) {
    console.log(
      `[${new Date().toISOString()}] WebSocket connected: ${ws.remoteAddress}`
    );
    activeWebSockets.set("single-user-session", ws);
  },
  message(ws, message) {
    // Only log non-empty messages with truncation
    if (message && message.toString().trim()) {
      const messageStr = message.toString();
      if (messageStr.length > 100) {
        console.log(
          `[${new Date().toISOString()}] WebSocket message: ${messageStr.substring(
            0,
            100
          )}...`
        );
      } else {
        console.log(
          `[${new Date().toISOString()}] WebSocket message: ${messageStr}`
        );
      }
    }
  },
  close(ws, code, message) {
    // Only log abnormal closures
    if (code !== 1000) {
      console.log(
        `[${new Date().toISOString()}] WebSocket closed abnormally: ${
          ws.remoteAddress
        } (code: ${code})`
      );
    }
    activeWebSockets.delete("single-user-session");
  },
  drain(ws) {
    // Remove drain logging as it's not essential
  },
};
