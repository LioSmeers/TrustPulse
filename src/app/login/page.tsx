'use client';
import { publicAppOrigin } from '@/lib/platform';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';
import { useStore } from '@/components/provider';

export default function Login() {
  const { user, authReady, online } = useStore();
  const router = useRouter();
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [business, setBusiness] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (authReady && (!online || user)) router.replace('/dashboard');
  }, [authReady, online, user, router]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const client = getSupabase();
      const result = register
        ? await client.auth.signUp({
            email: email.trim(),
            password,
            options: {
              emailRedirectTo: `${publicAppOrigin()}/login`,
              data: { name: name.trim(), business_name: business.trim() },
            },
          })
        : await client.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) {
        const code = result.error.code;
        setError(
          code === 'invalid_credentials'
            ? 'E-mail of wachtwoord klopt niet. Gebruik je TrustPulse-account.'
            : code === 'email_not_confirmed'
              ? 'Bevestig eerst je e-mailadres via de ontvangen e-mail.'
              : code === 'over_email_send_rate_limit'
                ? 'Er zijn te veel e-mails aangevraagd. Probeer het later opnieuw.'
                : 'Inloggen of registreren lukt niet. Controleer je gegevens en probeer opnieuw.',
        );
        return;
      }
      if (result.data.session) router.replace('/dashboard');
      else {
        setNotice('Controleer je e-mail om je account te bevestigen. Daarna kun je inloggen.');
        setRegister(false);
        setPassword('');
      }
    } catch {
      setError('Supabase is niet bereikbaar. Probeer het opnieuw.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <section className="panel auth-card">
        <p className="eyebrow">TRUSTPULSE</p>
        <h1>{register ? 'Maak je werkruimte' : 'Welkom terug'}</h1>
        <p className="auth-intro">
          {register
            ? 'Een eigen account voor je zaak, klanten en feedback.'
            : 'Log in op het dashboard van je zaak.'}
        </p>
        <form onSubmit={submit}>
          {register && (
            <>
              <label>
                Je naam
                <input
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={100}
                />
              </label>
              <label>
                Naam van je zaak
                <input
                  autoComplete="organization"
                  value={business}
                  onChange={(e) => setBusiness(e.target.value)}
                  required
                  maxLength={100}
                />
              </label>
            </>
          )}
          <label>
            E-mailadres
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={254}
            />
          </label>
          <label>
            Wachtwoord
            <input
              type="password"
              autoComplete={register ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={register ? 8 : undefined}
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="save-success" role="status">
              {notice}
            </p>
          )}
          <button className="button primary full" disabled={busy || !authReady || !online}>
            {busy ? 'Even wachten…' : register ? 'Account aanmaken' : 'Inloggen'}
          </button>
        </form>
        <button
          className="text-link auth-switch"
          onClick={() => {
            setRegister(!register);
            setError('');
            setNotice('');
          }}
        >
          {register
            ? 'Heb je al een account? Log in'
            : 'Nog geen TrustPulse-account? Maak je werkruimte'}
        </button>
        <p className="auth-note">
          Je TrustPulse-account staat los van het account waarmee je Supabase beheert.
        </p>
      </section>
    </main>
  );
}
