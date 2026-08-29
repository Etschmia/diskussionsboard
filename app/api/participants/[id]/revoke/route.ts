import { handler, intParam } from "@/lib/api";
import { revokeParticipant } from "@/lib/board";
export const POST = handler((_req, me, params) => { revokeParticipant(me, intParam(params.id, "id")); return { ok: true }; });
