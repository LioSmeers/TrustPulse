'use client';
import { useState } from 'react';
import { useStore } from '@/components/provider';
import { PageTitle, Stars, Google, formatDate, Empty } from '@/components/ui';
import { reviewSummary } from '@/lib/insights';
export default function Reviews() {
  const { data, online } = useStore();
  const summary = reviewSummary(data.reviews);
  const [filter, setFilter] = useState('all');
  const reviews = data.reviews.filter(
    (r) =>
      filter === 'all' ||
      (filter === 'Google' && r.platform === 'Google') ||
      String(r.stars) === filter,
  );
  return (
    <>
      <PageTitle
        title="Reviews"
        description="Mooie woorden van klanten. Een sterke reputatie voor je zaak."
      />
      <div className="reviews-summary">
        <div className="summary-google">
          <Google size={30} />
          <span>
            <strong>
              {summary.average?.toFixed(1) ?? '—'} <span>/ 5</span>
            </strong>
            <Stars value={summary.average ?? 0} />
          </span>
        </div>
        <div>
          <strong>{summary.count} opgeslagen Google reviews</strong>
          <p>{summary.recent} nieuwe reviews in de afgelopen 30 dagen</p>
        </div>
        <span className="summary-trend">
          {online ? 'Google nog niet gekoppeld' : 'Voorbeelddata'}
        </span>
      </div>
      <div className="filter-tabs">
        {[
          ['all', 'Alle reviews'],
          ['5', '5 sterren'],
          ['4', '4 sterren'],
          ['Google', 'Google reviews'],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={filter === key ? 'selected' : ''}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="review-grid">
        {reviews.map((r) => (
          <article className="panel review-card" key={r.id}>
            <div className="review-top">
              <span className="customer-avatar">
                {data.customers.find((c) => c.id === r.customerId)?.name[0]}
              </span>
              <div>
                <strong>{data.customers.find((c) => c.id === r.customerId)?.name}</strong>
                <small>{formatDate(r.createdAt)}</small>
              </div>
              <Google size={20} />
            </div>
            <Stars value={r.stars} size={19} />
            <p>{r.text}</p>
            <div className="review-platform">
              <Google size={14} /> Geplaatst op {r.platform}
            </div>
          </article>
        ))}
      </div>
      {reviews.length === 0 && <Empty text="Geen reviews gevonden" />}
    </>
  );
}
