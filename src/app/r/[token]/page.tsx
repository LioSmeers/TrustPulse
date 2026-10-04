'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Star, ArrowRight, ExternalLink, Check, ArrowLeft } from 'lucide-react';
import { useStore } from '@/components/provider';
import { Google } from '@/components/ui';
const labels = ['', 'Slecht', 'Matig', 'Goed', 'Zeer goed', 'Uitstekend'];
export default function CustomerFlow() {
  const { token } = useParams<{ token: string }>();
  const { data, ready, update, online, respond, error: loadError } = useStore();
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [step, setStep] = useState('rate');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ratingId, setRatingId] = useState('');
  const invitation = data.invitations.find((i) => i.token === token);
  const business = data.business;
  const publicUrl = business.googleReviewUrl;
  useEffect(() => {
    if (!ready || invitation?.status !== 'sent') return;
    const opened = online
      ? respond('opened')
      : update((d) => ({
          ...d,
          invitations: d.invitations.map((i) =>
            i.token === token ? { ...i, status: 'opened', openedAt: new Date().toISOString() } : i,
          ),
        }));
    void opened.catch(() =>
      setError(
        'De opening kon niet worden geregistreerd. Je kunt je beoordeling opnieuw proberen.',
      ),
    );
  }, [ready, invitation?.status, token, update, online, respond]);
  async function next() {
    if (!invitation || !stars || busy) return;
    setBusy(true);
    setError('');
    try {
      if (online) {
        const result = await respond('rate', stars);
        if (!result.invitations.length)
          throw new Error('Deze link is verlopen. Vraag een nieuwe uitnodiging.');
        setRatingId(result.ratings[0].id);
      } else {
        const existing = data.ratings.find((r) => r.invitationId === invitation.id);
        const id = existing?.id || crypto.randomUUID();
        await update((d) => ({
          ...d,
          ratings: existing
            ? d.ratings.map((r) => (r.id === id ? { ...r, stars } : r))
            : [
                ...d.ratings,
                { id, invitationId: invitation.id, stars, createdAt: new Date().toISOString() },
              ],
          invitations: d.invitations.map((i) =>
            i.id === invitation.id ? { ...i, status: 'completed' } : i,
          ),
        }));
        setRatingId(id);
      }
      setStep(stars >= 4 ? 'positive' : 'feedback');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Opslaan lukt niet. Probeer opnieuw.');
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      if (online) {
        const result = await respond('feedback', undefined, message.trim(), contact);
        if (!result.invitations.length)
          throw new Error('Deze link is verlopen. Vraag een nieuwe uitnodiging.');
      } else {
        await update((d) => ({
          ...d,
          feedback: [
            {
              id: crypto.randomUUID(),
              ratingId,
              message: message.trim(),
              contactAllowed: contact,
              status: 'open',
              createdAt: new Date().toISOString(),
            },
            ...d.feedback.filter((f) => f.ratingId !== ratingId),
          ],
        }));
      }
      setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Opslaan lukt niet. Probeer opnieuw.');
    } finally {
      setBusy(false);
    }
  }
  const googleLink = (
    <>
      {publicUrl ? (
        <a
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={step === 'positive' ? 'button primary full' : 'public-review-link'}
        >
          <Google size={step === 'positive' ? 20 : 15} />{' '}
          {step === 'positive'
            ? 'Plaats review op Google'
            : 'Je kunt je ervaring ook op Google delen'}
          <ExternalLink size={16} />
        </a>
      ) : (
        <>
          {step === 'positive' && (
            <button className="button primary full" disabled>
              <Google size={20} />
              Plaats review op Google
              <ExternalLink size={16} />
            </button>
          )}
          <p className="google-unconfigured">
            De zaak heeft haar Google-reviewlink nog niet ingesteld.
          </p>
        </>
      )}
    </>
  );
  return (
    <main
      className="customer-page"
      style={{ '--primary': business.accentColor } as React.CSSProperties}
    >
      <div className="customer-card">
        {(error || loadError) && (
          <p className="form-error" role="alert">
            {error || loadError}
          </p>
        )}
        {!ready ? (
          <p className="muted">Even laden…</p>
        ) : !invitation ? (
          <div className="customer-final">
            <h1>Deze link is niet beschikbaar.</h1>
            <p>Vraag de zaak om een nieuwe uitnodiging.</p>
          </div>
        ) : (
          <>
            <div className="customer-business">
              {business.logoUrl && <img src={business.logoUrl} alt={business.name} />}
              <h2>{business.name}</h2>
              <p>JOUW MENING TELT</p>
              <span />
            </div>
            {step === 'rate' ? (
              <>
                <div className="customer-question">
                  <h1>
                    Hoe was je
                    <br />
                    ervaring?
                  </h1>
                  <p>Laat ons weten hoe je bezoek verliep.</p>
                </div>
                <div
                  className="star-picker"
                  onMouseLeave={() => setHover(0)}
                  role="group"
                  aria-label="Beoordeel je ervaring"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      aria-label={`${n} ${n === 1 ? 'ster' : 'sterren'}: ${labels[n]}`}
                      aria-pressed={stars === n}
                      onMouseEnter={() => setHover(n)}
                      onFocus={() => setHover(n)}
                      onBlur={() => setHover(0)}
                      onClick={() => setStars(n)}
                    >
                      <Star
                        size={48}
                        strokeWidth={1.35}
                        fill={n <= (hover || stars) ? '#F59E0B' : 'none'}
                        color={n <= (hover || stars) ? '#F59E0B' : '#98A2B3'}
                      />
                    </button>
                  ))}
                </div>
                <p className="rating-label" aria-live="polite">
                  {labels[hover || stars] || 'Kies je beoordeling'}
                </p>
                <div className="customer-bottom">
                  <button className="button primary full" disabled={!stars || busy} onClick={next}>
                    Volgende <ArrowRight size={20} />
                  </button>
                </div>
              </>
            ) : step === 'positive' ? (
              <>
                <div className="google-orb">
                  <Google size={57} />
                </div>
                <h1 className="customer-thanks">Bedankt!</h1>
                <p className="customer-body">Fijn om te horen dat je tevreden bent.</p>
                <p className="customer-body prompt">Wil je jouw ervaring ook delen op Google?</p>
                <div className="customer-bottom">
                  {googleLink}
                  <button className="later-button" onClick={() => setStep('done')}>
                    Misschien later
                  </button>
                </div>
              </>
            ) : step === 'feedback' ? (
              <>
                <button className="back-link" onClick={() => setStep('rate')}>
                  <ArrowLeft size={16} />
                  Terug
                </button>
                <h1 className="feedback-question">
                  Wat konden we
                  <br />
                  beter doen?
                </h1>
                <p className="customer-body small-body">
                  Je feedback wordt rechtstreeks naar {business.name} gestuurd.
                </p>
                <form className="customer-feedback" onSubmit={submit}>
                  <label className="sr-only" htmlFor="feedback">
                    Vertel kort wat er misging
                  </label>
                  <textarea
                    id="feedback"
                    placeholder="Vertel kort wat er misging…"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    maxLength={2000}
                  />
                  <label>Mogen we contact met je opnemen?</label>
                  <div className="contact-options">
                    <button
                      type="button"
                      aria-pressed={contact}
                      className={contact ? 'selected' : ''}
                      onClick={() => setContact(true)}
                    >
                      Ja
                    </button>
                    <button
                      type="button"
                      aria-pressed={!contact}
                      className={!contact ? 'selected' : ''}
                      onClick={() => setContact(false)}
                    >
                      Nee
                    </button>
                  </div>
                  <button className="button primary full" disabled={!message.trim() || busy}>
                    Verstuur feedback <ArrowRight size={18} />
                  </button>
                </form>
                <div className="negative-google">{googleLink}</div>
              </>
            ) : (
              <div className="customer-final">
                <span className="success-circle">
                  <Check size={32} />
                </span>
                <h1>Bedankt{stars <= 3 ? ' voor je feedback' : ''}.</h1>
                <p>
                  {stars <= 3
                    ? 'We gebruiken je feedback om onze service te verbeteren.'
                    : 'Je mening maakt een verschil. Tot binnenkort!'}
                </p>
                <div className="negative-google">{googleLink}</div>
              </div>
            )}
          </>
        )}
      </div>
      <footer className="customer-footer">
        <img src="/brand/mark.png" alt="" /> mogelijk gemaakt door <strong>TrustPulse</strong>
      </footer>
    </main>
  );
}
