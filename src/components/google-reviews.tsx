'use client';
import { apiRequest } from '@/lib/platform';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useStore } from './provider';
import { getSupabase } from '@/lib/supabase/client';
import { type GooglePlace } from '@/lib/google-places';
import { Google, Stars } from './ui';
export function GoogleReviews(_props: { compact?: boolean }) {
  const { data } = useStore();
  const [setup, setSetup] = useState<{ configured: boolean; hasPlaceId: boolean } | null>(null);
  const [place, setPlace] = useState<GooglePlace | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    let loading = false;
    const controller = new AbortController();
    setSetup(null); setPlace(null); setError('');
    async function refresh() {
      if (!active || loading || document.visibilityState === 'hidden') return;
      loading = true;
      setBusy(true); setError('');
      try {
        const { data: session } = await getSupabase().auth.getSession();
        if (!session.session) throw new Error('Log eerst in.');
        const options = { headers: { Authorization: `Bearer ${session.session.access_token}` }, cache: 'no-store' as const, signal: controller.signal };
        const check = await apiRequest('/api/google-reviews', options);
        const configuration = await check.json();
        if (!check.ok) throw new Error(configuration.error || 'De Google-koppeling is niet bereikbaar.');
        if (!active) return;
        setSetup(configuration);
        if (!configuration.configured || !configuration.hasPlaceId) return;
        const response = await apiRequest('/api/google-reviews', { ...options, method: 'POST' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Google-score ophalen lukt niet.');
        if (active) setPlace(result);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Google is tijdelijk niet bereikbaar.');
      } finally {
        loading = false;
        if (active) setBusy(false);
      }
    }
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('trustpulse:resume', onVisible);
    void refresh();
    return () => {
      active = false;
      controller.abort();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('trustpulse:resume', onVisible);
    };
  }, [data.business.id, data.business.googleReviewUrl]);
  return <section className="panel google-public-panel">
    <div className="section-heading"><h2>Google-score</h2><span className="google-source-brand"><Google size={24} />Google Maps</span></div>
    {!setup && !error && <p role="status">Koppeling controleren…</p>}
    {setup && !setup.configured && <p>De Google-koppeling is nog niet ingesteld.</p>}
    {setup && !setup.hasPlaceId && <p>Sla een reviewlink met <code>placeid</code> op bij <Link className="text-link" href="/dashboard/settings">Instellingen</Link>.</p>}
    {busy && setup?.configured && setup.hasPlaceId && !place && <p role="status">Google-score laden…</p>}
    {error && <p role="alert">{error}</p>}
    {place && <>
      <div className="google-public-rating"><strong>{place.rating?.toFixed(1) ?? '—'} / 5</strong><Stars value={place.rating ?? 0} /></div>
      {place.attributions.map((a,i) => <small key={i}>{a.url ? <a href={a.url} target="_blank" rel="noopener noreferrer">{a.name}</a> : a.name}</small>)}
    </>}
  </section>;
}
