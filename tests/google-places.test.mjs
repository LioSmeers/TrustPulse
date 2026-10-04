import test from 'node:test';
import assert from 'node:assert/strict';
import { googlePlaceId, googleSourceUrl, fetchGooglePlace } from '../src/lib/google-places.ts';
const id = 'ChIJQU1shzrhwEcRu22D9cMTtSg';
test('Place ID is extracted only from HTTPS Google links, rejecting unsafe URLs and paths', () => {
  assert.equal(googlePlaceId(`https://search.google.com/local/writereview?placeid=${id}`), id);
  for (const url of [`https://evil.test/?placeid=${id}`, `http://google.com/?placeid=${id}`, `https://google.com.evil.test/?placeid=${id}`, `https://x@google.com/?placeid=${id}`, 'https://google.com/?placeid=../../secret', 'https://g.page/example/review']) assert.equal(googlePlaceId(url), null);
});
test('Public review links cannot become script or non-Google links', () => {
  assert.equal(googleSourceUrl('javascript:alert(1)'), null);
  assert.equal(googleSourceUrl('https://evil.test/review'), null);
  assert.equal(googleSourceUrl('https://www.google.com/maps/reviews'), 'https://www.google.com/maps/reviews');
});
test('Place requests use fixed Google endpoint, headers, timeout and no storage', async () => {
  const place = await fetchGooglePlace(id, 'test-secret', async (url, options) => {
    assert.ok(url.startsWith(`https://places.googleapis.com/v1/places/${id}?`));
    assert.ok(!url.includes('test-secret'));
    assert.equal(options.headers['X-Goog-Api-Key'], 'test-secret');
    assert.ok(options.headers['X-Goog-FieldMask'].includes('attributions'));
    assert.equal(options.cache, 'no-store');
    assert.ok(options.signal instanceof AbortSignal);
    return Response.json({ displayName: { text: 'Testzaak' }, rating: 4.6, userRatingCount: 120, reviews: Array.from({length: 7}, (_, i) => ({ name: String(i), rating: 5, authorAttribution: {displayName: 'Auteur', uri:'https://www.google.com/maps/contrib/123'}, originalText: {text:'Originele tekst'}, text:{text:'Vertaling'}, publishTime:'2026-10-04T00:00:00Z', googleMapsUri:'https://www.google.com/maps/reviews/123'})) });
  });
  assert.equal(place.total, 120); assert.equal(place.rating, 4.6);
  assert.equal(place.reviews.length, 5); assert.equal(place.reviews[0].text, 'Originele tekst');
  assert.equal(place.reviews[0].author, 'Auteur'); assert.ok(place.reviews[0].sourceUrl);
});
test('Google provider errors are translated without exposing response contents or credentials', async () => {
  for (const status of [403,404,429,500]) await assert.rejects(fetchGooglePlace(id, 'secret', async () => new Response('secret/internal', {status})), e => !e.message.includes('secret') && !e.message.includes('internal'));
});
test('Malformed Place IDs cannot cause external requests', async () => {
  let called = false;
  await assert.rejects(fetchGooglePlace('../private', 'secret', async () => {called=true; return Response.json({});}));
  assert.equal(called,false);
});
test('A place without reviews retains its actual aggregate and invalid payloads fail', async () => {
  const empty = await fetchGooglePlace(id, 'secret', async () => Response.json({displayName:{text:'Lege zaak'},userRatingCount:0}));
  assert.equal(empty.rating,null); assert.deepEqual(empty.reviews,[]);
  await assert.rejects(fetchGooglePlace(id,'secret',async()=>Response.json({displayName:{text:'Test'},userRatingCount:'120'})));
});
