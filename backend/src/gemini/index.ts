import { saveMessageToDB, getChatHistoryFromDB } from "../database";
import {
  handleSilenceCommands,
  handleNgambekMode,
  handleImageProcessing,
  handleTextProcessing,
} from "./chatHandler";
import { handleProactiveMessage } from "./proactiveHandler";
import { getFrozenStatus } from "../state";

// Re-export handleProactiveMessage untuk backward compatibility
export { handleProactiveMessage };

// Interface untuk request chat dari frontend
interface ChatRequest {
  message: string;
  userName?: string;
  image?: string; // Base64 encoded image
  mimeType?: string; // MIME type of the image
}

export async function handleChat(request: Request, corsHeaders: any) {
  try {
    // Ambil data dari request dan validasi input
    const { message, userName, image, mimeType } =
      (await request.json()) as ChatRequest;

    // Validasi dasar: harus ada pesan atau gambar
    if (!message.trim() && !image) {
      console.warn(
        `[${new Date().toISOString()}] Empty message and no image received.`
      );
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

    // Validasi user yang diizinkan
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

    // Cek mode frozen (SILENCE ON)
    if (getFrozenStatus()) {
      console.log(
        `[${new Date().toISOString()}] 🔇 Frozen mode: TRUE (Pesan tidak disimpan ke DB, tidak ada balasan)`
      );
      return new Response(JSON.stringify({ reply: "" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Logging pesan yang diterima dari frontend (truncated)
    const truncatedMessage =
      message.length > 50 ? message.substring(0, 50) + "..." : message;
    console.log(
      `[${new Date().toISOString()}] Received message from frontend (by ${userName}): "${truncatedMessage}"`
    );

    // Handle perintah SILENCE
    const silenceResponse = handleSilenceCommands(message, corsHeaders);
    if (silenceResponse) {
      return silenceResponse;
    }

    // Simpan pesan user ke database
    try {
      await saveMessageToDB(
        "single-user-session",
        "user",
        message,
        image,
        mimeType
      );
    } catch (dbError) {
      console.error(
        `[${new Date().toISOString()}] Error saving user message to DB:`,
        dbError
      );
    }

    // Ambil history untuk chat
    const existingHistory = await getChatHistoryFromDB("single-user-session");
    console.log(
      `[${new Date().toISOString()}] Loaded ${
        existingHistory.length
      } messages from DB for chat history.`
    );

    // Proses chat berdasarkan mode
    let aiResponseText: string;

    if (image) {
      aiResponseText = await handleImageProcessing(
        message,
        image,
        mimeType || "image/jpeg"
      );
    } else {
      aiResponseText = await handleTextProcessing(message, existingHistory);
    }

    // Simpan pesan AI ke database
    await saveMessageToDB("single-user-session", "ai", aiResponseText);
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

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
