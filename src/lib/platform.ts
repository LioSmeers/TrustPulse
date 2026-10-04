// The web app uses ordinary browser APIs; the bundled iOS app installs this bridge.
export interface NativeBridge {
  request: (path: string, init: RequestInit) => Promise<Response>;
  copy: (text: string) => Promise<void>;
  share: (url: string) => Promise<void>;
  storage: { getItem: (key: string) => Promise<string | null>; setItem: (key: string, value: string) => Promise<void>; removeItem: (key: string) => Promise<void> };
}
declare global { interface Window { trustPulseNative?: NativeBridge } }
export function nativeBridge() { return typeof window === 'undefined' ? undefined : window.trustPulseNative; }
export function publicAppOrigin() {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  return configured ? new URL(configured).origin : typeof window !== 'undefined' ? window.location.origin : '';
}
export function apiRequest(path: string, init: RequestInit = {}) {
  return nativeBridge()?.request(path, init) ?? fetch(path, init);
}
export function copyText(text: string) { return nativeBridge()?.copy(text) ?? navigator.clipboard.writeText(text); }
