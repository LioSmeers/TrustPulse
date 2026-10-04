'use client';
import { copyText, nativeBridge, publicAppOrigin } from '@/lib/platform';
import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, User, Info, Copy, Check, ExternalLink, Pencil } from 'lucide-react';
import { useStore } from '@/components/provider';
import { PageTitle, Success } from '@/components/ui';
import { mockSmsProvider } from '@/lib/services/sms';
import { invitationScript, invitationMessage } from '@/lib/invitation-message';
import { addDemoInvitation } from '@/lib/invitations';
import { smsRequest, type SmsSetup } from '@/lib/services/sms-client';
export default function NewInvitation() {
  return (
    <Suspense fallback={<p>Reviewverzoek laden…</p>}>
      <InvitationForm />
    </Suspense>
  );
}
function InvitationForm() {
  const searchParams = useSearchParams();
  const { data, update, online, saving, refresh, ready } = useStore();
  const selectedCustomer = useRef(false);
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [smsSetup, setSmsSetup] = useState<SmsSetup | null>(null);
  const [smsStatus, setSmsStatus] = useState('');
  const [tab, setTab] = useState('sms');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [custom, setCustom] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [prepared, setPrepared] = useState(false);
  const [error, setError] = useState('');
  const [origin, setOrigin] = useState('');
  const [token, setToken] = useState('preview');
  useEffect(() => {
    if (!ready || selectedCustomer.current) return;
    const id = searchParams.get('customer');
    const customer = data.customers.find((c) => c.id === id);
    if (customer) {
      selectedCustomer.current = true;
      setCustomerId(customer.id);
      setName(customer.name);
      setPhone(customer.phone.replace(/^\+32/, '0'));
      setTab('link');
    }
  }, [ready, data.customers, searchParams]);
  useEffect(() => {
    setOrigin(publicAppOrigin());
    setToken(crypto.randomUUID().replaceAll('-', ''));
  }, []);
  useEffect(() => {
    if (!online) return;
    smsRequest('GET')
      .then(setSmsSetup)
      .catch(() =>
        setSmsSetup({ ready: false, missing: ['SMS-koppeling controleren'], origin: null }),
      );
  }, [online]);
  const link = `${online && smsSetup?.origin ? smsSetup.origin : origin}/r/${token}`;
  const script = invitationScript(custom ?? data.business.defaultSms
    .replaceAll('{naam}', name.trim() || 'Thomas')
    .replaceAll('{bedrijf}', data.business.name));
  const message = invitationMessage(script, link);
  function record() {
    return update((d) =>
      addDemoInvitation(d, {
        customerId,
        token,
        name,
        phone: phone ? `+32${phone.replace(/\D/g, '').replace(/^0/, '')}` : '',
        message,
      }),
    );
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!/^0?4\d{8}$/.test(phone.replace(/\D/g, ''))) {
      setError('Vul een geldig Belgisch mobiel nummer in, zonder +32.');
      return;
    }
    setSending(true);
    try {
      if (online) {
        const result = await smsRequest('POST', {
          token,
          name,
          phone: `+32${phone.replace(/\D/g, '').replace(/^0/, '')}`,
          message,
        });
        setSmsStatus(result.status);
        await refresh().catch(() => {});
      } else {
        await mockSmsProvider.send({
          to: `+32${phone.replace(/\D/g, '').replace(/^0/, '')}`,
          message,
        });
        await record();
      }
      setSent(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? `${cause.message} Bij een onderbroken verbinding: controleer eerst Uitnodigingen; hetzelfde verzoek wordt niet opnieuw verstuurd.`
          : 'Het verzoek kon niet worden verstuurd.',
      );
    } finally {
      setSending(false);
    }
  }
  async function copy() {
    try {
      if (!prepared) {
        await record();
        setPrepared(true);
      }
      await copyText(link);
      setCopied(true);
      setSent(true);
    } catch {
      setError('Opslaan of kopiëren lukt niet. Probeer opnieuw; alleen een opgeslagen link is beschikbaar.');
    }
  }
  async function share() {
    setError('');
    try {
      if (!prepared) { await record(); setPrepared(true); }
      await nativeBridge()?.share(link);
    } catch { setError('Delen is geannuleerd of niet beschikbaar. De opgeslagen link kun je kopiëren.'); }
  }
  return (
    <>
      <Link href="/dashboard/invitations" className="back-link">
        <ArrowLeft size={16} /> Uitnodigingen
      </Link>
      <PageTitle
        title="Verstuur reviewverzoek"
        description="Een persoonlijk bericht. Een waardevolle ervaring."
      />
      <div className="form-layout">
        <section className="panel invitation-form">
          {sent ? (
            <>
              <Success
                title={
                  tab === 'sms' && online
                    ? ['failed', 'undelivered', 'canceled'].includes(smsStatus)
                      ? 'Je SMS is niet verstuurd'
                      : ['unknown', 'submitting'].includes(smsStatus)
                        ? 'Controleer de verzending'
                        : 'Je SMS-verzoek is verwerkt'
                    : 'Je reviewverzoek staat klaar!'
                }
              >
                {tab === 'sms'
                  ? online
                    ? ['failed', 'undelivered', 'canceled'].includes(smsStatus)
                      ? 'Twilio kon de SMS niet versturen. Controleer de afleverstatus bij Uitnodigingen en je Twilio-instellingen.'
                      : ['unknown', 'submitting'].includes(smsStatus)
                        ? 'We kunnen de verzending nog niet bevestigen. Controleer Uitnodigingen en Twilio voordat je een nieuw verzoek maakt.'
                        : `Twilio heeft het SMS-verzoek aan ${name} verwerkt. Volg de aflevering bij Uitnodigingen.`
                    : `Het SMS-verzoek aan ${name} is gesimuleerd. Er wordt geen echte SMS verstuurd.`
                  : online
                    ? 'De link is gekopieerd en de uitnodiging is online opgeslagen.'
                    : 'De link is gekopieerd. Je kunt de klantpagina in deze browser testen.'}
              </Success>
              <div className="success-actions">
                {nativeBridge() && <button className="button secondary" onClick={share}>Deel klantlink</button>}
                <Link href={`/r/${token}`} target="_blank" className="button primary">
                  Bekijk de klantpagina <ExternalLink size={17} />
                </Link>
                <button
                  className="button secondary"
                  onClick={() => {
                    setSent(false);
                    setName('');
                    setCustomerId(undefined);
                    setPhone('');
                    setCustom(null);
                    setCopied(false);
                    setPrepared(false);
                    setEditing(false);
                    setToken(crypto.randomUUID().replaceAll('-', ''));
                  }}
                >
                  Nog een klant uitnodigen
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="tabs">
                <button onClick={() => setTab('sms')} className={tab === 'sms' ? 'selected' : ''}>
                  <Send size={16} /> SMS
                </button>
                <button onClick={() => setTab('link')} className={tab === 'link' ? 'selected' : ''}>
                  <Copy size={16} /> Link kopiëren
                </button>
              </div>
              <form onSubmit={submit}>
                <label>
                  Klantnaam
                  <div className="input-icon">
                    <User size={18} />
                    <input
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setCustomerId(undefined);
                      }}
                      placeholder="bijv. Thomas"
                      required={tab === 'sms'}
                      maxLength={80}
                    />
                  </div>
                </label>
                {tab === 'sms' ? (
                  <>
                    <label>
                      Telefoonnummer
                      <div className="phone-field">
                        <span>
                          🇧🇪 <strong>+32</strong>
                        </span>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => {
                            setPhone(e.target.value);
                            setCustomerId(undefined);
                          }}
                          placeholder="0487 12 34 56"
                          required
                        />
                      </div>
                    </label>
                    <div className="label-row">
                      <label htmlFor="sms">
                        Bericht <span>(automatisch gegenereerd)</span>
                      </label>
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => setEditing(!editing)}
                      >
                        <Pencil size={14} />
                        {editing ? 'Klaar' : 'Aanpassen'}
                      </button>
                    </div>
                    <textarea
                      id="sms"
                      className="message-textarea"
                      value={script}
                      readOnly={!editing}
                      onChange={(e) => setCustom(invitationScript(e.target.value))}
                      maxLength={480}
                    />
                    <label>
                      Persoonlijke klantlink
                      <input value="Wordt automatisch toegevoegd bij verzending" readOnly />
                      <small>Je persoonlijke klantlink wordt geactiveerd zodra de uitnodiging is opgeslagen.</small>
                    </label>
                    <div className="character-count">{message.length} tekens</div>
                    <button
                      className="button primary full"
                      disabled={
                        sending ||
                        saving ||
                        !origin ||
                        !script.trim() ||
                        message.length > 640 ||
                        (online && !smsSetup?.ready)
                      }
                    >
                      <Send size={18} />
                      {sending ? 'Verzoek wordt verstuurd…' : 'Verstuur SMS-verzoek'}
                    </button>
                    {online && !smsSetup?.ready && (
                      <div className="info-box">
                        <Info size={18} />
                        <p>
                          {smsSetup
                            ? `SMS is nog niet gekoppeld. Nog nodig: ${smsSetup.missing.join(', ')}.`
                            : 'SMS-koppeling controleren…'}{' '}
                          <Link href="/dashboard/setup" className="text-link">
                            Naar Startklaar
                          </Link>
                        </p>
                      </div>
                    )}
                    <div className="info-box">
                      <Info size={18} />
                      <p>
                        Elke klant krijgt een persoonlijke link. De klant heeft geen account nodig.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="form-description">
                      {online
                        ? 'Deel deze persoonlijke link met je klant via WhatsApp of e-mail.'
                        : 'Kopieer deze persoonlijke link om de klantpagina te testen.'}
                    </p>
                    <div className="info-box">
                      <Info size={18} />
                      <p>
                        {online
                          ? 'We slaan de uitnodiging eerst op. Daarna kopiëren we de actieve klantlink, zodat je klant hem meteen kan openen.'
                          : 'Deze demo bewaart de uitnodiging in deze browser. De link werkt nog niet op het toestel van je klant.'}
                      </p>
                    </div>
                    {prepared && <label>
                      Jouw reviewlink
                      <input value={link} readOnly onFocus={(e) => e.target.select()} />
                    </label>}
                    {nativeBridge() && <button type="button" className="button secondary" disabled={!origin || saving} onClick={share}>Deel klantlink</button>}
                <button
                      type="button"
                      className="button primary full"
                      onClick={copy}
                      disabled={!origin || saving}
                    >
                      {copied ? <Check size={18} /> : <Copy size={18} />}{' '}
                      {copied ? 'Link gekopieerd' : 'Maak en kopieer klantlink'}
                    </button>
                    {copied && (
                      <Link className="text-link" href={`/r/${token}`} target="_blank">
                        Open klantpagina <ExternalLink size={15} />
                      </Link>
                    )}
                  </>
                )}
                {error && (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                )}
              </form>
            </>
          )}
        </section>
        <aside className="invitation-aside">
          <span className="eyebrow">ZO WERKT HET</span>
          <h2>
            Een kleine uitnodiging.
            <br />
            Een groot verschil.
          </h2>
          <div className="steps">
            {[
              ['Stuur een persoonlijk verzoek', 'Je klant ontvangt een SMS met een unieke link.'],
              ['Luister naar de ervaring', 'Vijf sterren, één tik. Eenvoudig voor iedereen.'],
              ['Bouw aan je reputatie', 'Verzamel reviews en volg feedback persoonlijk op.'],
            ].map(([title, text], i) => (
              <div key={title}>
                <span>{i + 1}</span>
                <div>
                  <strong>{title}</strong>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="demo-note">
            <Info size={17} />
            <p>
              {online
                ? 'SMS-verzoeken worden via Twilio verstuurd zodra de koppeling klaar is. De afleverstatus verschijnt bij Uitnodigingen.'
                : 'Je gebruikt de demo. SMS-verzoeken worden gesimuleerd en lokaal bewaard.'}
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
