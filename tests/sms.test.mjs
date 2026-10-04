import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicOrigin, smsConfig, validSms } from '../src/lib/services/sms-config.ts';
import twilio from 'twilio';

test('real SMS requires server secrets, sender and a public HTTPS app origin', () => {
  assert.equal(smsConfig({}).ready, false);
  for (const url of [
    'http://example.com',
    'https://localhost',
    'https://127.0.0.1',
    'https://example.com/path',
    'https://a:password@example.com',
    'https://example.test',
  ])
    assert.equal(publicOrigin(url), null);
  assert.equal(publicOrigin('https://trustpulse.example.com/'), 'https://trustpulse.example.com');
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public',
    SUPABASE_SECRET_KEY: 'secret',
    TWILIO_ACCOUNT_SID: 'AC' + '1'.repeat(32),
    TWILIO_AUTH_TOKEN: 'secret',
    TWILIO_FROM_NUMBER: '+12345678901',
    NEXT_PUBLIC_APP_URL: 'https://trustpulse.example.com',
  };
  assert.equal(smsConfig(env).ready, true);
  assert.equal(
    smsConfig({
      ...env,
      TWILIO_FROM_NUMBER: undefined,
      TWILIO_MESSAGING_SERVICE_SID: 'MG' + '1'.repeat(32),
    }).ready,
    true,
  );
});

test('SMS payload validates Belgian mobile number, message bounds and canonical personal link', () => {
  const origin = 'https://trustpulse.example.com';
  const token = 'a'.repeat(32);
  const input = {
    token,
    name: 'Klant',
    phone: '+32476123456',
    message: `Dag! ${origin}/r/${token}`,
  };
  assert.equal(validSms(input, origin), true);
  for (const patch of [
    { phone: '+3221234567' },
    { token: 'bad' },
    { name: ' ' },
    { message: 'x'.repeat(641) },
    { message: `http://localhost/r/${token}` },
  ])
    assert.equal(validSms({ ...input, ...patch }, origin), false);
});

test('Twilio signature covers the configured HTTPS callback URL and every form parameter', () => {
  const url = 'https://trustpulse.example.com/api/sms/status?token=' + 'a'.repeat(32);
  const params = {
    MessageSid: 'SM' + '1'.repeat(32),
    MessageStatus: 'delivered',
    AccountSid: 'AC' + '2'.repeat(32),
    FutureParameter: 'supported',
  };
  const signature = twilio.getExpectedTwilioSignature('test-secret', url, params);
  assert.equal(twilio.validateRequest('test-secret', signature, url, params), true);
  assert.equal(
    twilio.validateRequest('test-secret', signature, url, { ...params, MessageStatus: 'failed' }),
    false,
  );
  assert.equal(
    twilio.validateRequest('test-secret', signature, url.replace('https:', 'http:'), params),
    false,
  );
});
