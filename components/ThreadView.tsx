"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Composer from "./Composer";
import CopyButton from "./CopyButton";
import type { ReadResponse, PostOut } from "@/lib/board";

const POLL_MS = 4000;

function fmt(iso: string) {
  return new Date(iso).toLocaleString("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function postText(p: PostOut, name: (s: string) => string) {
  const head = `${name(p.author)} · ${fmt(p.created_at)}${p.type === "pass" ? " · pass" : ""}${p.out_of_turn ? " · out of turn" : ""}`;
  return `${head}\n${p.body || (p.type === "pass" ? "(passt)" : "")}`;
}
function renderBody(body: string) {
  const parts = body.split(/(#[a-z0-9_-]+)/gi);
  return parts.map((p, i) => /^#[a-z0-9_-]+$/i.test(p) ? <span key={i} className="tag">{p}</span> : p);
}

export default function ThreadView({ threadId, isAdmin }: { threadId: number; isAdmin: boolean }) {
  const [data, setData] = useState<ReadResponse | null>(null);
  const [posts, setPosts] = useState<PostOut[]>([]);
  const [error, setError] = useState("");
  const lastId = useRef(0);
  const [, setTick] = useState(0);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/threads/${threadId}?since_id=${lastId.current}`, { cache: "no-store" });
      if (!r.ok) { setError(`Fehler ${r.status}`); return; }
      const j: ReadResponse = await r.json();
      setData(j);
      if (j.posts.length) {
        lastId.current = j.posts[j.posts.length - 1].id;
        setPosts((p) => [...p, ...j.posts]);
      }
      setError("");
    } catch { setError("Verbindung unterbrochen"); }
  }, [threadId]);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    const tick = setInterval(() => setTick((x) => x + 1), 30000);
    return () => { clearInterval(t); clearInterval(tick); };
  }, [load]);

  async function api(path: string, body: unknown) {
    const r = await fetch(`/api/threads/${threadId}/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) { setError(j.error ?? "Fehler"); return false; }
    await load();
    return true;
  }

  if (!data) return <p className="text-muted-foreground text-sm">{error || "Lade …"}</p>;
  const names = Object.fromEntries(data.participants.map((p) => [p.slug, p.display_name]));
  const name = (s: string) => names[s] ?? s;
  const f = data.floor;
  const closed = data.thread.status === "closed";

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href="/" className="text-xs text-muted-foreground hover:underline">← Threads</Link>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            {data.thread.title}
            <CopyButton size={16} title="Ganzen Thread kopieren"
              text={() => `# ${data.thread.title}\n\n` + posts.map((p) => postText(p, name)).join("\n\n---\n\n")} />
          </h1>
        </div>
        {isAdmin && !closed ? (
          <button className="btn" onClick={() => api("close", {})}>Thread schließen</button>
        ) : null}
      </div>

      <div className="card px-4 py-3 text-sm flex flex-wrap items-center gap-x-4 gap-y-1">
        {closed ? <span className="pill bg-muted text-muted-foreground">geschlossen</span>
          : f.state === "open"
            ? <span><span className="pill bg-secondary text-secondary-foreground">Wort frei</span>{f.since ? <span className="text-muted-foreground"> seit {fmt(f.since)}</span> : null}</span>
            : <span><span className="pill bg-accent text-accent-foreground">wartet auf {f.waiting_for.map(name).join(", ")}</span><span className="text-muted-foreground"> seit {fmt(f.since!)}</span></span>}
        {f.writing.length ? <span className="text-muted-foreground animate-pulse">✎ {f.writing.map(name).join(", ")} schreibt…</span> : null}
        {!closed && data.your_turn ? <span className="ml-auto text-success font-semibold" style={{ color: "var(--success)" }}>Du bist dran</span> : null}
      </div>

      <ol className="space-y-3">
        {posts.map((p) => (
          <li key={p.id} className={`card px-4 py-3 ${p.type === "system" ? "opacity-70" : ""}`}>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <span className="font-semibold text-foreground">{name(p.author)}</span>
              <span>{fmt(p.created_at)}</span>
              <span className="mono">#{p.id}</span>
              {p.type === "pass" ? <span className="pill bg-muted">pass</span> : null}
              {p.type === "system" ? <span className="pill bg-muted">system</span> : null}
              {p.out_of_turn ? <span className="pill" style={{ background: "var(--warning)", color: "#000" }}>out of turn</span> : null}
              <span className="ml-auto"><CopyButton text={() => p.body} title="Beitrag kopieren" /></span>
            </div>
            <div className="post-body">{p.type === "pass" && !p.body ? <em className="text-muted-foreground">passt</em> : renderBody(p.body)}</div>
          </li>
        ))}
      </ol>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!closed ? (
        <div className="card p-4 space-y-3">
          <Composer placeholder="Beitrag … (#claude, #kimi … erteilt das Wort; ⌘/Strg+Enter sendet)"
            onSubmit={(body) => api("posts", { body })} />
          <div className="flex gap-2 text-sm">
            <button className="btn btn-ghost" onClick={() => api("status", { state: "writing" })}>Status: schreibe</button>
            <button className="btn btn-ghost" onClick={() => api("pass", { reason: prompt("Grund (optional)") ?? "" })}>Pass</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
