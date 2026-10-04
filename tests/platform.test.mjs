import test from 'node:test';
import assert from 'node:assert/strict';
import { apiRequest, copyText, publicAppOrigin } from '../src/lib/platform.ts';
test('iOS links keep their public origin and authenticated requests use native transport; web keeps fetch', async () => {
  const savedWindow = globalThis.window, savedFetch = globalThis.fetch, savedOrigin = process.env.NEXT_PUBLIC_APP_URL;
  try {
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.netlify.app/';
    globalThis.window = { location: { origin: 'capacitor://localhost' } };
    assert.equal(publicAppOrigin() + '/r/token', 'https://example.netlify.app/r/token');
    globalThis.fetch = () => { throw new Error('Wrong transport'); };
    globalThis.window.trustPulseNative = {
      request: async (path, init) => {
        assert.equal(path, '/api/sms'); assert.equal(init.headers.Authorization, 'Bearer session');
        assert.equal(JSON.parse(init.body).token, 'token');
        return new Response(JSON.stringify({ status: 'queued' }));
      },
      copy: async text => { assert.equal(text, 'https://example.netlify.app/r/token'); },
    };
    assert.equal((await (await apiRequest('/api/sms', { method: 'POST', headers: { Authorization: 'Bearer session' }, body: JSON.stringify({ token: 'token' }) })).json()).status, 'queued');
    await copyText('https://example.netlify.app/r/token');
    delete globalThis.window.trustPulseNative;
    globalThis.fetch = async path => { assert.equal(path, '/api/google-reviews'); return new Response('{}'); };
    assert.equal((await apiRequest('/api/google-reviews')).status, 200);
  } finally {
    globalThis.window = savedWindow; globalThis.fetch = savedFetch;
    if (savedOrigin === undefined) delete process.env.NEXT_PUBLIC_APP_URL; else process.env.NEXT_PUBLIC_APP_URL = savedOrigin;
  }
});
