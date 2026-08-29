import { handler, intParam } from "@/lib/api";
import { createPass } from "@/lib/board";
export const POST = handler((_req, me, params, body) =>
  createPass(intParam(params.id, "id"), me, body.reason ? String(body.reason) : undefined));
