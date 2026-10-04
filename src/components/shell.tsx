'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  UsersRound,
  Send,
  MessageSquare,
  ShieldCheck,
  Settings,
  Bell,
  ChevronDown,
  ArrowUpRight,
  X,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';
import { useStore } from './provider';
export const navigation = [
  ['/dashboard', 'Home', Home],
  ['/dashboard/customers', 'Klanten', UsersRound],
  ['/dashboard/invitations', 'Uitnodigingen', Send],
  ['/dashboard/reviews', 'Reviews', MessageSquare],
  ['/dashboard/feedback', 'Feedback', ShieldCheck],
  ['/dashboard/settings', 'Instellingen', Settings],
] as const;
export function Logo() {
  return (
    <span className="trustpulse-logo">
      <img src="/brand/logo.png" alt="TrustPulse" />
    </span>
  );
}
export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data, online, user, authReady, ready, error, saving, refresh } = useStore();
  const router = useRouter();
  useEffect(() => {
    if (online && authReady && !user) router.replace('/login');
  }, [online, authReady, user, router]);
  const [showNotifications, setShowNotifications] = useState(false);
  const count = data.feedback.filter((item) => item.status === 'open').length;
  const previewToken = data.invitations[0]?.token;
  const selected = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href);
  const initials = data.business.name
    .split(' ')
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  if (online && (!authReady || !user))
    return <div className="connection-state">Je werkruimte openen…</div>;
  if (online && (!ready || !data.business.id))
    return (
      <div className="connection-state">
        <h1>{error ? 'Je werkruimte is nog niet beschikbaar' : 'Je werkruimte laden…'}</h1>
        {error && (
          <>
            <p role="alert">{error}</p>
            <button className="button primary" onClick={() => void refresh()}>
              Opnieuw proberen
            </button>
            <button className="button secondary" onClick={() => void getSupabase().auth.signOut()}>
              Uitloggen
            </button>
          </>
        )}
      </div>
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/dashboard" className="brand">
          <Logo />
        </Link>
        <div className="business-switch">
          <span className="business-avatar">{initials}</span>
          <div>
            <strong>{data.business.name}</strong>
            <small>Jouw werkruimte</small>
          </div>
          <ChevronDown size={15} />
        </div>
        <p className="nav-label">WERKRUIMTE</p>
        <nav>
          {navigation.map(([href, label, Icon]) => (
            <Link href={href} key={href} className={`nav-item ${selected(href) ? 'active' : ''}`}>
              <Icon size={20} />
              <span>{label}</span>
              {label === 'Feedback' && count > 0 && <b>{count}</b>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {previewToken && (
            <Link href={`/r/${previewToken}`} target="_blank" className="preview-link">
              <ShieldCheck size={19} />
              <span>Bekijk je klantpagina</span>
              <ArrowUpRight size={15} />
            </Link>
          )}
          <div className="profile">
            <span className="profile-avatar">{online ? initials : 'JD'}</span>
            <div>
              <strong>{online ? user?.user_metadata.name || user?.email : 'Jan De Vos'}</strong>
              <small>Zaakvoerder</small>
            </div>
            {online && (
              <button
                className="icon-button"
                onClick={async () => {
                  const result = await getSupabase().auth.signOut();
                  if (!result.error) router.replace('/login');
                }}
                aria-label="Uitloggen"
              >
                <X size={18} />
              </button>
            )}
            <Link href="/dashboard/settings" aria-label="Instellingen">
              <Settings size={18} />
            </Link>
          </div>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <div className="breadcrumb">
            Werkruimte <span>/</span>
            <strong>
              {pathname.endsWith('/new')
                ? 'Reviewverzoek'
                : navigation.find(([href]) => href === pathname)?.[1] ||
                  (pathname === '/dashboard/setup' ? 'Live gaan' : 'Werkruimte')}
            </strong>
          </div>
          <Link href="/dashboard" className="mobile-brand">
            <Logo />
          </Link>
          <div className="header-actions">
            <span className="demo-label">
              {online ? (saving ? 'Opslaan…' : 'Online werkruimte') : 'Demo-omgeving'}
            </span>
            <div className="notification-wrap">
              <button
                className="icon-button"
                aria-label="Meldingen"
                aria-expanded={showNotifications}
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell size={22} />
                {count > 0 && <i />}
              </button>
              {showNotifications && (
                <div className="notification-panel">
                  <div className="section-heading">
                    <h3>Meldingen</h3>
                    <button
                      className="icon-button"
                      aria-label="Sluiten"
                      onClick={() => setShowNotifications(false)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <Link href="/dashboard/feedback" onClick={() => setShowNotifications(false)}>
                    {count} feedbackbericht{count === 1 ? '' : 'en'} wacht{count === 1 ? '' : 'en'}{' '}
                    op jouw aandacht.
                  </Link>
                </div>
              )}
            </div>
            <span className="profile-avatar small">{online ? initials : 'JD'}</span>
          </div>
        </header>
        {error && (
          <div className="sync-alert" role="alert">
            {error}{' '}
            <button className="text-link" onClick={() => void refresh()}>
              Opnieuw laden
            </button>
          </div>
        )}
        <main className="main-content">{children}</main>
        <footer className="desktop-footer">
          <span>© 2026 TrustPulse</span>
          <span>Elke ervaring telt.</span>
        </footer>
      </div>
      <nav className="mobile-nav" aria-label="Hoofdnavigatie">
        {navigation.map(([href, label, Icon]) => (
          <Link key={href} href={href} className={selected(href) ? 'active' : ''}>
            <Icon size={21} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
