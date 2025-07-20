
import path from "path";
import { readFileSync } from "fs";

// Ambil API Key Gemini dari environment variable
export const API_KEY = process.env.GEMINI_API_KEY;
export const SECRET_NAME = process.env.SECRET_NAME;
export const JWT_SECRET = process.env.JWT_SECRET || "your-default-secret";

// --- KONFIGURASI PATH FILE ---
export const systemPath =
  process.env.SYSTEM_INSTRUCTION_PATH ||
  path.join(process.cwd(), "src", "config", "keziInstruction.json");
export const seedHistoryPath =
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
export let systemInstructionContent: string;
export let initialSeedHistory: any[] = [];

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

// Get port from environment variable or use default
export const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// --- INISIALISASI DATABASE CONNECTION POOL (PG) ---
// Pastikan DATABASE_URL ini akan diambil dari Environment Variable di Render.com nanti
export const DATABASE_URL = process.env.DATABASE_URL; // Tidak perlu default fallback di sini, karena wajib ada di env

if (!DATABASE_URL) {
  console.error("Error: DATABASE_URL environment variable is not set.");
  console.error(
    "Please set DATABASE_URL in your .env file or Render.com dashboard."
  );
  process.exit(1);
}
