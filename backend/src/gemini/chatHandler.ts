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
import { getChatHistoryFromDB, saveMessageToDB } from "../database";
import {
  setNgambek,
  getNgambekStatus,
  setFrozen,
  getFrozenStatus,
} from "../state";

// Inisialisasi GoogleGenerativeAI dan model untuk text dan vision
const genAI = new GoogleGenerativeAI(API_KEY as string);
const MODEL_NAME = "gemini-2.0-flash";
const VISION_MODEL_NAME = "gemini-1.5-flash";
const textModel: GenerativeModel = genAI.getGenerativeModel({
  model: MODEL_NAME,
});
const visionModel: GenerativeModel = genAI.getGenerativeModel({
  model: VISION_MODEL_NAME,
});

// Interface untuk request chat dari frontend
interface ChatRequest {
  message: string;
  userName?: string;
  image?: string; // Base64 encoded image
  mimeType?: string; // MIME type of the image
}

// Handle perintah SILENCE
export function handleSilenceCommands(message: string, corsHeaders: any) {
  if (message.toUpperCase() === "SILENCE ON") {
    setFrozen(true);
    const aiResponseText =
      "Oke, Kezi diem dulu ya. jngan lupa 'silence off' buat bangunin Kezi.";
    return new Response(JSON.stringify({ reply: aiResponseText }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } else if (message.toUpperCase() === "SILENCE OFF") {
    // Check if already awake
    if (getFrozenStatus()) {
      setFrozen(false);
      const aiResponseText = "Kezi dah bangun! Ada apa, Ren?";
      return new Response(JSON.stringify({ reply: aiResponseText }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      const aiResponseText = "Ren, Kezi masih bangun kok. Lu ngapain sih?";
      return new Response(JSON.stringify({ reply: aiResponseText }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }
  return null;
}

// Handle mode ngambek
export async function handleNgambekMode(
  message: string,
  existingHistory: any[],
  corsHeaders: any
) {
  const lowerCaseMessage = message.toLowerCase();
  const appeasementKeywords = promptsConfig.appeasement_keywords;
  const isAppeasing = appeasementKeywords.some((keyword: string) =>
    lowerCaseMessage.includes(keyword)
  );

  if (isAppeasing) {
    setNgambek(false); // Matikan mode ngambek
    console.log(
      `[${new Date().toISOString()}] 🟢 Ngambek mode: FALSE (Ren sudah bujuk)`
    );
    const appeasementPrompt = promptsConfig.ngambek_mode.appeased_response;
    const chatSession = textModel.startChat({
      history: [
        ...initialSeedHistory,
        ...existingHistory,
        { role: "user", parts: [{ text: message }] },
      ],
      generationConfig: {
        maxOutputTokens: 50,
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
      },
      safetySettings: [],
      systemInstruction: {
        role: "model",
        parts: [{ text: systemInstructionContent }],
      },
    });
    const result = await chatSession.sendMessage(appeasementPrompt);
    return result.response.text();
  } else {
    // Balas dengan jawaban pendek dan marah
    console.log(
      `[${new Date().toISOString()}] 🔴 Ngambek mode: TRUE (Ren belum bujuk)`
    );
    const ngambekPrompt = promptsConfig.ngambek_mode.angry_response;
    const chatSession = textModel.startChat({
      history: [
        ...initialSeedHistory,
        ...existingHistory,
        { role: "user", parts: [{ text: message }] },
      ],
      generationConfig: {
        maxOutputTokens: 10,
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
    const result = await chatSession.sendMessage(ngambekPrompt);
    return result.response.text();
  }
}

// Handle image processing
export async function handleImageProcessing(
  message: string,
  image: string,
  mimeType: string
) {
  console.log(`[${new Date().toISOString()}] Processing request with image...`);

  const imagePart = {
    inlineData: {
      mimeType: mimeType || "image/jpeg",
      data: image,
    },
  };

  const textPart = {
    text: message || "Menurut lu gmn sma ni gambar",
  };

  const result = await visionModel.generateContent({
    contents: [{ role: "user", parts: [textPart, imagePart] }],
    systemInstruction: {
      role: "model",
      parts: [{ text: systemInstructionContent }],
    },
    generationConfig: {
      maxOutputTokens: 500,
      temperature: 0.9,
      topP: 0.9,
      topK: 40,
    },
  });
  const response = await result.response;
  console.log(
    `[${new Date().toISOString()}] Vision model responded successfully.`
  );
  return response.text();
}

// Handle text processing
export async function handleTextProcessing(
  message: string,
  existingHistory: any[]
) {
  // Cek mode frozen (SILENCE ON)
  const currentFrozenStatus = getFrozenStatus();

  if (currentFrozenStatus) {
    console.log(
      `[${new Date().toISOString()}] 🔇 Frozen mode: TRUE (Kezi sedang diem)`
    );
    return ""; // Return empty string agar tidak ada response
  }

  // Cek mode ngambek
  const currentNgambekStatus = getNgambekStatus();

  if (currentNgambekStatus) {
    console.log(
      `[${new Date().toISOString()}] 🔴 Ngambek mode: TRUE (Processing ngambek response)`
    );
    return await handleNgambekMode(message, existingHistory, {});
  } else {
    console.log(
      `[${new Date().toISOString()}] 🟢 Ngambek mode: FALSE (Processing normal response)`
    );
  }

  // Kurangi context history untuk mencegah AI jadi unpredictable
  const limitedHistory = existingHistory.slice(-10); // Ambil hanya 10 pesan terakhir

  const chatSession = textModel.startChat({
    history: [...initialSeedHistory, ...limitedHistory],
    generationConfig: {
      maxOutputTokens: 50,
      temperature: 0.7, // Turunkan temperature untuk lebih konsisten
      topP: 0.8,
      topK: 30,
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
  console.log(
    `[${new Date().toISOString()}] Calling ${MODEL_NAME} with text only (via chat session)...`
  );
  const result = await chatSession.sendMessage(message);
  const response = await result.response;
  return response.text();
}
