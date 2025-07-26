// Tipe pengirim pesan
export type Sender = "user" | "ai";

// Interface untuk pesan
export interface Message {
  text: string;
  sender: Sender;
  created_at?: string;
  imageUrl?: string;
}

// Interface untuk gambar
export interface ImageState {
  base64: string | null;
  file: File | null;
  mimeType: string | null;
}

// Interface untuk auth status
export type AuthStatus = "pending" | "authenticated" | "unauthenticated";

// Interface untuk WebSocket message
export interface WebSocketMessage {
  type: "proactive_message" | "error";
  message: string;
}
