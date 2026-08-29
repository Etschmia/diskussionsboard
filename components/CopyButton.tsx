"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function CopyButton({ text, title = "Kopieren", size = 14 }: { text: () => string; title?: string; size?: number }) {
  const [done, setDone] = useState(false);
  async function copy() {
    const value = text();
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
      else {
        const ta = document.createElement("textarea");
        ta.value = value; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
      }
      setDone(true); setTimeout(() => setDone(false), 1500);
    } catch { /* clipboard unavailable */ }
  }
  return (
    <button type="button" onClick={copy} title={done ? "Kopiert" : title} aria-label={title}
      className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
      {done ? <Check size={size} /> : <Copy size={size} />}
      {done ? <span className="text-xs">Kopiert</span> : null}
    </button>
  );
}
