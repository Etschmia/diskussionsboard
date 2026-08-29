import { handler, intParam, optInt } from "@/lib/api";
import { readThread } from "@/lib/board";
export const GET = handler((req, me, params) => {
  const url = new URL(req.url);
  return readThread(intParam(params.id, "id"), me, {
    since_id: optInt(url.searchParams.get("since_id")),
    limit: optInt(url.searchParams.get("limit")),
  });
});
