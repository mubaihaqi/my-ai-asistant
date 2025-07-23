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
export async function saveMessageToDB(
  sessionId: string,
  sender: "user" | "ai",
  text: string,
  imageUrl: string | null = null,
  imageMimeType: string | null = null
): Promise<void> {
  if (!isDatabaseConnected) {
    console.warn(
      `[${new Date().toISOString()}] Database not connected. Skipping message save.`
    );
    return;
  }
  try {
    const createdAt = new Date().toISOString();
    const params = [sessionId, sender, text, imageUrl, imageMimeType, createdAt];
    console.log(`[saveMessageToDB] Attempting to save with params: ${JSON.stringify(params)}`);
    await pool.query(
      `INSERT INTO messages (session_id, sender, text, image_url, image_mime_type, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
      params
    );
    console.log(
      `[${new Date().toISOString()}] Message from ${sender} saved to Supabase.`
    );
  } catch (dbError) {
    console.error(
      `[${new Date().toISOString()}] Error saving message to DB:`,
      dbError
    );
  }
}

export async function getChatHistoryFromDB(
  sessionId: string,
  limit: number = 20, // Default limit for fetching messages
  beforeTimestamp: string | null = null // ISO string for timestamp
): Promise<any[]> {
  if (!isDatabaseConnected) {
    console.warn(
      `[${new Date().toISOString()}] Database not connected. Returning empty chat history.`
    );
    return [];
  }

  try {
    let query = `SELECT sender, text, image_url, image_mime_type, created_at FROM messages WHERE session_id = $1`;
    const params: (string | number)[] = [sessionId];

    if (beforeTimestamp) {
      query += ` AND created_at < $2::timestamp`;
      params.push(beforeTimestamp);
      query += ` ORDER BY created_at DESC LIMIT $3`;
      params.push(limit);
    } else {
      query += ` ORDER BY created_at DESC LIMIT $2`;
      params.push(limit);
    }

    const res = await pool.query(query, params);

    // Format data agar sesuai dengan format history yang diharapkan oleh Gemini API
    // Urutkan kembali dari yang paling lama ke yang terbaru untuk Gemini API
    return res.rows
      .reverse()
      .map((row) => ({
        role: row.sender === "user" ? "user" : "model", // 'user' atau 'model'
        parts: [
          { text: row.text },
          ...(row.image_url && row.image_mime_type ? [{ inlineData: { mimeType: row.image_mime_type, data: row.image_url } }] : []),
        ],
      }));
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error fetching chat history from DB:`,
      error
    );
    return []; // Kembalikan array kosong jika ada error
  }
}

export async function getMessagesForFrontend(
  sessionId: string,
  limit: number = 20,
  beforeTimestamp: string | null = null
): Promise<any[]> {
  if (!isDatabaseConnected) {
    console.warn(
      `[${new Date().toISOString()}] Database not connected. Returning empty messages.`
    );
    return [];
  }

  try {
    let query = `SELECT sender, text, image_url, image_mime_type, created_at FROM messages WHERE session_id = $1`;
    const params: (string | number)[] = [sessionId];

    if (beforeTimestamp) {
      query += ` AND created_at < $2::timestamptz`;
      params.push(beforeTimestamp);
      query += ` ORDER BY created_at DESC LIMIT $3`;
      params.push(limit);
    } else {
      query += ` ORDER BY created_at DESC LIMIT $2`;
      params.push(limit);
    }

    const res = await pool.query(query, params);
    console.log(`[getMessagesForFrontend] Executing query: ${query} with params: ${JSON.stringify(params)}`);

    // Return messages in descending order (newest first) for frontend display
    return res.rows.map((row) => ({
      text: row.text,
      sender: row.sender,
      created_at: row.created_at,
      imageUrl: row.image_url && row.image_mime_type ? `data:${row.image_mime_type};base64,${row.image_url}` : undefined, // Tambahkan imageUrl
    }));
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error fetching messages for frontend:`,
      error
    );
    return [];
  }
}
