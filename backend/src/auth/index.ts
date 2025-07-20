import jwt from "jsonwebtoken";
import { SECRET_NAME, JWT_SECRET } from "../config";

export async function handleAuth(request: Request, corsHeaders: any) {
  try {
    const { name } = (await request.json()) as { name: string };

    if (
      name &&
      name.trim().toLowerCase() === (SECRET_NAME || "").toLowerCase()
    ) {
      const token = jwt.sign({ name }, JWT_SECRET, { expiresIn: "1h" });
      return new Response(JSON.stringify({ success: true, token }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ success: false }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

export async function handleVerifyToken(request: Request, corsHeaders: any) {
  try {
    const { token } = (await request.json()) as { token: string };
    if (!token) {
      return new Response(JSON.stringify({ valid: false }), { status: 400 });
    }

    jwt.verify(token, JWT_SECRET);
    return new Response(JSON.stringify({ valid: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("JWT verification failed:", error);
    return new Response(JSON.stringify({ valid: false }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

export function verifyToken(request: Request) {
  const token = request.headers.get("Authorization")?.split(" ")[1];
  if (!token) {
    return {
      authorized: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Access-Control-Allow-Origin": "*" },
      }),
    };
  }

  try {
    jwt.verify(token, JWT_SECRET);
    return { authorized: true };
  } catch (error) {
    return {
      authorized: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Access-Control-Allow-Origin": "*" },
      }),
    };
  }
}
