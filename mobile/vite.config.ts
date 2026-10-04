import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
const path = (p: string) => fileURLToPath(new URL(p, import.meta.url));
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react(), tailwind()], publicDir: '../public',
    resolve: { dedupe: ['react', 'react-dom', '@supabase/supabase-js', 'lucide-react', '@fontsource/plus-jakarta-sans'], alias: {
      'next/link': path('./src/shims/link.tsx'),
      'next/navigation': path('./src/shims/navigation.tsx'),
      '@': path('../src'),
    } },
    define: {
      'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || 'https://dobyjtkoignsryztpqxo.supabase.co'),
      'process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable__4XVunXl9B4-eewbsHGlyg_-gOkQKfj'),
      'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': 'undefined',
      'process.env.NEXT_PUBLIC_APP_URL': JSON.stringify(env.VITE_APP_URL || 'https://creative-tapioca-55b527.netlify.app'),
    },
    build: { outDir: 'dist', sourcemap: false },
  };
});
