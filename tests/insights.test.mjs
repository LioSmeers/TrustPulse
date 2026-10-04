import test from 'node:test';
import assert from 'node:assert/strict';
import { dashboardInsights, reviewSummary } from '../src/lib/insights.ts';
import { initialStore } from '../src/lib/mock-data.ts';

const now = Date.parse('2026-10-04T12:00:00Z');
const empty = () => ({ ...initialStore, invitations: [], ratings: [], reviews: [], feedback: [] });

test('empty workspace has no fabricated totals, averages or comparisons', () => {
  const result = dashboardInsights(empty(), 30, now);
  assert.equal(result.invitations, 0);
  assert.equal(result.average, null);
  assert.equal(result.averageChange, null);
  assert.equal(result.reviewChange, null);
  assert.equal(result.open, 0);
  assert.deepEqual(result.activity, []);
  assert.equal(result.google.average, null);
  assert.ok(result.google.distribution.every((row) => row.percent === 0));
});

test('seed totals and Google summary are computed from actual records', () => {
  const result = dashboardInsights(initialStore, 7, now);
  assert.equal(result.invitations, 7);
  assert.equal(result.ratingCount, 7);
  assert.equal(result.average, 26 / 7);
  assert.equal(result.reviews, 4);
  assert.equal(result.open, 2);
  assert.equal(result.google.count, 4);
  assert.equal(result.google.average, 4.75);
  assert.deepEqual(result.google.distribution.map((r) => r.percent), [75, 25, 0, 0, 0]);
});

test('period boundaries are disjoint and future records are excluded', () => {
  const store = empty();
  store.invitations = [
    { id: 'previous', sentAt: '2026-09-27T12:00:00Z' },
    { id: 'current', sentAt: '2026-09-27T12:00:00.001Z' },
    { id: 'now', sentAt: '2026-10-04T12:00:00Z' },
    { id: 'future', sentAt: '2026-10-04T12:00:00.001Z' },
  ];
  const result = dashboardInsights(store, 7, now);
  assert.equal(result.invitations, 2);
  assert.equal(result.invitationChange, '+100%');
});

test('new feedback appears in activity and open total updates when resolved', () => {
  const store = structuredClone(initialStore);
  store.feedback.push({ id: 'new', ratingId: 'rating0', status: 'open', createdAt: '2026-10-04T11:59:00Z' });
  let result = dashboardInsights(store, 7, now);
  assert.equal(result.activity[0].id, 'feedback-new');
  assert.equal(result.activity[0].name, 'Sophie K.');
  assert.equal(result.open, 3);
  store.feedback.at(-1).status = 'resolved';
  result = dashboardInsights(store, 7, now);
  assert.equal(result.open, 2);
  assert.equal(result.activity[0].title, 'Feedback opgevolgd');
});

test('rating alone is not counted as a published review', () => {
  const store = empty();
  store.ratings = [{ id: 'r', invitationId: 'i0', stars: 5, createdAt: '2026-10-04T11:00:00Z' }];
  const result = dashboardInsights(store, 7, now);
  assert.equal(result.average, 5);
  assert.equal(result.reviews, 0);
  assert.equal(result.google.count, 0);
  assert.equal(result.activity[0].type, 'rating');
});

test('Google summary excludes TrustPulse reviews', () => {
  const summary = reviewSummary([
    { platform: 'Google', stars: 4, createdAt: '2026-10-01T12:00:00Z' },
    { platform: 'TrustPulse', stars: 1, createdAt: '2026-10-01T12:00:00Z' },
  ], now);
  assert.equal(summary.count, 1);
  assert.equal(summary.average, 4);
  assert.equal(summary.recent, 1);
});
