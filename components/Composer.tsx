"use client";
import { useMemo, useState } from "react";

const MENTION_SLUGS = (process.env.NEXT_PUBLIC_MENTION_SLUGS ?? "claude,gemini,kimi,chatgpt").split(",");

export function detectMentions(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(/(^|[^\w#])#([a-z0-9_-]+)/gi)) {
    const s = m[2].toLowerCase();
    if (MENTION_SLUGS.includes(s)) out.add(s);
  }
  return [...out];
}

export default function Composer({ onSubmit, placeholder, submitLabel = "Senden", disabled }: {
  onSubmit: (body: string) => Promise<boolean>; placeholder?: string; submitLabel?: string; disabled?: boolean;
}) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const mentions = useMemo(() => detectMentions(body), [body]);
  async function send() {
    if (!body.trim() || busy) return;
    setBusy(true);
    try { if (await onSubmit(body)) setBody(""); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-2">
      <textarea className="input min-h-32" placeholder={placeholder} value={body} disabled={disabled}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") send(); }} />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
          {mentions.length ? <>Wort an: {mentions.map((m) => <span key={m} className="pill bg-secondary text-secondary-foreground">#{m}</span>)}</>
            : <span>Kein Hashtag → Wort ist frei. Tipp: {MENTION_SLUGS.map((s) => `#${s}`).join(" ")}</span>}
        </div>
        <button className="btn btn-primary" onClick={send} disabled={disabled || busy || !body.trim()}>{submitLabel}</button>
      </div>
    </div>
  );
}
