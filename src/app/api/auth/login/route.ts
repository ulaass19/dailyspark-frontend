import { NextRequest, NextResponse } from "next/server";

const BACKEND_BASE =
  process.env.NEXT_PUBLIC_BACKEND_BASE || "http://localhost:3000";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const upstreamRes = await fetch(`${BACKEND_BASE}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await upstreamRes.text();
    let data: unknown = null;

    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    return new NextResponse(JSON.stringify(data), {
      status: upstreamRes.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Login proxy error:", err);
    return NextResponse.json(
      { message: "Sunucuya bağlanırken bir hata oluştu." },
      { status: 500 },
    );
  }
}
