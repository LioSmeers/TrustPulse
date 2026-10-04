import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { googlePlaceId, fetchGooglePlace } from '@/lib/google-places';
export const runtime = 'nodejs';
const attempts = new Map<string, number>();
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
async function workspace(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!token || !url || !key) return null;
  const client = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: auth, error } = await client.auth.getUser(token);
  if (error || !auth.user) return null;
  const result = await client.rpc('load_workspace');
  if (result.error || !result.data?.business?.id) return null;
  return result.data.business;
}
export async function GET(request: Request) {
  const b = await workspace(request);
  if (!b) return reply({ error: 'Log eerst in op je werkruimte.' }, 401);
  return reply({ configured: Boolean(process.env.GOOGLE_PLACES_API_KEY), hasPlaceId: Boolean(googlePlaceId(b.google_review_url || '')) });
}
export async function POST(request: Request) {
  const b = await workspace(request);
  if (!b) return reply({ error: 'Log eerst in op je werkruimte.' }, 401);
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return reply({ error: 'Google is nog niet geactiveerd. Voeg de Google Places-serversleutel toe aan Netlify.' }, 503);
  const id = googlePlaceId(b.google_review_url || '');
  if (!id) return reply({ error: 'Sla bij Instellingen een Google-reviewlink met placeid op. Een korte g.page-link bevat die ID niet.' }, 400);
  const now = Date.now();
  for (const [businessId, until] of attempts) if (until <= now) attempts.delete(businessId);
  if ((attempts.get(b.id) || 0) > now) return reply({ error: 'Wacht een minuut voordat je Google opnieuw ververst.' }, 429);
  attempts.set(b.id, now + 60000);
  try { return reply(await fetchGooglePlace(id, key)); }
  catch (error) { return reply({ error: error instanceof Error ? error.message : 'Google is tijdelijk niet bereikbaar.' }, 502); }
}
