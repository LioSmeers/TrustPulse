import type { Store } from '../types';

export const emptyStore: Store = {
  business: {
    id: '',
    name: 'TrustPulse',
    logoUrl: '',
    accentColor: '#315F9A',
    googleReviewUrl: '',
    phone: '',
    email: '',
    defaultSms:
      'Dag {naam}, bedankt voor je bezoek aan {bedrijf}!\nHoe was je ervaring?\nBeoordeel ons via:\n{link}',
    notifyFeedback: false,
  },
  customers: [],
  invitations: [],
  ratings: [],
  reviews: [],
  feedback: [],
};

export function camelize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(camelize);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [
        key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
        camelize(val),
      ]),
    );
  }
  return value;
}

export function workspaceChanges(before: Store, after: Store) {
  return {
    business:
      JSON.stringify(before.business) === JSON.stringify(after.business) ? null : after.business,
    customers: after.customers.filter((c) => !before.customers.some((old) => old.id === c.id)),
    invitations: after.invitations.filter(
      (i) => !before.invitations.some((old) => old.id === i.id),
    ),
    feedback: after.feedback
      .filter((f) => before.feedback.some((old) => old.id === f.id && old.status !== f.status))
      .map((f) => ({ id: f.id, status: f.status })),
  };
}

export function publicStore(payload: unknown): Store {
  if (!payload) return emptyStore;
  const result = camelize(payload) as {
    business: Partial<Store['business']>;
    invitation: Store['invitations'][number];
    rating: Store['ratings'][number] | null;
  };
  return {
    ...emptyStore,
    business: { ...emptyStore.business, ...result.business },
    invitations: [result.invitation],
    ratings: result.rating ? [result.rating] : [],
  };
}
