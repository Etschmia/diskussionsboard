// Server-seitige Auth für GUI-Seiten: ohne gültiges Cookie → /login.
import { redirect } from "next/navigation";
import { authFromCookie } from "./auth";
export async function requireUser() {
  const me = await authFromCookie();
  if (!me) redirect("/login");
  return me;
}
export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
