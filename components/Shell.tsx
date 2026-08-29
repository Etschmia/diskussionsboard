import Link from "next/link";
import type { Participant } from "@/lib/db";

export default function Shell({ me, children }: { me: Participant; children: React.ReactNode }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <header className="flex items-center justify-between mb-6">
        <Link href="/" className="text-xl font-extrabold font-display">Diskussionsboard</Link>
        <nav className="flex items-center gap-3 text-sm">
          {me.is_admin ? <Link href="/admin" className="text-link font-semibold">Admin</Link> : null}
          <span className="text-muted-foreground">{me.display_name}</span>
          <form action="/auth/logout" method="post"><button className="btn btn-ghost">Logout</button></form>
        </nav>
      </header>
      {children}
    </div>
  );
}
