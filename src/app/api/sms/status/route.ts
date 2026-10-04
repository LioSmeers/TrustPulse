import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { smsConfig } from '@/lib/services/sms-config';
import { smsAdmin } from '@/lib/services/sms-server';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const c = smsConfig();
  if (!c.ready) return new NextResponse(null, { status: 503 });
  if (!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded'))
    return new NextResponse(null, { status: 415 });
  const raw = await request.text();
  if (raw.length > 16000) return new NextResponse(null, { status: 413 });
  const params = Object.fromEntries(new URLSearchParams(raw));
  const requestUrl = new URL(request.url);
  const signature = request.headers.get('x-twilio-signature') || '';
  const canonicalUrl = `${c.origin}/api/sms/status${requestUrl.search}`;
  if (
    !twilio.validateRequest(c.auth!, signature, canonicalUrl, params) ||
    params.AccountSid !== c.account
  )
    return new NextResponse(null, { status: 403 });
  const token = requestUrl.searchParams.get('token');
  if (
    !token ||
    !/^[a-f0-9]{32}$/.test(token) ||
    !/^SM[a-fA-F0-9]{32}$/.test(params.MessageSid || '')
  )
    return new NextResponse(null, { status: 400 });
  if (
    ![
      'accepted',
      'queued',
      'sending',
      'sent',
      'delivered',
      'undelivered',
      'failed',
      'canceled',
    ].includes(params.MessageStatus)
  )
    return new NextResponse(null, { status: 204 });
  const { error } = await smsAdmin().rpc('record_sms_result', {
    p_token: token,
    p_sid: params.MessageSid,
    p_status: params.MessageStatus,
    p_error: params.ErrorCode || null,
  });
  return new NextResponse(null, { status: error ? 503 : 204 });
}
