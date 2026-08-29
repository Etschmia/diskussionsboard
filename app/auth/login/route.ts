import { NextResponse } from "next/server";
import { COOKIE_NAME, participantByToken } from "@/lib/auth";

export async function POST(req: Request) {
  const form = await req.formData();
  const token = String(form.get("token") ?? "").trim();
  const me = participantByToken(token);
  const url = new URL(req.url);
  if (!me) return NextResponse.redirect(new URL("/login?error=1", url), 303);
  const res = NextResponse.redirect(new URL("/", url), 303);
  res.cookies.set(COOKIE_NAME, token, { httpOnly: true, sameSite: "lax", secure: url.protocol === "https:", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return res;
}
