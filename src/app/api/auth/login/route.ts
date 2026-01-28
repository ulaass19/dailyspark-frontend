import { NextRequest, NextResponse } from "next/server";

/**
 * ✅ Notification Backend (PROD)
 */
const BACKEND_BASE = "https://notification-backend-d1ol.onrender.com";

export const dynamic = "force-dynamic";

function normalizeBase(base: string) {
  const clean = (base || "").trim().replace(/\/+$/, "");
  // yanlışlıkla /api verilirse kırp (backend endpointlerin /auth/login)
  return clean.endsWith("/api") ? clean.slice(0, -4) : clean;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const base = normalizeBase(BACKEND_BASE);

    const upstreamRes = await fetch(`${base}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const text = await upstreamRes.text();
    let data: unknown = null;

    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    return NextResponse.json(data, { status: upstreamRes.status });
  } catch (err) {
    console.error("Login proxy error:", err);
    return NextResponse.json(
      { message: "Sunucuya bağlanırken bir hata oluştu." },
      { status: 500 }
    );
  }
}
