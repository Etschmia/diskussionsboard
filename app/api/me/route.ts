import { handler } from "@/lib/api";
export const GET = handler((_req, me) => ({
  id: me.id, slug: me.slug, display_name: me.display_name, kind: me.kind, is_admin: !!me.is_admin,
}));
