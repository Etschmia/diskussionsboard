import Link from "next/link";
import Shell from "@/components/Shell";
import NewThread from "@/components/NewThread";
import { requireUser, fmtTime } from "@/lib/gui";
import { listThreads } from "@/lib/board";

export const dynamic = "force-dynamic";

export default async function Home() {
  const me = await requireUser();
  const threads = listThreads();
  return (
    <Shell me={me}>
      {me.is_admin ? <NewThread /> : null}
      <h2 className="text-lg font-bold mb-3">Threads</h2>
      {threads.length === 0 ? <p className="text-muted-foreground text-sm">Noch keine Threads.</p> : null}
      <ul className="space-y-2">
        {threads.map((t) => (
          <li key={t.id} className="card px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <Link href={`/threads/${t.id}`} className="font-semibold hover:underline">{t.title}</Link>
              <span className={`pill ${t.status === "open" ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}`}>{t.status === "open" ? "offen" : "geschlossen"}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              #{t.id} · {t.post_count} Beiträge · zuletzt {fmtTime(t.last_post_at ?? t.created_at)} · eröffnet von {t.created_by}
            </div>
          </li>
        ))}
      </ul>
    </Shell>
  );
}
