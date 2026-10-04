import test from 'node:test';
import assert from 'node:assert/strict';
import { addDemoInvitation } from '../src/lib/invitations.ts';
import { initialStore } from '../src/lib/mock-data.ts';

test('recording the same token twice does not create duplicate customers or invitations', () => {
  const input = { token: 'unique', name: 'Nieuwe klant', phone: '', message: 'Test' };
  const once = addDemoInvitation(initialStore, input);
  assert.equal(once.customers.length, initialStore.customers.length + 1);
  assert.equal(once.invitations.length, initialStore.invitations.length + 1);
  assert.equal(addDemoInvitation(once, input), once);
  assert.equal(once.invitations[0].customerId, once.customers[0].id);
});

test('a new invitation reuses a customer with the same phone number', () => {
  const existing = initialStore.customers[0];
  const result = addDemoInvitation(initialStore, {
    token: 'return-visit',
    name: existing.name,
    phone: existing.phone,
    message: 'Nieuwe uitnodiging',
  });
  assert.equal(result.customers.length, initialStore.customers.length);
  assert.equal(result.invitations[0].customerId, existing.id);
  assert.equal(result.invitations[0].businessId, initialStore.business.id);
  assert.equal(initialStore.invitations.length, 7);
});
