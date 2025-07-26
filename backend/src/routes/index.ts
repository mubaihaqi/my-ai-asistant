import { handleAuth, handleVerifyToken } from "../auth";
import { handleChat, handleProactiveMessage } from "../gemini";
import { getMessagesForFrontend } from "../database";

// CORS headers untuk semua response
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Handle CORS preflight requests
export function handleCORS(request: Request): Response | null {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }
  return null;
}

// Route handler untuk semua API endpoints
export async function handleRoutes(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // Handle CORS
  const corsResponse = handleCORS(request);
  if (corsResponse) return corsResponse;

  try {
    switch (path) {
      case "/api/auth":
        return await handleAuth(request, corsHeaders);

      case "/api/verify-token":
        return await handleVerifyToken(request, corsHeaders);

      case "/api/chat":
        return await handleChat(request, corsHeaders);

      case "/api/chat-history":
        return await handleChatHistory(request, corsHeaders);

      case "/api/trigger-proactive":
        return await handleTriggerProactive(request, corsHeaders);

      default:
        return new Response(JSON.stringify({ error: "Not Found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error handling route ${path}:`,
      error
    );
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

// Handle chat history endpoint
async function handleChatHistory(
  request: Request,
  corsHeaders: any
): Promise<Response> {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit") || "20");
  const beforeTimestamp = url.searchParams.get("before");

  try {
    const messages = await getMessagesForFrontend(
      "single-user-session",
      limit,
      beforeTimestamp
    );
    return new Response(JSON.stringify(messages), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error fetching chat history:`,
      error
    );
    return new Response(
      JSON.stringify({ error: "Failed to fetch chat history" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

// Handle proactive message trigger
async function handleTriggerProactive(
  request: Request,
  corsHeaders: any
): Promise<Response> {
  try {
    const body = (await request.json()) as { idleCount: number };
    await handleProactiveMessage("single-user-session", body.idleCount);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error triggering proactive message:`,
      error
    );
    return new Response(
      JSON.stringify({ error: "Failed to trigger proactive message" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}
