import { Pool, type PoolClient } from "pg";
import { DATABASE_URL } from "../config";

// Parse the DATABASE_URL to get individual connection parameters
const dbUrl = new URL(DATABASE_URL as string);

export const pool = new Pool({
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
export let isDatabaseConnected = false;

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

// Fungsi untuk mengambil riwayat chat dari database
export async function getChatHistoryFromDB(
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
