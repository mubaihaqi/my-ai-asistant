import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import {
  API_KEY,
  systemInstructionContent,
  initialSeedHistory,
  promptsConfig,
} from "../config";
import { getChatHistoryFromDB, saveMessageToDB } from "../database";
import { sendWebSocketMessage } from "../websocket";
import {
  setNgambek,
  getNgambekStatus,
  setFrozen,
  getFrozenStatus,
} from "../state";

// Inisialisasi GoogleGenerativeAI dan model untuk text
const genAI = new GoogleGenerativeAI(API_KEY as string);
const MODEL_NAME = "gemini-2.0-flash";
const textModel: GenerativeModel = genAI.getGenerativeModel({
  model: MODEL_NAME,
});

export async function handleProactiveMessage(
  sessionId: string,
  idleCount: number,
  messageType: "idle" | "deep_talk" | "good_morning" = "idle"
) {
  try {
    if (getFrozenStatus()) {
      console.log(
        `[${new Date().toISOString()}] Proactive message generation skipped: Frozen mode is active.`
      );
      return;
    }

    console.log(
      `[${new Date().toISOString()}] Generating proactive message for session: ${sessionId}, idleCount: ${idleCount}, type: ${messageType}`
    );

    // Ambil riwayat chat dan buat sesi chat untuk pesan proaktif
    const existingHistory = await getChatHistoryFromDB(sessionId);
    console.log(
      `[${new Date().toISOString()}] Loaded ${
        existingHistory.length
      } messages from DB for proactive message.`
    );

    // Buat sesi chat baru untuk pesan proaktif
    const proactiveChatSession = textModel.startChat({
      history: [...initialSeedHistory, ...existingHistory.slice(-5)],
      generationConfig: {
        maxOutputTokens: 30,
        temperature: 1.0,
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
    } else if (messageType === "good_morning") {
      prompt = promptsConfig.proactive_messaging.good_morning.instruction;
    } else {
      // Pilih prompt berdasarkan level idle
      if (idleCount === 1) {
        prompt = promptsConfig.proactive_messaging.idle.level_1;
      } else if (idleCount === 2) {
        prompt = promptsConfig.proactive_messaging.idle.level_2;
      } else if (idleCount === 3) {
        prompt = promptsConfig.proactive_messaging.idle.level_3;
      } else {
        setNgambek(true);
        return;
      }
    }

    const result = await proactiveChatSession.sendMessage(prompt);
    const response = await result.response;
    let proactiveReply = response.text();
    console.log(
      `[${new Date().toISOString()}] Raw proactive reply from AI: "${proactiveReply
        .trim()
        .substring(0, 100)}..."`
    );

    // Bersihkan tanda kutip dan simpan ke database
    proactiveReply = proactiveReply
      .trim()
      .replace(/^"|"(?=\s*[^a-zA-Z0-9]*$)/g, "")
      .trim();
    await saveMessageToDB(sessionId, "ai", proactiveReply);

    // Kirim pesan proaktif ke frontend
    sendWebSocketMessage(sessionId, {
      type: "proactive_message",
      message: proactiveReply,
    });
    console.log(
      `[${new Date().toISOString()}] Proactive message sent: "${proactiveReply
        .trim()
        .substring(0, 100)}..."`
    );

    if (messageType === "idle" && idleCount === 3) {
      setNgambek(true);
    }
  } catch (error: any) {
    console.error(
      `[${new Date().toISOString()}] Error generating proactive message:`,
      error
    );
    sendWebSocketMessage(sessionId, {
      type: "error",
      message: "Failed to generate proactive message",
    });
  }
}
