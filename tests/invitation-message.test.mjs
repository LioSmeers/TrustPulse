import test from 'node:test';
import assert from 'node:assert/strict';
import { invitationScript, invitationMessage } from '../src/lib/invitation-message.ts';

test('customer link is appended once even when the editable script omits or replaces it', () => {
  const link = 'https://trustpulse.example/r/abc';
  assert.equal(invitationMessage('Hallo Thomas', link), `Hallo Thomas\n\n${link}`);
  assert.equal(invitationMessage(`Hallo Thomas\n${link}\nhttps://other.example/review`, link), `Hallo Thomas\n\n${link}`);
  assert.equal(invitationMessage('Hallo Thomas {link}', link), `Hallo Thomas\n\n${link}`);
});

test('editing preserves spaces and cannot override the destination with pasted URLs', () => {
  assert.equal(invitationScript('Hallo '), 'Hallo ');
  assert.equal(invitationScript('Hallo https://evil.example/x www.other.example {link}'), 'Hallo   ');
});
