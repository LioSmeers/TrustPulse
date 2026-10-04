import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addCustomers, belgianPhone, parseCustomerCsv } from '../src/lib/customers.ts';

test('Belgian numbers normalize before matching duplicates; invalid input is rejected', () => {
  for (const value of ['0476 12 34 56', '+32 (476) 12-34-56', '0032476123456'])
    assert.equal(belgianPhone(value), '+32476123456');
  assert.equal(belgianPhone('02 123 45 67'), '+3221234567');
  for (const value of ['+320476123456', 'abc0476123456', '+31476123456', '123'])
    assert.equal(belgianPhone(value), null);
});

test('CSV supports Excel separators, BOM, escaped quotes and quoted commas', () => {
  const rows = parseCustomerCsv('\uFEFFnaam;telefoon\r\n"Jos ""Peeters""";0476 12 34 56\r\n', []);
  assert.equal(rows[0].name, 'Jos "Peeters"');
  assert.equal(rows[0].phone, '+32476123456');
  assert.equal(rows[0].error, undefined);
  assert.equal(parseCustomerCsv('name,phone\n"Jan, Jr.",+32477123456', [])[0].name, 'Jan, Jr.');
});

test('preview flags existing and repeated numbers, invalid rows, and rejects malformed files', () => {
  const rows = parseCustomerCsv(
    'naam;telefoon\nA;0476123456\nB;0477123456\nC;+32477123456\n;0488123456\nD;bad\nE;0499123456;extra',
    [{ phone: '+32476123456' }],
  );
  assert.deepEqual(
    rows.map((r) => Boolean(r.duplicate)),
    [true, false, true, false, false, false],
  );
  assert.equal(rows.filter((r) => r.error).length, 3);
  for (const text of [
    'foo,bar\na,b',
    'naam;telefoon\n"open;0476123456',
    'naam;telefoon\n',
    'naam;telefoon\n' + Array(101).fill('Klant;0476123456').join('\n'),
  ])
    assert.throws(() => parseCustomerCsv(text, []));
});

test('adding customers rechecks duplicates without changing records or making invitations', () => {
  const data = {
    business: { id: 'zaak' },
    customers: [{ id: 'existing', name: 'Bestaand', phone: '+32476123456' }],
    invitations: [],
  };
  const next = addCustomers(data, [
    { name: 'Andere naam', phone: '0476123456' },
    { name: 'Nieuw', phone: '0477123456' },
    { name: 'Dubbel', phone: '+32477123456' },
  ]);
  assert.equal(next.customers.length, 2);
  assert.equal(next.customers[0].businessId, 'zaak');
  assert.equal(next.customers[1].name, 'Bestaand');
  assert.deepEqual(next.invitations, []);
  assert.equal(data.customers.length, 1);
});
