'use client';
import Link from 'next/link';
import { Plus, Send, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '@/components/provider';
import { PageTitle, Badge, formatDate, Empty } from '@/components/ui';
import { deliveryLabels } from '@/lib/services/sms-client';
export default function Invitations() {
  const { data, online } = useStore();
  const [filter, setFilter] = useState('all');
  const rows = data.invitations.filter((i) => filter === 'all' || i.status === filter);
  return (
    <>
      <PageTitle
        title="Uitnodigingen"
        description="Van persoonlijk verzoek tot waardevolle reactie."
        action={
          <Link href="/dashboard/invitations/new" className="button primary">
            <Plus size={18} />
            Nieuw reviewverzoek
          </Link>
        }
      />
      <div className="filter-tabs">
        {[
          ['all', 'Alle uitnodigingen'],
          ['sent', 'Verstuurd'],
          ['opened', 'Geopend'],
          ['completed', 'Beantwoord'],
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
      <section className="panel">
        <div className="table-scroll">
          <table className="mobile-records">
            <thead>
              <tr>
                <th>Klant</th>
                <th>Aangemaakt op</th>
                <th>Bericht</th>
                <th>Status</th>
                <th>SMS-aflevering</th>
                <th>Klantpagina</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.id}>
                  <td data-label="Klant">
                    <strong>{data.customers.find((c) => c.id === i.customerId)?.name}</strong>
                  </td>
                  <td data-label="Aangemaakt">{formatDate(i.sentAt)}</td>
                  <td data-label="Bericht" className="message-cell">{i.message}</td>
                  <td data-label="Status">
                    <Badge
                      tone={
                        i.status === 'completed'
                          ? 'green'
                          : i.status === 'opened'
                            ? 'blue'
                            : 'neutral'
                      }
                    >
                      {
                        { sent: 'Uitnodiging gemaakt', opened: 'Geopend', completed: 'Beantwoord' }[
                          i.status
                        ]
                      }
                    </Badge>
                  </td>
                  <td data-label="SMS-aflevering">
                    {i.channel === 'sms'
                      ? deliveryLabels[i.deliveryStatus || 'unknown'] || 'Onbekend'
                      : online
                        ? 'Link'
                        : 'Demo'}
                    {i.deliveryError && <small> · fout {i.deliveryError}</small>}
                  </td>
                  <td data-label="Klantpagina">
                    <Link href={`/r/${i.token}`} target="_blank" className="text-link">
                      Bekijken <ExternalLink size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <Empty text="Geen uitnodigingen in deze categorie" />}
        <div className="table-footer">
          <Send size={15} />
          {rows.length} uitnodigingen · {online ? 'online opgeslagen' : 'demo SMS'}
        </div>
      </section>
    </>
  );
}
