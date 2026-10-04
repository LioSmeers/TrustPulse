'use client';
import { useState } from 'react';
import { useStore } from './provider';
import {
  addCustomers,
  parseCustomerCsv,
  type ImportRow,
  type CustomerInput,
} from '@/lib/customers';

export function CustomerManager() {
  const { data, update, saving, online } = useStore();
  const [tab, setTab] = useState('add');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reading, setReading] = useState(false);
  const valid = rows.filter((r) => !r.error && !r.duplicate);
  async function save(inputs: CustomerInput[]) {
    setError('');
    setSuccess('');
    let count = 0;
    try {
      await update((d) => {
        const next = addCustomers(d, inputs);
        count = next.customers.length - d.customers.length;
        return next;
      });
      setSuccess(
        count
          ? `${count} klant${count === 1 ? '' : 'en'} toegevoegd${online ? ' aan je online werkruimte' : ' in deze demo'}. Er is geen bericht verstuurd.`
          : 'Deze nummers staan al in je klantenlijst. Er is niets toegevoegd.',
      );
      setName('');
      setPhone('');
      setRows([]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Opslaan lukt niet.');
    }
  }
  return (
    <section className="panel settings-section customer-manager">
      <h2>Klanten toevoegen</h2>
      <div className="tabs">
        <button
          className={tab === 'add' ? 'selected' : ''}
          onClick={() => {
            setTab('add');
            setError('');
            setSuccess('');
          }}
          disabled={saving || reading}
        >
          Eén klant
        </button>
        <button
          className={tab === 'csv' ? 'selected' : ''}
          onClick={() => {
            setTab('csv');
            setError('');
            setSuccess('');
          }}
          disabled={saving || reading}
        >
          CSV importeren
        </button>
      </div>
      {tab === 'add' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save([{ name, phone }]);
          }}
        >
          <label>
            Naam
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              required
              disabled={saving}
            />
          </label>
          <label>
            Belgisch telefoonnummer <span>(optioneel)</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0476 12 34 56 of +32 476 12 34 56"
              disabled={saving}
              maxLength={40}
            />
          </label>
          <button className="button primary" disabled={saving || !name.trim()}>
            {saving ? 'Opslaan…' : 'Klant opslaan'}
          </button>
        </form>
      ) : (
        <>
          <p>
            Exporteer je Excel-bestand als CSV UTF-8. Gebruik de kolommen <strong>naam</strong> en{' '}
            <strong>telefoon</strong>. Je kunt maximaal 100 klanten tegelijk toevoegen.
          </p>
          <a
            className="text-link"
            download="trustpulse-klanten-voorbeeld.csv"
            href="/examples/klanten.csv"
          >
            Download voorbeeldbestand
          </a>
          <label>
            CSV-bestand
            <input
              type="file"
              accept=".csv,text/csv"
              disabled={saving || reading}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                setRows([]);
                setError('');
                setSuccess('');
                if (!file) return;
                if (file.size > 200000) {
                  setError('Het bestand is te groot. Maximaal 200 kB.');
                  return;
                }
                setReading(true);
                try {
                  setRows(parseCustomerCsv(await file.text(), data.customers));
                } catch (cause) {
                  setError(
                    cause instanceof Error ? cause.message : 'Het bestand kan niet worden gelezen.',
                  );
                } finally {
                  setReading(false);
                }
              }}
            />
          </label>
          {reading && <p role="status">Bestand lezen…</p>}
          {!!rows.length && (
            <>
              <p>
                {valid.length} klaar om toe te voegen · {rows.filter((r) => r.duplicate).length}{' '}
                dubbele nummers · {rows.filter((r) => r.error).length} ongeldige rijen. Dubbele en
                ongeldige rijen worden overgeslagen.
              </p>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Rij</th>
                      <th>Naam</th>
                      <th>Telefoon</th>
                      <th>Controle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.row}>
                        <td>{r.row}</td>
                        <td>{r.name}</td>
                        <td>{r.phone}</td>
                        <td>{r.error || (r.duplicate ? 'Al aanwezig' : 'Klaar')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                className="button primary"
                disabled={saving || !valid.length}
                onClick={() => void save(valid)}
              >
                {saving ? 'Importeren…' : `${valid.length} klanten toevoegen`}
              </button>
            </>
          )}
        </>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {success && <p role="status">{success}</p>}
    </section>
  );
}
