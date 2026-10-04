'use client';
import Link from 'next/link';
import { useStore } from '@/components/provider';
import { Database, Send, ShieldCheck, Globe, ArrowRight, ExternalLink } from 'lucide-react';
import { PageTitle } from '@/components/ui';
import { useEffect, useState } from 'react';
import { smsRequest, type SmsSetup } from '@/lib/services/sms-client';

const steps = [
  {
    Icon: Database,
    title: '1. Online opslag',
    status: 'Account nodig',
    text: 'Maak een Supabase-account en een project aan. Daarna kunnen we klanten, uitnodigingen en feedback online bewaren.',
    href: 'https://supabase.com/dashboard',
    label: 'Open Supabase',
  },
  {
    Icon: ShieldCheck,
    title: '2. Inloggen voor je zaak',
    status: 'Nog te bouwen',
    text: 'We koppelen het inloggen aan Supabase en geven elke zaak alleen toegang tot haar eigen klanten en instellingen.',
  },
  {
    Icon: Send,
    title: '3. Echte sms-uitnodigingen',
    status: 'Account nodig',
    text: 'SMS is een optionele uitbreiding. Je kunt de app alvast gebruiken met persoonlijke reviewlinks.',
    href: 'https://www.twilio.com/try-twilio',
    label: 'Open Twilio',
  },
  {
    Icon: Globe,
    title: '4. Je app online zetten',
    status: 'Na de koppelingen',
    text: 'We publiceren de app op een vast webadres en testen de volledige klantflow op een ander toestel.',
  },
];

export default function Setup() {
  const { online } = useStore();
  const [sms, setSms] = useState<SmsSetup | null>(null);
  useEffect(() => {
    if (online)
      smsRequest('GET')
        .then(setSms)
        .catch(() =>
          setSms({ ready: false, missing: ['SMS-koppeling controleren'], origin: null }),
        );
  }, [online]);
  return (
    <>
      <PageTitle
        title="Je werkruimte afwerken"
        description="Gebruik klantenbeheer en reviewlinks. Activeer extra kanalen wanneer je ze nodig hebt."
      />
      <div className="info-box">
        <ShieldCheck size={20} />
        <p>
          {online
            ? `Je werkruimte gebruikt Supabase voor inloggen en opslag. ${sms?.ready ? 'SMS-verzending is ingesteld.' : 'Je kunt klanten toevoegen en reviewlinks maken zonder betaalde SMS.'} E-mailmeldingen zijn nog niet gekoppeld.`
            : 'Je werkt momenteel in een lokale demo. Voor online opslag zijn de Supabase-projectgegevens nodig.'}
        </p>
      </div>
      <div className="setup-grid">
        {steps.map(({ Icon, title, status, text, href, label }) => (
          <section className="panel settings-section" key={title}>
            <div className="settings-heading">
              <Icon size={22} />
              <div>
                <h2>{title}</h2>
                <p>
                  {online && (title.startsWith('1.') || title.startsWith('2.'))
                    ? 'Gekoppeld'
                    : title.startsWith('3.') && sms?.ready
                      ? 'Ingesteld · test nog nodig'
                      : status}
                </p>
              </div>
            </div>
            <p className="setup-description">
              {online && title.startsWith('1.')
                ? 'Je klanten, uitnodigingen en feedback worden in Supabase bewaard.'
                : online && title.startsWith('2.')
                  ? 'Je zaak heeft een eigen account en toegang tot haar eigen werkruimte.'
                  : title.startsWith('3.') && online && sms
                    ? sms.ready
                      ? 'Twilio is ingesteld. Test eerst een sms naar je eigen nummer en controleer de aflevering.'
                      : `SMS blijft uitgeschakeld zolang de koppeling niet klaar is. Voor eigen berichten met je reviewlink is een geschikt Twilio-account nodig; Limited trial ondersteunt alleen vaste testberichten. Nog nodig: ${sms.missing.join(', ')}.`
                    : text}
            </p>
            {href && (
              <a className="button secondary" href={href} target="_blank" rel="noopener noreferrer">
                {label}
                <ExternalLink size={16} />
              </a>
            )}
          </section>
        ))}
      </div>
      <section className="panel settings-section">
        <h2>Je klantenlijst</h2>
        <p className="setup-description">
          Voeg klanten toe of importeer een CSV-bestand uit Excel. Maak daarna een persoonlijke
          reviewlink vanuit de klantenlijst. Om die op een ander toestel te gebruiken, moet de app
          online staan.
        </p>
        <Link className="button primary" href="/dashboard/customers">
          Naar klanten <ArrowRight size={16} />
        </Link>
      </section>
      <section className="panel settings-section">
        <div className="settings-heading">
          <Globe size={22} />
          <div>
            <h2>Je Google-reviewlink</h2>
            <p>Die kun je alvast instellen.</p>
          </div>
        </div>
        <p className="setup-description">
          Heb je een Google Bedrijfsprofiel? Voeg de reviewlink toe zodat klanten vanuit hun
          beoordeling je Google-pagina kunnen openen.
        </p>
        <Link className="button primary" href="/dashboard/settings">
          Naar instellingen
          <ArrowRight size={16} />
        </Link>
      </section>
    </>
  );
}
