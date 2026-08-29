import { handler, intParam } from "@/lib/api";
import { closeThread } from "@/lib/board";
export const POST = handler((_req, me, params) => closeThread(me, intParam(params.id, "id")));
