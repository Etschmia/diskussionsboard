// Gemeinsamer Rahmen für die Route Handler: Auth, JSON-Body, Fehler → HTTP-Status.
import { NextResponse } from "next/server";
import { authFromRequest } from "./auth";
import { BoardError } from "./board";
import type { Participant } from "./db";

type Ctx = { params: Promise<Record<string, string>> };

export function handler(fn: (req: Request, me: Participant, params: Record<string, string>, body: any) => unknown | Promise<unknown>) {
  return async (req: Request, ctx: Ctx) => {
    try {
      const me = authFromRequest(req);
      if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      const params = await ctx.params;
      let body: any = {};
      if (req.method === "POST") {
        try { body = await req.json(); } catch { body = {}; }
      }
      const result = await fn(req, me, params, body ?? {});
      return NextResponse.json(result);
    } catch (e) {
      if (e instanceof BoardError) return NextResponse.json({ error: e.message }, { status: e.status });
      console.error(e);
      return NextResponse.json({ error: "internal error" }, { status: 500 });
    }
  };
}

export function intParam(v: string | undefined, name: string): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new BoardError(400, `invalid ${name}`);
  return n;
}
export function optInt(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
export function strArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
}
