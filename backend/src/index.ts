// Import library GoogleGenerativeAI untuk akses Gemini API dan modul Node.js untuk file & path
import { GoogleGenerativeAI, ChatSession } from "@google/generative-ai";
import { readFileSync } from "fs";
import path from "path";

// Ambil API Key Gemini dari environment variable
const API_KEY = process.env.GEMINI_API_KEY;

// Tentukan path file konfigurasi persona dan seed history (riwayat awal chat)
const systemPath =
  process.env.SYSTEM_INSTRUCTION_PATH ||
  path.join(process.cwd(), "src", "config", "keziInstruction.json");
const seedHistoryPath =
  process.env.SEED_HISTORY_PATH ||
  path.join(process.cwd(), "src", "config", "seedHistory.json");

// Validasi API Key, jika tidak ada maka server tidak dijalankan
if (!API_KEY) {
  console.error("Error: GEMINI_API_KEY environment variable is not set.");
  console.error(
    "Please create a .env file in the backend folder and add GEMINI_API_KEY=YOUR_API_KEY_HERE"
  );
  console.error("Exiting due to missing API Key.");
  process.exit(1);
}

// Variabel untuk menyimpan instruksi sistem dan riwayat seed chat
let systemInstruction: string;
let seedHistory: any;

// Baca file konfigurasi instruksi sistem dan seed history
try {
  systemInstruction = readFileSync(systemPath, "utf-8");
  seedHistory = JSON.parse(readFileSync(seedHistoryPath, "utf-8"));
} catch (error) {
  console.error("Error reading configuration files:", error);
  process.exit(1);
}

// Inisialisasi objek GoogleGenerativeAI dan model Gemini yang digunakan
const genAI = new GoogleGenerativeAI(API_KEY);
const MODEL_NAME = "gemini-2.0-flash";
const model = genAI.getGenerativeModel({ model: MODEL_NAME });

// Variabel untuk menyimpan sesi chat yang sedang berlangsung
let chatSession: ChatSession | null = null;

// Tipe data untuk request chat dari frontend
interface ChatRequest {
  message: string;
  userName?: string;
}

// Logging informasi saat server dijalankan
console.log(`[${new Date().toISOString()}] Starting Bun backend server...`);
console.log(`[${new Date().toISOString()}] Using AI model: ${MODEL_NAME}`);
const personaPreviewLine = systemInstruction.split("\n")[1];
console.log(`[$
  {new Date().toISOString()}] Initializing with persona preview: "${
    personaPreviewLine ? personaPreviewLine.trim() : "No preview available"
  }..."`);

// Inisialisasi dan konfigurasi server Bun
Bun.serve({
  port: 3000,
  async fetch(request: Request) {
    const url = new URL(request.url);

    // Handle preflight CORS request untuk endpoint /api/chat
    if (request.method === "OPTIONS" && url.pathname === "/api/chat") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers":
            "Content-Type, Authorization, X-Requested-With",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // Endpoint utama untuk menerima dan memproses chat dari frontend
    if (url.pathname === "/api/chat" && request.method === "POST") {
      try {
        // Ambil pesan dan userName dari request body
        const { message, userName } = (await request.json()) as ChatRequest;

        // Validasi format pesan
        if (!message || typeof message !== "string") {
          console.warn(
            `[${new Date().toISOString()}] Invalid message format received:`,
            message
          );
          return new Response(
            JSON.stringify({
              error:
                "Invalid message format. 'message' property (string) is required.",
            }),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            }
          );
        }

        // Validasi userName, hanya user tertentu yang bisa chat dengan AI
        const ALLOWED_USER_NAME = "Muhammad Umar Baihaqi";
        if (userName !== ALLOWED_USER_NAME) {
          const forbiddenMessage = `Maaf banget, aku cuma bisa ngobrol sama Ren (Muhammad Umar Baihaqi). Lu siapa ya?`;
          console.warn(
            `[${new Date().toISOString()}] Unauthorized access attempt by user: "${
              userName || "UNKNOWN"
            }"`
          );
          return new Response(JSON.stringify({ reply: forbiddenMessage }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          });
        }

        // Logging pesan yang diterima dari frontend
        console.log(
          `[${new Date().toISOString()}] Received message from frontend (by ${userName}): "${message}"`
        );

        // Inisialisasi sesi chat jika belum ada
        if (!chatSession) {
          chatSession = model.startChat({
            history: seedHistory,
            generationConfig: {
              maxOutputTokens: 100,
              temperature: 0.9,
              topP: 0.9,
              topK: 40,
            },
            safetySettings: [],
            systemInstruction: {
              role: "model",
              parts: [{ text: systemInstruction }],
            },
          });
          console.log(
            `[${new Date().toISOString()}] New chat session started with ${MODEL_NAME}.`
          );
        }

        // Kirim pesan ke Gemini API dan ambil balasan
        const result = await chatSession.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        // Logging balasan dari AI
        console.log(
          `[${new Date().toISOString()}] Gemini API responded successfully.`
        );
        console.log(
          `[${new Date().toISOString()}] AI Reply: "${text
            .trim()
            .substring(0, 100)}..."`
        );

        // Kirim balasan AI ke frontend
        return new Response(JSON.stringify({ reply: text }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      } catch (error: any) {
        // Handle error saat proses chat gagal
        console.error(
          `[${new Date().toISOString()}] Error processing chat request:`,
          error
        );

        let errorMessage =
          "Maaf, terjadi kesalahan saat menghubungi AI. Silakan coba lagi.";
        if (
          error &&
          typeof error === "object" &&
          "message" in error &&
          typeof error.message === "string" &&
          error.message.includes("[GoogleGenerativeAI Error]")
        ) {
          errorMessage = `AI API Error: ${error.message}`;
          if ("status" in error && typeof error.status === "number") {
            errorMessage += ` (Status: ${error.status})`;
          }
        } else if (error instanceof Error) {
          errorMessage = `Server Error: ${error.message}`;
        }

        // Kirim pesan error ke frontend
        return new Response(JSON.stringify({ error: errorMessage }), {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
    }

    // Response default jika endpoint tidak ditemukan
    return new Response("Not Found", { status: 404 });
  },
});

// Logging info server berjalan dan konfigurasi CORS
console.log(
  `[${new Date().toISOString()}] Bun server listening on http://localhost:3000`
);
console.log(
  `[${new Date().toISOString()}] CORS allows requests from any origin for development purposes. This should be restricted in production.`
);
console.log(
  `[${new Date().toISOString()}] Remember to set GEMINI_API_KEY in your backend/.env file.`
);
