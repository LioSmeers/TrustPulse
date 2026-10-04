export interface PublicGoogleReview {
  id: string; author: string; authorUrl: string | null; stars: number;
  text: string; publishedAt: string; sourceUrl: string | null;
}
export interface GooglePlace {
  name: string; rating: number | null; total: number; mapsUrl: string | null;
  reviews: PublicGoogleReview[]; attributions: { name: string; url: string | null }[];
}
export function googlePlaceId(link: string): string | null {
  try {
    const url = new URL(link);
    if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      !['search.google.com', 'www.google.com', 'google.com', 'maps.google.com'].includes(url.hostname)) return null;
    const id = url.searchParams.get('placeid') || url.searchParams.get('query_place_id');
    return id && /^[A-Za-z0-9_-]{10,200}$/.test(id) ? id : null;
  } catch { return null; }
}
export function googleSourceUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password &&
      ['www.google.com', 'google.com', 'maps.google.com', 'maps.app.goo.gl'].includes(u.hostname) ? u.href : null;
  } catch { return null; }
}
export async function fetchGooglePlace(id: string, key: string, request: typeof fetch = fetch): Promise<GooglePlace> {
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(id)) throw new Error('Ongeldige Google Place ID.');
  const response = await request(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}?languageCode=nl`, {
    headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'displayName,rating,userRatingCount,googleMapsUri,reviews,attributions' },
    cache: 'no-store', signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    if (response.status === 403) throw new Error('Google weigert toegang. Controleer Places API, facturering en de beperkingen van de serversleutel.');
    if (response.status === 429) throw new Error('De Google-gebruikslimiet is bereikt. Probeer later opnieuw.');
    if (response.status === 404) throw new Error('Dit Google Bedrijfsprofiel is niet gevonden. Controleer de reviewlink.');
    throw new Error('Google-reviews konden niet worden opgehaald. Probeer later opnieuw.');
  }
  const p = await response.json();
  if (!p || typeof p !== 'object' || !p.displayName?.text || !Number.isInteger(p.userRatingCount ?? 0)) throw new Error('Google stuurde onvolledige bedrijfsgegevens.');
  return {
    name: String(p.displayName.text), rating: typeof p.rating === 'number' && p.rating >= 0 && p.rating <= 5 ? p.rating : null,
    total: Math.max(0, p.userRatingCount ?? 0), mapsUrl: googleSourceUrl(p.googleMapsUri),
    reviews: (Array.isArray(p.reviews) ? p.reviews : []).slice(0, 5).map((r: any, index: number) => ({
      id: String(r.name || index), author: String(r.authorAttribution?.displayName || 'Google-gebruiker'),
      authorUrl: googleSourceUrl(r.authorAttribution?.uri), stars: typeof r.rating === 'number' ? Math.max(0, Math.min(5, r.rating)) : 0,
      text: String(r.originalText?.text || r.text?.text || ''), publishedAt: String(r.publishTime || ''), sourceUrl: googleSourceUrl(r.googleMapsUri),
    })),
    attributions: (Array.isArray(p.attributions) ? p.attributions : []).map((a: any) => ({ name: String(a.provider || ''), url: googleSourceUrl(a.providerUri) })),
  };
}
