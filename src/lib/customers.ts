import type { Customer, Store } from './types';

export interface CustomerInput {
  name: string;
  phone: string;
}
export interface ImportRow extends CustomerInput {
  row: number;
  error?: string;
  duplicate?: boolean;
}

export function belgianPhone(value: string): string | null {
  if (!value.trim()) return '';
  if (!/^[+\d\s().-]+$/.test(value)) return null;
  let digits = value.replace(/[\s().-]/g, '');
  if (digits.startsWith('0032')) digits = '+' + digits.slice(2);
  else if (digits.startsWith('0')) digits = '+32' + digits.slice(1);
  return /^\+32[1-9]\d{7,8}$/.test(digits) ? digits : null;
}

function csvRecords(text: string): string[][] {
  text = text.replace(/^\uFEFF/, '');
  const counts = new Map([
    [',', 0],
    [';', 0],
    ['\t', 0],
  ]);
  let quoted = false;
  for (const char of text) {
    if (char === '"') quoted = !quoted;
    if (!quoted && (char === '\r' || char === '\n')) break;
    if (!quoted && counts.has(char)) counts.set(char, counts.get(char)! + 1);
  }
  const delimiter = [...counts].sort((a, b) => b[1] - a[1])[0][0];
  const records: string[][] = [];
  let fields: string[] = [];
  let value = '';
  let closed = false;
  quoted = false;
  const field = () => {
    fields.push(value.trim());
    value = '';
    closed = false;
  };
  const record = () => {
    field();
    records.push(fields);
    fields = [];
  };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        value += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
        closed = true;
      } else value += char;
    } else if (char === delimiter) field();
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      record();
    } else if (char === '"') {
      if (value.trim() || closed) throw new Error('Ongeldige aanhalingstekens in het CSV-bestand.');
      value = '';
      quoted = true;
    } else {
      if (closed && char.trim()) throw new Error('Ongeldige tekst na een afgesloten CSV-veld.');
      if (!closed) value += char;
    }
  }
  if (quoted) throw new Error('Een aanhalingsteken is niet afgesloten.');
  if (value || fields.length || closed) record();
  return records;
}

export function parseCustomerCsv(text: string, existing: Customer[]): ImportRow[] {
  if (text.length > 200000) throw new Error('Het bestand is te groot. Maximaal 200 kB.');
  if (text.includes('\uFFFD'))
    throw new Error('Dit bestand is niet correct leesbaar. Exporteer het als CSV UTF-8.');
  const records = csvRecords(text);
  const header = records.shift()?.map((v) => v.toLowerCase());
  const nameIndex = header?.findIndex((v) => v === 'naam' || v === 'name') ?? -1;
  const phoneIndex =
    header?.findIndex((v) => v === 'telefoon' || v === 'phone' || v === 'telefoonnummer') ?? -1;
  if (nameIndex < 0 || phoneIndex < 0)
    throw new Error('Gebruik de kolommen naam en telefoon. Download het voorbeeldbestand.');
  const rows = records
    .map((fields, i) => ({ fields, row: i + 2 }))
    .filter((r) => r.fields.some((v) => v));
  if (!rows.length) throw new Error('Dit bestand bevat geen klanten.');
  if (rows.length > 100) throw new Error('Importeer maximaal 100 klanten per bestand.');
  const phones = new Set(existing.map((c) => belgianPhone(c.phone)).filter(Boolean));
  return rows.map(({ fields, row }) => {
    const name = (fields[nameIndex] || '').replace(/\s+/g, ' ').trim();
    const rawPhone = fields[phoneIndex] || '';
    const phone = belgianPhone(rawPhone);
    const error =
      fields.length !== header!.length
        ? 'Aantal kolommen klopt niet'
        : !name || name.length > 80
          ? 'Naam nodig (maximaal 80 tekens)'
          : !phone
            ? 'Geldig Belgisch nummer nodig'
            : undefined;
    const duplicate = !error && phones.has(phone!);
    if (!error) phones.add(phone!);
    return { row, name, phone: phone ?? rawPhone, error, duplicate };
  });
}

export function addCustomers(data: Store, inputs: CustomerInput[]): Store {
  const phones = new Set(data.customers.map((c) => belgianPhone(c.phone)).filter(Boolean));
  const now = new Date().toISOString();
  const added: Customer[] = [];
  for (const input of inputs) {
    const name = input.name.trim();
    const phone = belgianPhone(input.phone);
    if (!name || name.length > 80 || phone === null)
      throw new Error('Controleer naam en telefoonnummer.');
    if (phone && phones.has(phone)) continue;
    if (phone) phones.add(phone);
    added.push({
      id: crypto.randomUUID(),
      businessId: data.business.id,
      name,
      phone,
      createdAt: now,
    });
  }
  if (added.length > 100) throw new Error('Maximaal 100 klanten tegelijk toevoegen.');
  return { ...data, customers: [...added, ...data.customers] };
}
