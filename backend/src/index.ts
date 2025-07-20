// Import library GoogleGenerativeAI untuk akses Gemini API dan modul Node.js untuk file & path
import {
  GoogleGenerativeAI,
  ChatSession,
  GenerativeModel,
} from "@google/generative-ai"; // Tambahkan GenerativeModel
import { readFileSync } from "fs";
import path from "path";
import { Pool, type PoolClient } from "pg"; // Import Pool dari 'pg'
import jwt from "jsonwebtoken";

// Ambil API Key Gemini dari environment variable
const API_KEY = process.env.GEMINI_API_KEY;
const SECRET_NAME = process.env.SECRET_NAME;
const JWT_SECRET = process.env.JWT_SECRET || "your-default-secret";

// --- KONFIGURASI PATH FILE ---
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
let systemInstructionContent: string; // Ganti nama variabel dari 'systemInstruction' ke 'systemInstructionContent'
let initialSeedHistory: any[] = []; // Ganti nama variabel dari 'seedHistory' ke 'initialSeedHistory'

// Baca file konfigurasi instruksi sistem dan seed history
try {
  systemInstructionContent = readFileSync(systemPath, "utf-8");
  initialSeedHistory = JSON.parse(readFileSync(seedHistoryPath, "utf-8"));
} catch (error) {
  console.error("Error reading configuration files:", error);
  console.error(
    "Make sure src/config/keziInstruction.json and src/config/seedHistory.json exist and are valid JSON."
  );
  process.exit(1);
}

// --- INISIALISASI DATABASE CONNECTION POOL (PG) ---
// Pastikan DATABASE_URL ini akan diambil dari Environment Variable di Render.com nanti
const DATABASE_URL = process.env.DATABASE_URL; // Tidak perlu default fallback di sini, karena wajib ada di env

if (!DATABASE_URL) {
  console.error("Error: DATABASE_URL environment variable is not set.");
  console.error(
    "Please set DATABASE_URL in your .env file or Render.com dashboard."
  );
  process.exit(1);
}

// Parse the DATABASE_URL to get individual connection parameters
const dbUrl = new URL(DATABASE_URL);

const pool = new Pool({
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port) || 5432,
  database: dbUrl.pathname.slice(1), // Remove the leading '/'
  user: dbUrl.username,
  password: dbUrl.password,
  ssl: {
    rejectUnauthorized: false,
  },
  // Add connection timeout and retry options
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10,
});

// Track database connection status
let isDatabaseConnected = false;

// Test koneksi database (opsional, tapi bagus untuk debugging awal)
pool
  .connect()
  .then((client: PoolClient) => {
    console.log(
      `[${new Date().toISOString()}] Connected to PostgreSQL database (Supabase) via pg!`
    );
    isDatabaseConnected = true;
    client.release(); // Lepaskan client kembali ke pool
  })
  .catch((err: Error) => {
    console.error(
      `[${new Date().toISOString()}] Warning: Could not connect to PostgreSQL database:`,
      err.message
    );
    console.warn(
      `[${new Date().toISOString()}] Database features will be disabled. Chat will still work without message persistence.`
    );
    isDatabaseConnected = false;
    // Don't exit - continue without database functionality
  });
// --- AKHIR INISIALISASI DATABASE CONNECTION POOL ---

// Fungsi untuk mengambil riwayat chat dari database
async function getChatHistoryFromDB(
  sessionId: string,
  limit: number = 10
): Promise<any[]> {
  try {
    // Ambil 10 pesan terakhir untuk sesi ini, diurutkan dari yang paling lama
    const res = await pool.query(
      `SELECT sender, text FROM messages WHERE session_id = $1 ORDER BY created_at ASC LIMIT $2`,
      [sessionId, limit]
    );

    // Format data agar sesuai dengan format history yang diharapkan oleh Gemini API
    return res.rows.map((row) => ({
      role: row.sender === "user" ? "user" : "model", // 'user' atau 'model'
      parts: [{ text: row.text }],
    }));
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error fetching chat history from DB:`,
      error
    );
    return []; // Kembalikan array kosong jika ada error
  }
}

// Inisialisasi objek GoogleGenerativeAI
const genAI = new GoogleGenerativeAI(API_KEY);

// --- MODEL UNTUK TEKS SAJA ---
// Menggunakan gemini-1.0-pro untuk kompatibilitas penuh dengan systemInstruction dan chat history.
const MODEL_NAME = "gemini-2.0-flash";
const model: GenerativeModel = genAI.getGenerativeModel({ model: MODEL_NAME });

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
const personaPreviewLine = systemInstructionContent.split("\n")[1];
console.log(
  `[${new Date().toISOString()}] Initializing with persona preview: "${
    personaPreviewLine ? personaPreviewLine.trim() : "No preview available"
  }..."`
);

// Get port from environment variable or use default
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Inisialisasi dan konfigurasi server Bun
Bun.serve({
  port: PORT,
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
      try {
        const { name } = (await request.json()) as { name: string };

        if (
          name &&
          name.trim().toLowerCase() === (SECRET_NAME || "").toLowerCase()
        ) {
          const token = jwt.sign({ name }, JWT_SECRET, { expiresIn: "1h" });
          return new Response(JSON.stringify({ success: true, token }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } else {
          return new Response(JSON.stringify({ success: false }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (error) {
        return new Response(JSON.stringify({ error: "Invalid request" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Endpoint untuk verifikasi token
    if (url.pathname === "/api/verify-token" && request.method === "POST") {
      try {
        const { token } = (await request.json()) as { token: string };
        if (!token) {
          return new Response(JSON.stringify({ valid: false }), {
            status: 400,
          });
        }

        jwt.verify(token, JWT_SECRET);
        return new Response(JSON.stringify({ valid: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("JWT verification failed:", error);
        return new Response(JSON.stringify({ valid: false }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    if (url.pathname === "/api/chat" && request.method === "POST") {
      const token = request.headers.get("Authorization")?.split(" ")[1];
      if (!token) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Access-Control-Allow-Origin": "*" },
        });
      }

      try {
        jwt.verify(token, JWT_SECRET);
      } catch (error) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Access-Control-Allow-Origin": "*" },
        });
      }

      try {
        // Ambil pesan dan userName dari request body (tanpa image)
        const { message, userName } = (await request.json()) as ChatRequest;

        // Validasi dasar: harus ada pesan
        if (!message.trim()) {
          console.warn(`[${new Date().toISOString()}] Empty message received.`);
          return new Response(
            JSON.stringify({ error: "Please provide a text message." }),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            }
          );
        }

        // Validasi userName
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

        // --- NEW: Simpan Pesan User ke Database ---
        try {
          await pool.query(
            `INSERT INTO messages (session_id, sender, text, image_url) VALUES ($1, $2, $3, $4)`,
            ["single-user-session", "user", message, null]
          );
          console.log(
            `[${new Date().toISOString()}] User message saved to Supabase.`
          );
        } catch (dbError) {
          console.error(
            `[${new Date().toISOString()}] Error saving user message to DB:`,
            dbError
          );
        }
        // --- Akhir NEW ---

        let aiResponseText: string;

        // --- LOGIKA UNTUK TEKS ---
        // Inisialisasi sesi chat jika belum ada
        if (!chatSession) {
          // --- NEW: Ambil Riwayat Chat dari Database ---
          const existingHistory = await getChatHistoryFromDB(
            "single-user-session"
          );
          console.log(
            `[${new Date().toISOString()}] Loaded ${
              existingHistory.length
            } messages from DB for chat history.`
          );
          // --- Akhir NEW ---

          chatSession = model.startChat({
            history: [...initialSeedHistory, ...existingHistory], // Gabungkan seed history dan history dari DB
            generationConfig: {
              maxOutputTokens: 100, // Kembali ke 100 seperti yang disarankan
              temperature: 0.9,
              topP: 0.9,
              topK: 40,
            },
            safetySettings: [],
            systemInstruction: {
              role: "model",
              parts: [{ text: systemInstructionContent }],
            },
          });
          console.log(
            `[${new Date().toISOString()}] New chat session started with ${MODEL_NAME} for text.`
          );
        }

        console.log(
          `[${new Date().toISOString()}] Calling ${MODEL_NAME} with text only (via chat session)...`
        );
        if (chatSession) {
          const result = await chatSession.sendMessage(message);
          const response = await result.response;
          aiResponseText = response.text();
        } else {
          throw new Error("Chat session was not initialized for text model.");
        }
        // --- AKHIR LOGIKA UNTUK TEKS ---

        // --- NEW: Simpan Pesan AI ke Database ---
        if (isDatabaseConnected) {
          try {
            await pool.query(
              `INSERT INTO messages (session_id, sender, text, image_url) VALUES ($1, $2, $3, $4)`,
              ["single-user-session", "ai", aiResponseText, null] // image_url null
            );
            console.log(
              `[${new Date().toISOString()}] AI response saved to Supabase.`
            );
          } catch (dbError) {
            console.error(
              `[${new Date().toISOString()}] Error saving AI message to DB:`,
              dbError
            );
            // Lanjutkan eksekusi meskipun gagal simpan ke DB
          }
        }
        // --- Akhir NEW ---

        // Logging balasan dari AI
        console.log(
          `[${new Date().toISOString()}] Gemini API responded successfully.`
        );
        console.log(
          `[${new Date().toISOString()}] AI Reply: "${aiResponseText
            .trim()
            .substring(0, 100)}..."`
        );

        return new Response(JSON.stringify({ reply: aiResponseText }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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
