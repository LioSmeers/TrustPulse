'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Save, Upload, Check, Store, Star, Palette, Bell } from 'lucide-react';
import { useStore } from '@/components/provider';
import { PageTitle } from '@/components/ui';
export default function Settings() {
  const { data, ready, update } = useStore();
  return ready ? (
    <SettingsForm
      key={data.business.id}
      initial={data.business}
      save={(business) => update((d) => ({ ...d, business }))}
    />
  ) : (
    <p>Instellingen laden…</p>
  );
}
import { Business } from '@/lib/types';
function SettingsForm({
  initial,
  save,
}: {
  initial: Business;
  save: (b: Business) => Promise<void>;
}) {
  const [business, setBusiness] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const field = (key: keyof Business, value: string | boolean) => {
    setBusiness((b) => ({ ...b, [key]: value }));
    setSaved(false);
  };
  async function upload(file?: File) {
    if (!file) return;
    if (
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
      file.size > 2 * 1024 * 1024
    ) {
      setError('Kies een PNG, JPG of WebP van maximaal 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      field('logoUrl', String(reader.result));
      setError('');
    };
    reader.readAsDataURL(file);
  }
  return (
    <>
      <PageTitle
        title="Instellingen"
        description="Jouw zaak, jouw uitstraling. Houd alles persoonlijk."
      />
      <div className="info-box">
        <Bell size={18} />
        <p>
          Wil je deze app met echte klanten gebruiken?{' '}
          <Link href="/dashboard/setup" className="text-link">
            Bekijk de stappen om live te gaan.
          </Link>
        </p>
      </div>
      <form
        className="settings-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setError('');
          if (business.googleReviewUrl) {
            try {
              const url = new URL(business.googleReviewUrl);
              if (url.protocol !== 'https:') throw new Error();
            } catch {
              setError('Gebruik een geldige Google reviewlink die begint met https://.');
              return;
            }
          }
          setSaving(true);
          setSaved(false);
          try {
            await save(business);
            setSaved(true);
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Opslaan lukt niet. Probeer opnieuw.');
          } finally {
            setSaving(false);
          }
        }}
      >
        <section className="panel settings-section">
          <div className="settings-heading">
            <Store size={20} />
            <div>
              <h2>Bedrijf</h2>
              <p>De gegevens die je klanten herkennen.</p>
            </div>
          </div>
          <div className="settings-fields">
            <label>
              Bedrijfsnaam
              <input
                value={business.name}
                onChange={(e) => field('name', e.target.value)}
                required
                maxLength={100}
              />
            </label>
            <div className="field-grid">
              <label>
                Contact e-mail
                <input
                  type="email"
                  value={business.email}
                  onChange={(e) => field('email', e.target.value)}
                  required
                />
              </label>
              <label>
                Telefoonnummer
                <input
                  type="tel"
                  value={business.phone}
                  onChange={(e) => field('phone', e.target.value)}
                />
              </label>
            </div>
          </div>
        </section>
        <section className="panel settings-section">
          <div className="settings-heading">
            <Star size={20} />
            <div>
              <h2>Reviews</h2>
              <p>Maak het delen van ervaringen gemakkelijk.</p>
            </div>
          </div>
          <div className="settings-fields">
            <label>
              Google review URL
              <input
                type="url"
                placeholder="https://g.page/r/jouw-bedrijf/review"
                value={business.googleReviewUrl}
                onChange={(e) => field('googleReviewUrl', e.target.value)}
              />
              <small>Plak hier de reviewlink uit je Google Bedrijfsprofiel.</small>
            </label>
            <label>
              Standaard SMS-bericht
              <textarea
                rows={4}
                value={business.defaultSms}
                onChange={(e) => field('defaultSms', e.target.value)}
                required
                maxLength={480}
              />
              <small>
                Gebruik {'{naam}'}, {'{bedrijf}'} en {'{link}'} voor persoonlijke berichten.
              </small>
            </label>
          </div>
        </section>
        <section className="panel settings-section">
          <div className="settings-heading">
            <Palette size={20} />
            <div>
              <h2>Branding</h2>
              <p>Herkenbaar voor jouw klanten.</p>
            </div>
          </div>
          <div className="settings-fields">
            <label>
              Bedrijfslogo
              <div className="logo-upload">
                <span className="logo-preview">
                  {business.logoUrl ? <img src={business.logoUrl} alt="Bedrijfslogo" /> : 'BV'}
                </span>
                <label className="button secondary upload-button">
                  <Upload size={16} /> Logo uploaden
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => upload(e.target.files?.[0])}
                  />
                </label>
                <small>PNG, JPG of WebP · max. 2 MB</small>
              </div>
            </label>
            <label>
              Accentkleur
              <div className="color-input">
                <input
                  type="color"
                  value={business.accentColor}
                  onChange={(e) => field('accentColor', e.target.value)}
                />
                <span>{business.accentColor.toUpperCase()}</span>
              </div>
              <small>Wordt gebruikt voor knoppen op je klantpagina.</small>
            </label>
          </div>
        </section>
        <section className="panel settings-section">
          <div className="settings-heading">
            <Bell size={20} />
            <div>
              <h2>Meldingen</h2>
              <p>Blijf op de hoogte van wat aandacht vraagt.</p>
            </div>
          </div>
          <div className="settings-fields">
            <label className="toggle-row">
              <div>
                <strong>E-mail bij nieuwe negatieve feedback</strong>
                <small>Ontvang een melding op {business.email}.</small>
              </div>
              <input
                type="checkbox"
                className="toggle"
                checked={business.notifyFeedback}
                onChange={(e) => field('notifyFeedback', e.target.checked)}
              />
            </label>
            <p className="muted">
              Deze voorkeur wordt bewaard. E-mailmeldingen zijn nog niet gekoppeld.
            </p>
          </div>
        </section>
        <div className="settings-save">
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {saved && (
            <span className="save-success" role="status">
              <Check size={17} /> Instellingen opgeslagen
            </span>
          )}
          <button className="button primary" disabled={saving}>
            <Save size={17} />
            {saving ? 'Opslaan…' : 'Wijzigingen opslaan'}
          </button>
        </div>
      </form>
    </>
  );
}
