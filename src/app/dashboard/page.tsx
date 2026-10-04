'use client';
import Link from 'next/link';
import { GoogleReviews } from '@/components/google-reviews';
import {
  Send,
  Star,
  MessageSquare,
  ShieldAlert,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  CalendarDays,
  ArrowUpRight,
} from 'lucide-react';
import { useState } from 'react';
import { useStore } from '@/components/provider';
import { Google, Stars, Empty, formatDate } from '@/components/ui';
import { dashboardInsights } from '@/lib/insights';
export default function Dashboard() {
  const { data, online } = useStore();
  const [period, setPeriod] = useState('30');
  const insights = dashboardInsights(data, Number(period));
  const { open, activity, google } = insights;
  const cards = [
    {
      label: 'Uitnodigingen',
      value: insights.invitations,
      change: insights.invitationChange,
      note: 'Geen vorige uitnodigingen',
      Icon: Send,
      tone: 'blue',
    },
    {
      label: 'Gemiddelde rating',
      value: insights.average?.toFixed(1) ?? '—',
      change: insights.averageChange,
      note: `${insights.ratingCount} beoordelingen`,
      Icon: Star,
      tone: 'amber',
    },
    {
      label: 'Nieuwe reviews',
      value: insights.reviews,
      change: insights.reviewChange,
      note: 'Geen vorige reviews',
      Icon: MessageSquare,
      tone: 'green',
    },
    {
      label: 'Openstaande feedback',
      value: open,
      change: null,
      note: 'Alle openstaande berichten',
      Icon: ShieldAlert,
      tone: 'red',
    },
  ];
  return (
    <>
      <div className="dashboard-heading">
        <div>
          <p className="greeting">Welkom terug,</p>
          <h1>{data.business.name}</h1>
          <p className="dashboard-subtitle">Jouw reputatie, in goede handen.</p>
        </div>
        <label className="date-filter">
          <CalendarDays size={17} />
          <select value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Periode">
            <option value="7">Laatste 7 dagen</option>
            <option value="30">Laatste 30 dagen</option>
            <option value="90">Laatste 90 dagen</option>
          </select>
        </label>
      </div>
      <div className="metric-grid">
        {cards.map(({ label, value, change, note, Icon, tone }) => (
          <article className="metric-card" key={label}>
            <span className={`metric-icon ${tone}`}>
              <Icon size={23} fill={tone === 'amber' ? 'currentColor' : 'none'} />
            </span>
            <strong>{value}</strong>
            <p>{label}</p>
            <div className="metric-change">
              {change !== null ? (
                <>
                  {change.startsWith('-') ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                  {change}
                  <span>t.o.v. vorige periode</span>
                </>
              ) : (
                note
              )}
            </div>
          </article>
        ))}
      </div>
      <Link href="/dashboard/invitations/new" className="invite-banner">
        <Send size={26} />
        <div>
          <strong>Nieuwe klant uitnodigen</strong>
          <span>via SMS</span>
        </div>
        <span className="banner-caption">Een persoonlijk verzoek, een waardevolle review.</span>
        <ArrowRight size={22} />
      </Link>
      <div className="dashboard-grid">
        <section className="panel activity-panel">
          <div className="section-heading">
            <div>
              <h2>Recente activiteit</h2>
              <p>De laatste ervaringen van jouw klanten.</p>
            </div>
            <Link href="/dashboard/reviews" className="text-link">
              Alles bekijken <ArrowRight size={16} />
            </Link>
          </div>
          <div className="activity-list">
            {!activity.length && <Empty text="Nog geen reacties in deze periode" />}
            {activity.map((a) => (
              <Link href={a.href} className="activity-row" key={a.id}>
                <span className={`activity-icon ${a.type === 'feedback' ? 'red' : ''}`}>
                  {a.type === 'google' ? (
                    <Google size={25} />
                  ) : a.type === 'feedback' ? (
                    <ShieldAlert size={23} fill="#dc2626" color="white" />
                  ) : (
                    <Star size={23} />
                  )}
                </span>
                <div className="activity-detail">
                  <strong>{a.title}</strong>
                  <div>
                    <span>{a.name}</span>
                    <Stars value={a.stars} />
                  </div>
                </div>
                <time dateTime={a.date}>{formatDate(a.date)}</time>
                <ArrowUpRight size={16} className="activity-arrow" />
              </Link>
            ))}
          </div>
          <div className="activity-footer">
            <span className="live-dot" /> Je overzicht is bijgewerkt
          </div>
        </section>
        {online ? <GoogleReviews compact key={data.business.googleReviewUrl} /> : <section className="panel reputation-panel">
          <div className="section-heading">
            <h2>Jouw Google-rating</h2>
            <Google size={24} />
          </div>
          <div className="rating-overview">
            <strong>
              {google.average?.toFixed(1) ?? '—'}
              <span>/ 5</span>
            </strong>
            <Stars value={google.average ?? 0} size={23} />
            <p>Gebaseerd op {google.count} opgeslagen Google reviews</p>
          </div>
          <div className="rating-bars">
            {google.distribution.map(({ stars: n, percent: width }) => (
              <div key={n}>
                <span>{n}</span>
                <Star size={12} />
                <i>
                  <b style={{ width: `${width}%` }} />
                </i>
                <span>{width}%</span>
              </div>
            ))}
          </div>
          <div className="reputation-note">
            <span className="live-dot" />{' '}
            {online
              ? 'Opgeslagen reviews · Google is nog niet gekoppeld.'
              : 'Voorbeeldreviews · Google is nog niet gekoppeld.'}
          </div>
        </section>}
      </div>
      <div className="attention-note">
        <span className="note-icon">
          <MessageSquare size={19} />
        </span>
        <div>
          <strong>Een persoonlijk antwoord maakt een verschil.</strong>
          <p>
            {open} klant{open === 1 ? '' : 'en'} wacht{open === 1 ? '' : 'en'} op jouw aandacht.
          </p>
        </div>
        <Link href="/dashboard/feedback">
          Bekijk feedback <ArrowRight size={16} />
        </Link>
      </div>
    </>
  );
}
