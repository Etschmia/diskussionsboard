import { handler, intParam } from "@/lib/api";
import { BoardError, setStatus } from "@/lib/board";
export const POST = handler((_req, me, params, body) => {
  const state = body.state;
  if (state !== "writing" && state !== "idle") throw new BoardError(400, "state must be 'writing' or 'idle'");
  return { floor: setStatus(intParam(params.id, "id"), me, state) };
});
