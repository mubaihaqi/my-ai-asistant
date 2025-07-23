import {
  GoogleGenerativeAI,
  ChatSession,
  GenerativeModel,
} from "@google/generative-ai";
import {
  API_KEY,
  systemInstructionContent,
  initialSeedHistory,
  promptsConfig,
} from "../config";
import {
  getChatHistoryFromDB,
  pool,
  isDatabaseConnected,
  saveMessageToDB,
} from "../database";
import { sendWebSocketMessage } from "../index"; // Import sendWebSocketMessage

// Inisialisasi objek GoogleGenerativeAI
const genAI = new GoogleGenerativeAI(API_KEY as string);

// --- MODEL UNTUK TEKS SAJA ---
// Menggunakan gemini-1.0-pro untuk kompatibilitas penuh dengan systemInstruction dan chat history.
const MODEL_NAME = "gemini-2.0-flash";
const VISION_MODEL_NAME = "gemini-1.5-flash";
const textModel: GenerativeModel = genAI.getGenerativeModel({ model: MODEL_NAME });
const visionModel: GenerativeModel = genAI.getGenerativeModel({ model: VISION_MODEL_NAME });

// Variabel untuk menyimpan sesi chat yang sedang berlangsung
let chatSession: ChatSession | null = null;

// Tipe data untuk request chat dari frontend
interface ChatRequest {
  message: string;
  userName?: string;
  image?: string; // Base64 encoded image
}

export async function handleChat(request: Request, corsHeaders: any) {
  try {
    // Ambil pesan, userName, dan image dari request body
    const { message, userName, image } = (await request.json()) as ChatRequest;

    // Validasi dasar: harus ada pesan atau gambar
    if (!message.trim() && !image) {
      console.warn(`[${new Date().toISOString()}] Empty message and no image received.`);
      return new Response(
        JSON.stringify({ error: "Please provide a text message or an image." }),
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
      await saveMessageToDB("single-user-session", "user", message, null);
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

    // --- LOGIKA UNTUK GAMBAR ATAU GAMBAR + TEKS ---
    if (image) {
      console.log(`[${new Date().toISOString()}] Processing request with image...`);
      
      // Buat prompt untuk model vision
      const imagePart = {
        inlineData: {
          mimeType: "image/jpeg", // Asumsi jpeg, bisa dibuat lebih dinamis
          data: image,
        },
      };

      const textPart = {
        text: message || "Tolong jelaskan gambar ini.", // Fallback jika tidak ada pesan teks
      };

      try {
        const result = await visionModel.generateContent({
          contents: [{ role: "user", parts: [textPart, imagePart] }],
          systemInstruction: {
            role: "model",
            parts: [{ text: systemInstructionContent }],
          },
          generationConfig: {
            maxOutputTokens: 2048, // Beri token lebih banyak untuk deskripsi gambar
            temperature: 0.9,
            topP: 0.9,
            topK: 40,
          },
        });
        const response = await result.response;
        aiResponseText = response.text();
        console.log(`[${new Date().toISOString()}] Vision model responded successfully.`);
      } catch (visionError) {
        console.error(`[${new Date().toISOString()}] Error calling vision model:`, visionError);
        throw visionError; // Lemparkan error untuk ditangani oleh block catch utama
      }
    } else {
      // --- LOGIKA UNTUK TEKS SAJA (menggunakan chat session) ---
      if (!chatSession) {
        const existingHistory = await getChatHistoryFromDB("single-user-session");
        console.log(
          `[${new Date().toISOString()}] Loaded ${
            existingHistory.length
          } messages from DB for chat history.`
        );

        chatSession = textModel.startChat({
          history: [...initialSeedHistory, ...existingHistory],
          generationConfig: {
            maxOutputTokens: 100,
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
    }
    // --- AKHIR LOGIKA ---

    // --- NEW: Simpan Pesan AI ke Database ---
    await saveMessageToDB("single-user-session", "ai", aiResponseText);
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

export async function handleProactiveMessage(
  sessionId: string,
  idleCount: number,
  messageType: "idle" | "deep_talk" = "idle"
) {
  try {
    console.log(
      `[${new Date().toISOString()}] Generating proactive message for session: ${sessionId}, idleCount: ${idleCount}`
    );

    // Ambil riwayat chat terbaru dari database
    const existingHistory = await getChatHistoryFromDB(sessionId);
    console.log(
      `[${new Date().toISOString()}] Loaded ${
        existingHistory.length
      } messages from DB for proactive message.`
    );

    // Buat sesi chat baru untuk pesan proaktif
    const proactiveChatSession = textModel.startChat({
      history: [...initialSeedHistory, ...existingHistory],
      generationConfig: {
        maxOutputTokens: 150, // Pesan proaktif cenderung lebih pendek
        temperature: 1.0, // Lebih kreatif untuk pesan proaktif
        topP: 0.9,
        topK: 40,
      },
      safetySettings: [],
      systemInstruction: {
        role: "model",
        parts: [{ text: systemInstructionContent }],
      },
    });

    let prompt: string;

    if (messageType === "deep_talk") {
      prompt = promptsConfig.proactive_messaging.deep_talk.instruction;
    } else {
      // Logika pesan idle yang sudah ada
      if (idleCount === 1) {
        prompt = promptsConfig.proactive_messaging.idle.level_1;
      } else if (idleCount === 2) {
        prompt = promptsConfig.proactive_messaging.idle.level_2;
      } else {
        prompt = promptsConfig.proactive_messaging.idle.level_3;
      }
    }

    const result = await proactiveChatSession.sendMessage(prompt);
    const response = await result.response;
    let proactiveReply = response.text();

    // Membersihkan tanda kutip yang mungkin ditambahkan oleh AI di awal/akhir
    proactiveReply = proactiveReply.trim().replace(/^"|"(?=\s*[^a-zA-Z0-9]*$)/g, "").trim();

    // Simpan pesan proaktif ke database
    await saveMessageToDB(sessionId, "ai", proactiveReply);

    // Kirim pesan proaktif ke frontend melalui WebSocket
    sendWebSocketMessage(sessionId, {
      type: "proactive_message",
      message: proactiveReply,
    });

    console.log(
      `[${new Date().toISOString()}] Proactive message sent: "${proactiveReply
        .trim()
        .substring(0, 100)}..."`
    );
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error generating proactive message:`,
      error
    );
    // Jika gagal, kirim pesan default ke frontend
    sendWebSocketMessage(sessionId, {
      type: "proactive_message",
      message: "Kamu masih di sana? Aku kangen ngobrol nih.",
    });
  }
}
