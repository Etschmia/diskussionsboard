import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";
export async function POST(req: Request) {
  const base = process.env.BOARD_BASE_URL || new URL(req.url).origin;
  const res = NextResponse.redirect(`${base}/login`, 303);
  res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}
