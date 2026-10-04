'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Search, Plus, Users } from 'lucide-react';
import { useStore } from '@/components/provider';
import { PageTitle, Stars, Badge, formatDate, Empty } from '@/components/ui';
import { CustomerManager } from '@/components/customer-manager';
export default function Customers() {
  const { data } = useStore();
  const [search, setSearch] = useState('');
  const customers = data.customers.filter((c) =>
    `${c.name} ${c.phone}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <PageTitle
        title="Klanten"
        description="Alle klanten en hun laatste ervaring, op één plek."
        action={
          <Link href="/dashboard/invitations/new" className="button primary">
            <Plus size={18} />
            Klant uitnodigen
          </Link>
        }
      />
      <CustomerManager />
      <section className="panel">
        <div className="table-toolbar">
          <div className="section-heading">
            <h2>
              Jouw klanten <span className="count-pill">{data.customers.length}</span>
            </h2>
          </div>
          <div className="search-input">
            <Search size={18} />
            <input
              placeholder="Zoek naam of telefoonnummer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Zoek klanten"
            />
          </div>
        </div>
        <div className="table-scroll">
          <table className="mobile-records">
            <thead>
              <tr>
                <th>Naam</th>
                <th>Telefoonnummer</th>
                <th>Laatste uitnodiging</th>
                <th>Rating</th>
                <th>Status</th>
                <th>Actie</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const inv = data.invitations
                  .filter((i) => i.customerId === c.id)
                  .sort((a, b) => Date.parse(b.sentAt) - Date.parse(a.sentAt))[0];
                const rating = data.ratings.find((r) => r.invitationId === inv?.id);
                const feedback = data.feedback.find((f) => f.ratingId === rating?.id);
                const review = data.reviews.find((r) => r.customerId === c.id);
                return (
                  <tr key={c.id}>
                    <td data-label="Naam">
                      <div className="table-person">
                        <span className="customer-avatar">
                          {c.name
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')}
                        </span>
                        <strong>{c.name}</strong>
                      </div>
                    </td>
                    <td data-label="Telefoon">{c.phone || '—'}</td>
                    <td data-label="Laatste verzoek">{inv ? formatDate(inv.sentAt) : '—'}</td>
                    <td data-label="Rating">
                      {rating ? (
                        <Stars value={rating.stars} />
                      ) : (
                        <span className="muted">Nog geen rating</span>
                      )}
                    </td>
                    <td data-label="Status">
                      {feedback ? (
                        <Badge tone={feedback.status === 'open' ? 'amber' : 'green'}>
                          {feedback.status === 'open' ? 'Feedback open' : 'Feedback opgelost'}
                        </Badge>
                      ) : review ? (
                        <Badge tone="green">Google review</Badge>
                      ) : (
                        <Badge tone="blue">
                          {inv?.status === 'completed'
                            ? 'Beantwoord'
                            : inv?.status === 'opened'
                              ? 'Geopend'
                              : inv
                                ? 'Uitgenodigd'
                                : 'Nog niet uitgenodigd'}
                        </Badge>
                      )}
                    </td>
                    <td data-label="Actie">
                      <Link
                        className="text-link"
                        href={`/dashboard/invitations/new?customer=${encodeURIComponent(c.id)}`}
                      >
                        Reviewlink maken
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {customers.length === 0 && <Empty text="Geen klanten gevonden" />}
        <div className="table-footer">
          <Users size={15} />
          {customers.length} klanten
        </div>
      </section>
    </>
  );
}
