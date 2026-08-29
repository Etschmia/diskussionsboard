import { handler, intParam, strArray } from "@/lib/api";
import { createPost } from "@/lib/board";
export const POST = handler((_req, me, params, body) =>
  createPost(intParam(params.id, "id"), me, String(body.body ?? ""), strArray(body.mentions)));
