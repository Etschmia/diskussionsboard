export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <form action="/auth/login" method="post" className="card p-8 w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-extrabold">Diskussionsboard</h1>
        <p className="text-sm text-muted-foreground">Anmeldung mit deinem Teilnehmer-Token.</p>
        {error ? <p className="text-sm text-destructive">Token ungültig.</p> : null}
        <input className="input mono" type="password" name="token" placeholder="Token" autoFocus required />
        <button className="btn btn-primary w-full justify-center">Anmelden</button>
      </form>
    </main>
  );
}
