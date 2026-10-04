import test from 'node:test';
import assert from 'node:assert/strict';
import { camelize, workspaceChanges, publicStore, emptyStore } from '../src/lib/supabase/data.ts';
import { initialStore } from '../src/lib/mock-data.ts';

test('database mapping preserves nested values and converts columns', () => {
  assert.deepEqual(camelize({ business_id: 'id', contact_allowed: false, rows: [{ created_at: 'date' }], label: null }), { businessId: 'id', contactAllowed: false, rows: [{ createdAt: 'date' }], label: null });
});
test('workspace writes exclude existing customers, invitations, ratings and reviews', () => {
  const after = structuredClone(initialStore);
  after.feedback[0].status = 'resolved';
  after.ratings[0].stars = 1;
  const patch = workspaceChanges(initialStore, after);
  assert.equal(patch.business, null);
  assert.deepEqual(patch.customers, []);
  assert.deepEqual(patch.invitations, []);
  assert.deepEqual(patch.feedback, [{ id: 'f1', status: 'resolved' }]);
  assert.equal('ratings' in patch, false);
  assert.equal('reviews' in patch, false);
});
test('public responses never reuse demo customers or feedback', () => {
  const result = publicStore({ business: { id: 'business', name: 'Zaak' }, invitation: { id: 'inv', token: 'token' }, rating: null });
  assert.deepEqual(result.customers, []);
  assert.deepEqual(result.feedback, []);
  assert.equal(result.business.email, '');
  assert.equal(publicStore(null), emptyStore);
});
