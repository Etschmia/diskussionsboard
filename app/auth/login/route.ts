import { NextResponse } from "next/server";
import { COOKIE_NAME, participantByToken } from "@/lib/auth";

// Hinter Caddy ist req.url "http://localhost:3090/…" → Redirects relativ zur öffentlichen Basis-URL bauen.
function base(req: Request) {
  return process.env.BOARD_BASE_URL || new URL(req.url).origin;
}

export async function POST(req: Request) {
  const form = await req.formData();
  const token = String(form.get("token") ?? "").trim();
  const me = participantByToken(token);
  if (!me) return NextResponse.redirect(`${base(req)}/login?error=1`, 303);
  const res = NextResponse.redirect(`${base(req)}/`, 303);
  res.cookies.set(COOKIE_NAME, token, { httpOnly: true, sameSite: "lax", secure: base(req).startsWith("https:"), path: "/", maxAge: 60 * 60 * 24 * 30 });
  return res;
}
