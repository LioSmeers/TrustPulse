import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { invitationMessage } from '@/lib/invitation-message';
import { smsConfig, validSms } from '@/lib/services/sms-config';
import { smsAdmin, smsUser } from '@/lib/services/sms-server';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  if (!(await smsUser(request)))
    return NextResponse.json({ error: 'Log eerst in.' }, { status: 401 });
  const c = smsConfig();
  const missing = [...c.missing];
  if (c.url && c.secret) {
    const { error } = await smsAdmin().rpc('sms_ready');
    if (error) missing.push('SMS-databasemigratie');
  } else missing.push('SMS-databasemigratie');
  return NextResponse.json(
    { ready: !missing.length, missing, origin: c.origin },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request: Request) {
  const user = await smsUser(request);
  if (!user) return NextResponse.json({ error: 'Log eerst in.' }, { status: 401 });
  const c = smsConfig();
  if (!c.ready)
    return NextResponse.json(
      { error: 'SMS is nog niet gekoppeld. Werk de stappen bij Startklaar af.' },
      { status: 503 },
    );
  const raw = await request.text();
  if (raw.length > 8000) return NextResponse.json({ error: 'Bericht te groot.' }, { status: 400 });
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Ongeldig verzoek.' }, { status: 400 });
  }
  if (input && typeof input === 'object' && typeof input.message === 'string' &&
      typeof input.token === 'string' && /^[a-f0-9]{32}$/.test(input.token)) {
    input.message = invitationMessage(input.message, `${c.origin}/r/${input.token}`);
  }
  if (!validSms(input, c.origin!))
    return NextResponse.json(
      {
        error:
          'Controleer de naam, het Belgische mobiele nummer en de persoonlijke link (maximaal 640 tekens).',
      },
      { status: 400 },
    );
  const admin = smsAdmin();
  const { data: reservation, error } = await admin.rpc('reserve_sms', {
    p_user_id: user.id,
    p_token: input.token,
    p_name: input.name.trim(),
    p_phone: input.phone,
    p_message: input.message,
  });
  if (error)
    return NextResponse.json(
      {
        error:
          error.message === 'SMS limit reached'
            ? 'SMS-limiet bereikt. Maximaal 10 per minuut en 100 per dag.'
            : 'Het SMS-verzoek kon niet worden opgeslagen. Controleer de databasekoppeling.',
      },
      { status: error.message === 'SMS limit reached' ? 429 : 503 },
    );
  // An existing reservation is never posted to Twilio again, including after timeouts.
  if (!reservation.send) return NextResponse.json({ status: reservation.status, duplicate: true });
  const provider = twilio(c.account!, c.auth!, { autoRetry: false, timeout: 15000 });
  try {
    const result = await provider.messages.create({
      to: input.phone,
      body: input.message,
      ...(c.service ? { messagingServiceSid: c.service } : { from: c.from! }),
      statusCallback: `${c.origin}/api/sms/status?token=${input.token}`,
    });
    const { error: saveError } = await admin.rpc('record_sms_result', {
      p_token: input.token,
      p_sid: result.sid,
      p_status: result.status,
      p_error: result.errorCode?.toString() ?? null,
    });
    return NextResponse.json({ status: saveError ? 'unknown' : result.status });
  } catch (cause) {
    const failure = cause as { status?: number; code?: number };
    const status =
      failure.status && failure.status >= 400 && failure.status < 500 ? 'failed' : 'unknown';
    await admin.rpc('record_sms_result', {
      p_token: input.token,
      p_sid: null,
      p_status: status,
      p_error: failure.code?.toString() ?? null,
    });
    return NextResponse.json({ status });
  }
}
