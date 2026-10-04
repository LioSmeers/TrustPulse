'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useStore } from './provider';
import { getSupabase } from '@/lib/supabase/client';
import { type GooglePlace } from '@/lib/google-places';
import { Google, Stars, formatDate } from './ui';
export function GoogleReviews({ compact = false }: { compact?: boolean }) {
  const { data } = useStore();
  const [setup, setSetup] = useState<{ configured: boolean; hasPlaceId: boolean } | null>(null);
  const [place, setPlace] = useState<GooglePlace | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(false);
  useEffect(() => {
    let active = true;
    setSetup(null); setPlace(null); setError('');
    async function check() {
      try {
        const { data: session } = await getSupabase().auth.getSession();
        if (!session.session) throw new Error('Log eerst in.');
        const r = await fetch('/api/google-reviews', { headers: { Authorization: `Bearer ${session.session.access_token}` }, cache: 'no-store' });
        const result = await r.json();
        if (!r.ok) throw new Error(result.error || 'De Google-koppeling is niet bereikbaar.');
        if (active) setSetup(result);
      } catch (e) { if (active) setError(e instanceof Error ? e.message : 'Google-koppeling controleren lukt niet.'); }
    }
    void check();
    return () => { active = false; };
  }, [data.business.id, data.business.googleReviewUrl]);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(false), 60000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  async function load() {
    if (busy || cooldown) return;
    setBusy(true); setError(''); setCooldown(true); setPlace(null);
    try {
      const { data: session } = await getSupabase().auth.getSession();
      if (!session.session) throw new Error('Log eerst in.');
      const r = await fetch('/api/google-reviews', { method: 'POST', headers: { Authorization: `Bearer ${session.session.access_token}` }, cache: 'no-store' });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error || 'Reviews ophalen lukt niet.');
      setPlace(result);
    } catch (e) { setError(e instanceof Error ? e.message : 'Google is tijdelijk niet bereikbaar.'); }
    finally { setBusy(false); }
  }
  return <section className="panel google-public-panel">
    <div className="section-heading"><h2>Google-reviews</h2><span className="google-source-brand"><Google size={24} />Google Maps</span></div>
    {!setup && !error && <p role="status">Koppeling controleren…</p>}
    {setup && !setup.configured && <p>Google Places moet nog worden geactiveerd. Je reviewlink stuurt klanten al naar Google; het ophalen van reviews vereist een aparte koppeling.</p>}
    {setup && !setup.hasPlaceId && <p>Sla een reviewlink met <code>placeid</code> op bij <Link className="text-link" href="/dashboard/settings">Instellingen</Link>.</p>}
    {setup?.configured && setup.hasPlaceId && <><p>Bekijk de actuele Google-rating en maximaal vijf door Google geselecteerde reviews.</p><button className="button secondary" disabled={busy || cooldown} onClick={() => void load()}>{busy ? 'Google ophalen…' : cooldown ? 'Opnieuw beschikbaar na één minuut' : 'Google-reviews ophalen'}</button></>}
    {error && <p role="alert">{error}</p>}
    {place && <>
      <h3>{place.name}</h3><div className="google-public-rating"><strong>{place.rating?.toFixed(1) ?? '—'} / 5</strong><Stars value={place.rating ?? 0} /><span>{place.total} beoordelingen op Google</span></div>
      {place.mapsUrl && <a className="text-link" href={place.mapsUrl} target="_blank" rel="noopener noreferrer">Bekijk alle beoordelingen op Google Maps</a>}
      {!compact && <div className="review-grid">{place.reviews.map(r => <article className="review-card" key={r.id}>
        <div className="review-top"><div><strong>{r.authorUrl ? <a href={r.authorUrl} target="_blank" rel="noopener noreferrer">{r.author}</a> : r.author}</strong><small>{Number.isFinite(Date.parse(r.publishedAt)) ? formatDate(r.publishedAt) : ''}</small></div><Google size={20} /></div>
        <Stars value={r.stars} /><p>{r.text || 'Beoordeling zonder tekst'}</p>
        {(r.sourceUrl || place.mapsUrl) && <a className="text-link" href={r.sourceUrl || place.mapsUrl!} target="_blank" rel="noopener noreferrer">Bekijk op Google Maps</a>
      }</article>)}</div>}
      <p>Google toont een selectie op relevantie. Het totaal en de gemiddelde rating komen rechtstreeks van Google; de selectie geeft geen volledige geschiedenis of sterrenverdeling.</p>
      {place.attributions.map((a,i) => <small key={i}>{a.url ? <a href={a.url} target="_blank" rel="noopener noreferrer">{a.name}</a> : a.name}</small>)}
    </>}
  </section>;
}
