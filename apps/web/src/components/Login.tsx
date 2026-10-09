import { useState, type FormEvent } from 'react';
import { api } from '../api';

export function Login({ onDone }: { onDone: () => void }) {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.login(token.trim());
      setToken('');
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login">
      <form className="card login-card" onSubmit={submit}>
        <img src="/icon.svg" alt="" width={56} height={56} />
        <h1>Life Dashboard</h1>
        <p className="muted">Lim inn tilgangsnøkkelen din (DASHBOARD_TOKEN fra .env).</p>
        <label className="sr-only" htmlFor="token">Tilgangsnøkkel</label>
        <input
          id="token" type="password" autoComplete="current-password" value={token}
          onChange={(e) => setToken(e.target.value)} placeholder="Tilgangsnøkkel" required
        />
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn primary" disabled={busy || !token}>{busy ? 'Logger inn …' : 'Logg inn'}</button>
        <p className="muted small">Nøkkelen byttes mot en sikker cookie og lagres ikke i nettleseren.</p>
      </form>
    </main>
  );
}
