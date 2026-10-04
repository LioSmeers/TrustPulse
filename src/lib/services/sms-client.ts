import { getSupabase } from '../supabase/client';

export interface SmsSetup {
  ready: boolean;
  missing: string[];
  origin: string | null;
}
export async function smsRequest(method: 'GET' | 'POST', input?: unknown) {
  const { data } = await getSupabase().auth.getSession();
  if (!data.session) throw new Error('Log eerst in.');
  const response = await fetch('/api/sms', {
    method,
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      'Content-Type': 'application/json',
    },
    ...(input ? { body: JSON.stringify(input) } : {}),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'De SMS-koppeling is niet bereikbaar.');
  return result;
}
export const deliveryLabels: Record<string, string> = {
  submitting: 'Verzending controleren',
  unknown: 'Verzending onzeker',
  accepted: 'In wachtrij',
  queued: 'In wachtrij',
  sending: 'Wordt verstuurd',
  sent: 'Verstuurd naar netwerk',
  delivered: 'Afgeleverd',
  undelivered: 'Niet afgeleverd',
  failed: 'Verzending mislukt',
  canceled: 'Geannuleerd',
};
