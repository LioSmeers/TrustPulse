export function smsConfig(env: NodeJS.ProcessEnv = process.env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secret = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  const account = env.TWILIO_ACCOUNT_SID;
  const auth = env.TWILIO_AUTH_TOKEN;
  const from = env.TWILIO_FROM_NUMBER;
  const service = env.TWILIO_MESSAGING_SERVICE_SID;
  const origin = publicOrigin(env.NEXT_PUBLIC_APP_URL);
  const missing = [
    ...(!url || !key ? ['Supabase-projectgegevens'] : []),
    ...(!secret ? ['Supabase-serversleutel'] : []),
    ...(!account || !/^AC[a-fA-F0-9]{32}$/.test(account) || !auth
      ? ['Twilio-accountgegevens']
      : []),
    ...(!(service ? /^MG[a-fA-F0-9]{32}$/.test(service) : /^\+[1-9]\d{7,14}$/.test(from || ''))
      ? ['Twilio-afzender']
      : []),
    ...(!origin ? ['Publiek HTTPS-adres van TrustPulse'] : []),
  ];
  return {
    url,
    key,
    secret,
    account,
    auth,
    from,
    service,
    origin,
    missing,
    ready: !missing.length,
  };
}

export function publicOrigin(value?: string) {
  try {
    const url = new URL(value || '');
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    )
      return null;
    if (
      !url.hostname.includes('.') ||
      /(^|\.)(localhost|local|test|internal)$/.test(url.hostname) ||
      /^[\d.]+$/.test(url.hostname) ||
      url.hostname.includes(':')
    )
      return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function validSms(input: unknown, origin: string) {
  if (!input || typeof input !== 'object') return false;
  const { token, name, phone, message } = input as Record<string, unknown>;
  return (
    typeof token === 'string' &&
    /^[a-f0-9]{32}$/.test(token) &&
    typeof name === 'string' &&
    name.trim().length > 0 &&
    name.trim().length <= 80 &&
    typeof phone === 'string' &&
    /^\+324\d{8}$/.test(phone) &&
    typeof message === 'string' &&
    message.trim().length > 0 &&
    message.length <= 640 &&
    message.includes(`${origin}/r/${token}`)
  );
}
