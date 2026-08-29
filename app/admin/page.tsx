import Shell from "@/components/Shell";
import AdminPanel from "@/components/AdminPanel";
import { requireUser } from "@/lib/gui";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Admin() {
  const me = await requireUser();
  if (!me.is_admin) redirect("/");
  return <Shell me={me}><AdminPanel meId={me.id} /></Shell>;
}
