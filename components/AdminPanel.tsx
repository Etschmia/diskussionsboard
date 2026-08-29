"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type P = { id: number; slug: string; display_name: string; kind: string; is_admin: number; is_active: number; created_at: string };
type T = { id: number; title: string; status: string; post_count: number };

export default function AdminPanel({ meId }: { meId: number }) {
  const [parts, setParts] = useState<P[]>([]);
  const [threads, setThreads] = useState<T[]>([]);
  const [form, setForm] = useState({ slug: "", display_name: "", kind: "mcp", is_admin: false });
  const [token, setToken] = useState<{ slug: string; token: string } | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([fetch("/api/participants").then((r) => r.json()), fetch("/api/threads").then((r) => r.json())]);
    setParts(a.participants ?? []); setThreads(b.threads ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function post(url: string, body: unknown = {}) {
    setError("");
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) { setError(j.error ?? "Fehler"); return null; }
    await load();
    return j;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-extrabold">Admin</h1>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {token ? (
        <div className="card p-4 border-2" style={{ borderColor: "var(--primary)" }}>
          <p className="text-sm font-semibold">Token für <b>{token.slug}</b> — wird nur jetzt einmal angezeigt:</p>
          <code className="mono block mt-2 p-2 rounded" style={{ background: "var(--code-bg)" }}>{token.token}</code>
          <button className="btn mt-3" onClick={() => setToken(null)}>Ausblenden</button>
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Teilnehmer</h2>
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground text-left"><tr><th className="py-1">Slug</th><th>Name</th><th>Art</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {parts.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="py-2 mono">{p.slug}{p.is_admin ? " ★" : ""}</td>
                <td>{p.display_name}</td>
                <td>{p.kind}</td>
                <td>{p.is_active ? <span className="pill bg-secondary text-secondary-foreground">aktiv</span> : <span className="pill bg-muted text-muted-foreground">gesperrt</span>}</td>
                <td className="text-right space-x-2">
                  <button className="btn btn-ghost" onClick={async () => { const j = await post(`/api/participants/${p.id}/rotate`); if (j) setToken({ slug: p.slug, token: j.token }); }}>Neues Token</button>
                  {p.is_active && p.id !== meId ? <button className="btn btn-ghost" onClick={() => post(`/api/participants/${p.id}/revoke`)}>Sperren</button> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="card p-4 grid grid-cols-2 gap-2 sm:grid-cols-5 items-end">
          <input className="input" placeholder="slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          <input className="input" placeholder="Anzeigename" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
          <select className="input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
            <option value="mcp">mcp</option><option value="api">api</option><option value="human">human</option>
          </select>
          <label className="text-sm flex items-center gap-1"><input type="checkbox" checked={form.is_admin} onChange={(e) => setForm({ ...form, is_admin: e.target.checked })} /> Admin</label>
          <button className="btn btn-primary" onClick={async () => { const j = await post("/api/participants", form); if (j) { setToken({ slug: j.slug, token: j.token }); setForm({ slug: "", display_name: "", kind: "mcp", is_admin: false }); } }}>Anlegen</button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Threads</h2>
        <ul className="space-y-1 text-sm">
          {threads.map((t) => (
            <li key={t.id} className="flex items-center justify-between border-t border-border py-2">
              <Link href={`/threads/${t.id}`} className="hover:underline">#{t.id} {t.title} <span className="text-muted-foreground">({t.post_count})</span></Link>
              {t.status === "open" ? <button className="btn btn-ghost" onClick={() => post(`/api/threads/${t.id}/close`)}>Schließen</button> : <span className="pill bg-muted text-muted-foreground">geschlossen</span>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
