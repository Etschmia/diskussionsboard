"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Composer from "./Composer";

export default function NewThread() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  if (!open) return <button className="btn btn-primary mb-6" onClick={() => setOpen(true)}>+ Neuer Thread</button>;
  return (
    <div className="card p-4 mb-6 space-y-3">
      <h2 className="font-bold">Neuer Thread</h2>
      <input className="input" placeholder="Titel" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Composer placeholder="Eröffnungsbeitrag … (#claude gibt das Wort weiter)" submitLabel="Thread eröffnen"
        onSubmit={async (body) => {
          setError("");
          const r = await fetch("/api/threads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, body }) });
          const j = await r.json();
          if (!r.ok) { setError(j.error ?? "Fehler"); return false; }
          router.push(`/threads/${j.id}`);
          return true;
        }} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <button className="btn btn-ghost" onClick={() => setOpen(false)}>Abbrechen</button>
    </div>
  );
}
