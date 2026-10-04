'use client';
import { useState } from 'react';
import { Check, Phone, MessageSquare, RotateCcw } from 'lucide-react';
import { useStore } from '@/components/provider';
import { PageTitle, Stars, Badge, formatDate, Empty } from '@/components/ui';
export default function Feedback() {
  const { data, update, saving } = useStore();
  const [filter, setFilter] = useState('open');
  const feedback = data.feedback.filter((f) => f.status === filter);
  return (
    <>
      <PageTitle
        title="Feedback"
        description="Luister, reageer en maak van feedback een betere ervaring."
      />
      <div className="filter-tabs">
        {[
          ['open', 'Openstaand'],
          ['resolved', 'Opgelost'],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={filter === key ? 'selected' : ''}
          >
            {label}
            <span className="count-pill">
              {data.feedback.filter((f) => f.status === key).length}
            </span>
          </button>
        ))}
      </div>
      <div className="feedback-list">
        {feedback.map((f) => {
          const rating = data.ratings.find((r) => r.id === f.ratingId);
          const invitation = data.invitations.find((i) => i.id === rating?.invitationId);
          const customer = data.customers.find((c) => c.id === invitation?.customerId);
          return (
            <article className="panel feedback-card" key={f.id}>
              <div className="feedback-top">
                <span className="customer-avatar">{customer?.name[0] || 'K'}</span>
                <div>
                  <strong>{customer?.name || 'Klant'}</strong>
                  <small>{formatDate(f.createdAt)}</small>
                </div>
                <Badge tone={f.status === 'open' ? 'amber' : 'green'}>
                  {f.status === 'open' ? 'Openstaand' : 'Opgelost'}
                </Badge>
              </div>
              <Stars value={rating?.stars || 0} size={19} />
              <blockquote>“{f.message}”</blockquote>
              <div className="feedback-actions">
                <span>
                  <MessageSquare size={15} />
                  {f.contactAllowed ? 'Klant staat open voor contact' : 'Klant wenst geen contact'}
                </span>
                <div>
                  {f.contactAllowed && customer?.phone && (
                    <a className="button secondary" href={`tel:${customer.phone}`}>
                      <Phone size={16} />
                      Contact opnemen
                    </a>
                  )}
                  <button
                    className="button secondary"
                    disabled={saving}
                    onClick={() => {
                      void update((d) => ({
                        ...d,
                        feedback: d.feedback.map((item) =>
                          item.id === f.id
                            ? { ...item, status: f.status === 'open' ? 'resolved' : 'open' }
                            : item,
                        ),
                      })).catch(() => {});
                    }}
                  >
                    {f.status === 'open' ? <Check size={16} /> : <RotateCcw size={16} />}{' '}
                    {f.status === 'open' ? 'Markeer als opgelost' : 'Heropen feedback'}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {!feedback.length && (
        <section className="panel">
          <Empty
            text={filter === 'open' ? 'Alle feedback is opgevolgd' : 'Nog geen opgeloste feedback'}
          />
        </section>
      )}
    </>
  );
}
