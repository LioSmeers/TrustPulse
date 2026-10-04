'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { initialStore } from '@/lib/mock-data';
import type { Store } from '@/lib/types';
import { mockRepository } from '@/lib/services/repository';
import { getSupabase, supabaseConfigured } from '@/lib/supabase/client';
import { emptyStore } from '@/lib/supabase/data';
import { loadWorkspace, saveWorkspace, publicInvitation } from '@/lib/services/supabase-repository';

const Context = createContext<{
  data: Store;
  ready: boolean;
  online: boolean;
  user: User | null;
  authReady: boolean;
  error: string;
  saving: boolean;
  refresh: () => Promise<void>;
  update: (fn: (data: Store) => Store) => Promise<void>;
  respond: (action: string, stars?: number, message?: string, contact?: boolean) => Promise<Store>;
}>({
  data: emptyStore,
  ready: false,
  online: false,
  user: null,
  authReady: false,
  error: '',
  saving: false,
  refresh: async () => {},
  update: async () => {},
  respond: async () => emptyStore,
});

export function Provider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const token = pathname.startsWith('/r/') ? decodeURIComponent(pathname.slice(3)) : '';
  const online = supabaseConfigured;
  const [data, setData] = useState(online ? emptyStore : initialStore);
  const dataRef = useRef(data);
  const scope = `${pathname}:${online}`;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const [loadedScope, setLoadedScope] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!online);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const writing = useRef(false);
  const generation = useRef(0);
  const assign = useCallback((next: Store) => {
    dataRef.current = next;
    setData(next);
  }, []);

  useEffect(() => {
    if (!online) return;
    let active = true;
    const client = getSupabase();
    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setAuthReady(true);
      if (!session) {
        assign(emptyStore);
        setLoadedScope('');
      }
    });
    client.auth
      .getUser()
      .then(({ data: result, error: authError }) => {
        if (!active) return;
        if (!authError) setUser(result.user);
        setAuthReady(true);
      })
      .catch(() => {
        if (active) setAuthReady(true);
      });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [online, assign]);

  const refresh = useCallback(async () => {
    if (writing.current) return;
    const currentScope = scopeRef.current;
    const version = ++generation.current;
    setError('');
    try {
      const next = !online
        ? mockRepository.load()
        : token
          ? await publicInvitation(token)
          : user
            ? await loadWorkspace()
            : emptyStore;
      if (scopeRef.current !== currentScope || generation.current !== version || writing.current)
        return;
      assign(next);
      setLoadedScope(currentScope);
    } catch (e) {
      if (scopeRef.current === currentScope && generation.current === version) {
        setError(e instanceof Error ? e.message : 'Laden lukt niet.');
        setLoadedScope(currentScope);
      }
    }
  }, [online, token, user, assign]);

  useEffect(() => {
    if (online && !authReady) return;
    void refresh();
    const sync = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync);
    const interval = online && user && !token ? window.setInterval(sync, 15000) : undefined;
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('focus', sync);
      if (interval) window.clearInterval(interval);
    };
  }, [refresh, authReady, online, user, token, scope]);

  const update = useCallback(
    async (fn: (data: Store) => Store) => {
      if (writing.current) throw new Error('Er wordt nog opgeslagen. Probeer zo opnieuw.');
      if (online && (token || !user)) throw new Error('Log in om je werkruimte te wijzigen.');
      const currentScope = scopeRef.current;
      writing.current = true;
      generation.current++;
      setSaving(true);
      setError('');
      try {
        const before = online ? dataRef.current : mockRepository.load();
        const after = fn(before);
        if (online) await saveWorkspace(before, after);
        else mockRepository.save(after);
        const next = online ? await loadWorkspace() : after;
        if (scopeRef.current === currentScope) assign(next);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Opslaan lukt niet.';
        setError(message);
        throw new Error(message);
      } finally {
        writing.current = false;
        setSaving(false);
      }
    },
    [online, token, user, assign],
  );

  const respond = useCallback(
    async (action: string, stars?: number, message?: string, contact?: boolean) => {
      if (!online || !token) throw new Error('Geen online klantpagina.');
      const currentScope = scopeRef.current;
      const next = await publicInvitation(token, action, stars, message, contact);
      if (scopeRef.current === currentScope) assign(next);
      return next;
    },
    [online, token, assign],
  );

  return (
    <Context.Provider
      value={{
        data,
        ready: loadedScope === scope,
        online,
        user,
        authReady,
        error,
        saving,
        refresh,
        update,
        respond,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useStore = () => useContext(Context);
