import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { smsConfig } from './sms-config';

export function smsAdmin() {
  const c = smsConfig();
  if (!c.url || !c.secret) throw new Error('SMS configuration missing');
  return createClient(c.url, c.secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function smsUser(request: Request) {
  const c = smsConfig();
  const bearer = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!bearer || !c.url || !c.key) return null;
  const client = createClient(c.url, c.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(bearer);
  return error ? null : data.user;
}
