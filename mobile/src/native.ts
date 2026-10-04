import { Capacitor, CapacitorHttp, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Share } from '@capacitor/share';
import { Clipboard } from '@capacitor/clipboard';
import { Browser } from '@capacitor/browser';
import { publicAppOrigin } from '@/lib/platform';
interface Keychain { get(options: { key: string }): Promise<{ value: string | null }>; set(options: { key: string; value: string }): Promise<void>; remove(options: { key: string }): Promise<void> }
const keychain = registerPlugin<Keychain>('TrustPulseKeychain');
export async function prepareNative() {
  if (!Capacitor.isNativePlatform()) return;
  window.trustPulseNative = {
    storage: {
      getItem: async key => (await keychain.get({ key })).value,
      setItem: (key, value) => keychain.set({ key, value }),
      removeItem: key => keychain.remove({ key }),
    },
    copy: async text => { await Clipboard.write({ string: text }); },
    share: async url => { await Share.share({ title: 'Reviewverzoek', url, dialogTitle: 'Deel klantlink' }); },
    request: async (path, init) => {
      if (!/^\/api\/(sms|google-reviews)$/.test(path)) throw new Error('Onbekende serverroute.');
      if (init.signal?.aborted) throw new DOMException('Request canceled', 'AbortError');
      const headers = Object.fromEntries(new Headers(init.headers).entries());
      const response = await CapacitorHttp.request({
        url: publicAppOrigin() + path, method: init.method || 'GET', headers,
        ...(init.body ? { data: JSON.parse(String(init.body)) } : {}),
        responseType: 'json', connectTimeout: 15000, readTimeout: 30000,
      });
      if (init.signal?.aborted) throw new DOMException('Request canceled', 'AbortError');
      return new Response(JSON.stringify(response.data), { status: response.status, headers: { 'Content-Type': 'application/json' } });
    },
  };
  await App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) { window.dispatchEvent(new Event('focus')); window.dispatchEvent(new Event('trustpulse:resume')); }
  });
  document.addEventListener('click', event => {
    const link = (event.target as Element).closest?.('a');
    if (!link || event.defaultPrevented || !/^https?:/.test(link.href)) return;
    event.preventDefault(); void Browser.open({ url: link.href });
  });
}
