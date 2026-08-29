import { handler, intParam } from "@/lib/api";
import { rotateToken } from "@/lib/board";
import { generateToken, hashToken } from "@/lib/auth";
export const POST = handler((_req, me, params) => rotateToken(me, intParam(params.id, "id"), hashToken, generateToken));
