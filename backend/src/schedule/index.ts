import cron from "node-cron";
import { handleProactiveMessage } from "../gemini";
import { activeWebSockets, sendWebSocketMessage } from "../websocket";

const WIB_TIMEZONE = "Asia/Jakarta";

function initializeScheduledJobs() {
  // Schedule for Good Morning message (7 AM WIB - for testing)
  cron.schedule(
    "0 6 * * *",
    async () => {
      console.log(
        `[${new Date().toISOString()}] Running scheduled job: Good Morning`
      );
      if (activeWebSockets.size > 0) {
        for (const sessionId of activeWebSockets.keys()) {
          console.log(`Sending Good Morning message to session: ${sessionId}`);
          await handleProactiveMessage(sessionId, 0, "good_morning");
        }
      }
    },
    {
      timezone: WIB_TIMEZONE,
    }
  );

  // Schedule for Deep Talk message (10 PM WIB)
  cron.schedule(
    "0 22 * * *",
    async () => {
      console.log(
        `[${new Date().toISOString()}] Running scheduled job: Deep Talk`
      );
      if (activeWebSockets.size > 0) {
        for (const sessionId of activeWebSockets.keys()) {
          console.log(`Sending Deep Talk message to session: ${sessionId}`);
          // Menggunakan handleProactiveMessage untuk menghasilkan pesan deep talk
          // Kita bisa menambahkan parameter khusus jika perlu membedakan jenis pesan
          await handleProactiveMessage(sessionId, 0, "deep_talk");
        }
      }
    },
    {
      timezone: WIB_TIMEZONE,
    }
  );

  console.log(
    `[${new Date().toISOString()}] Scheduled jobs initialized in ${WIB_TIMEZONE} timezone.`
  );
}

export { initializeScheduledJobs };
