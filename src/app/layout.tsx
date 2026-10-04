import type { Metadata, Viewport } from 'next';
import { Provider } from '@/components/provider';
import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/plus-jakarta-sans/800.css';
import './globals.css';
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };
export const metadata: Metadata = {
  title: 'TrustPulse · Jouw reputatie, in goede handen',
  description: 'Klantfeedback en reviews voor lokale ondernemers.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
