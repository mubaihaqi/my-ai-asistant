import { GoogleGenerativeAI, ChatSession, GenerativeModel } from "@google/generative-ai";
import { API_KEY, systemInstructionContent, initialSeedHistory } from "../config";
import { getChatHistoryFromDB, pool, isDatabaseConnected } from "../database";

// Inisialisasi objek GoogleGenerativeAI
const genAI = new GoogleGenerativeAI(API_KEY as string);

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

export async function handleChat(request: Request, corsHeaders: any) {
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
