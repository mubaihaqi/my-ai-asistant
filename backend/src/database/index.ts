import { Pool, type PoolClient } from "pg";
import { DATABASE_URL } from "../config";

// Parse DATABASE_URL dan setup connection pool
const dbUrl = new URL(DATABASE_URL as string);

export const pool = new Pool({
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port) || 5432,
  database: dbUrl.pathname.slice(1),
  user: dbUrl.username,
  password: dbUrl.password,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10,
});

// Track status koneksi database
export let isDatabaseConnected = false;

// Test koneksi database
pool
  .connect()
  .then((client: PoolClient) => {
    console.log(
      `[${new Date().toISOString()}] Connected to PostgreSQL database (Supabase) via pg!`
    );
    isDatabaseConnected = true;
    client.release();
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

// Simpan pesan ke database
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
    const params = [
      sessionId,
      sender,
      text,
      imageUrl,
      imageMimeType,
      createdAt,
    ];
    await pool.query(
      `INSERT INTO messages (session_id, sender, text, image_url, image_mime_type, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
      params
    );
    console.log(
      `[${new Date().toISOString()}] Message saved: ${sender} -> "${text.substring(
        0,
        50
      )}${text.length > 50 ? "..." : ""}"`
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
  limit: number = 20,
  beforeTimestamp: string | null = null
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

    // Format data untuk Gemini API (dari lama ke baru)
    return res.rows.reverse().map((row) => ({
      role: row.sender === "user" ? "user" : "model",
      parts: [
        { text: row.text },
        ...(row.image_url && row.image_mime_type
          ? [
              {
                inlineData: {
                  mimeType: row.image_mime_type,
                  data: row.image_url,
                },
              },
            ]
          : []),
      ],
    }));
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error fetching chat history from DB:`,
      error
    );
    return [];
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

    // Return messages in descending order (newest first) for frontend display
    return res.rows.map((row) => ({
      text: row.text,
      sender: row.sender,
      created_at: row.created_at,
      imageUrl:
        row.image_url && row.image_mime_type
          ? `data:${row.image_mime_type};base64,${row.image_url}`
          : undefined, // Tambahkan imageUrl
    }));
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error fetching messages for frontend:`,
      error
    );
    return [];
  }
}
