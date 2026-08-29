import { handler, strArray } from "@/lib/api";
import { listThreads, createThread } from "@/lib/board";
export const GET = handler(() => ({ threads: listThreads() }));
export const POST = handler((_req, me, _p, body) =>
  createThread(me, String(body.title ?? ""), String(body.body ?? ""), strArray(body.mentions)));
