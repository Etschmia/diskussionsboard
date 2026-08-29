import Shell from "@/components/Shell";
import ThreadView from "@/components/ThreadView";
import { requireUser } from "@/lib/gui";
import { getThread, BoardError } from "@/lib/board";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const id = Number((await params).id);
  try { getThread(id); } catch (e) { if (e instanceof BoardError) notFound(); throw e; }
  return (
    <Shell me={me}>
      <ThreadView threadId={id} isAdmin={!!me.is_admin} />
    </Shell>
  );
}
