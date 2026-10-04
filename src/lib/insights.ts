import type { Store } from './types';

const DAY = 86_400_000;
const average = (rows: { stars: number }[]) =>
  rows.length ? rows.reduce((sum, row) => sum + row.stars, 0) / rows.length : null;

export function reviewSummary(reviews: Store['reviews'], now = Date.now()) {
  const google = reviews.filter((r) => r.platform === 'Google');
  return {
    count: google.length,
    average: average(google),
    recent: google.filter((r) => {
      const time = Date.parse(r.createdAt);
      return time > now - 30 * DAY && time <= now;
    }).length,
    distribution: [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      percent: google.length
        ? Math.round((google.filter((r) => r.stars === stars).length / google.length) * 100)
        : 0,
    })),
  };
}

export function dashboardInsights(data: Store, days: number, now = Date.now()) {
  const start = now - days * DAY;
  const previousStart = start - days * DAY;
  const inCurrent = (date: string) => Date.parse(date) > start && Date.parse(date) <= now;
  const inPrevious = (date: string) =>
    Date.parse(date) > previousStart && Date.parse(date) <= start;
  const countChange = (current: number, previous: number) =>
    previous
      ? `${current >= previous ? '+' : ''}${Math.round(((current - previous) / previous) * 100)}%`
      : null;
  const invitations = data.invitations.filter((i) => inCurrent(i.sentAt));
  const ratings = data.ratings.filter((r) => inCurrent(r.createdAt));
  const previousAverage = average(data.ratings.filter((r) => inPrevious(r.createdAt)));
  const currentAverage = average(ratings);
  const reviews = data.reviews.filter((r) => inCurrent(r.createdAt));
  const open = data.feedback.filter((f) => f.status === 'open').length;
  const activity = [
    ...reviews.map((r) => ({
      id: `review-${r.id}`,
      name: data.customers.find((c) => c.id === r.customerId)?.name || 'Klant',
      stars: r.stars,
      title: `Nieuwe ${r.stars}-sterren review`,
      date: r.createdAt,
      type: r.platform === 'Google' ? 'google' : 'rating',
      href: '/dashboard/reviews',
    })),
    ...data.feedback
      .filter((f) => inCurrent(f.createdAt))
      .map((f) => {
        const rating = data.ratings.find((r) => r.id === f.ratingId);
        const invitation = data.invitations.find((i) => i.id === rating?.invitationId);
        return {
          id: `feedback-${f.id}`,
          name: data.customers.find((c) => c.id === invitation?.customerId)?.name || 'Klant',
          stars: rating?.stars || 0,
          title: f.status === 'resolved' ? 'Feedback opgevolgd' : 'Nieuwe feedback ontvangen',
          date: f.createdAt,
          type: 'feedback',
          href: '/dashboard/feedback',
        };
      }),
    ...ratings
      .filter((r) => !data.feedback.some((f) => f.ratingId === r.id))
      .map((r) => {
        const invitation = data.invitations.find((i) => i.id === r.invitationId);
        return {
          id: `rating-${r.id}`,
          name: data.customers.find((c) => c.id === invitation?.customerId)?.name || 'Klant',
          stars: r.stars,
          title: 'Nieuwe beoordeling ontvangen',
          date: r.createdAt,
          type: 'rating',
          href: '/dashboard/customers',
        };
      }),
  ]
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date) || a.id.localeCompare(b.id))
    .slice(0, 5);
  return {
    invitations: invitations.length,
    invitationChange: countChange(
      invitations.length,
      data.invitations.filter((i) => inPrevious(i.sentAt)).length,
    ),
    average: currentAverage,
    ratingCount: ratings.length,
    averageChange:
      currentAverage !== null && previousAverage !== null
        ? `${currentAverage >= previousAverage ? '+' : ''}${(currentAverage - previousAverage).toFixed(1)}`
        : null,
    reviews: reviews.length,
    reviewChange: countChange(
      reviews.length,
      data.reviews.filter((r) => inPrevious(r.createdAt)).length,
    ),
    open,
    activity,
    google: reviewSummary(data.reviews, now),
  };
}
