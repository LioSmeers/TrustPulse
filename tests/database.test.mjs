import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.TRUSTPULSE_PGLITE_PATH || '@electric-sql/pglite');
const db = new PGlite();
const ownerA = '11111111-1111-4111-8111-111111111111';
const ownerB = '22222222-2222-4222-8222-222222222222';
const customer = '33333333-3333-4333-8333-333333333333';
const invitation = '44444444-4444-4444-8444-444444444444';
const token = 'a'.repeat(32);
let workspaceA, workspaceB, feedbackId;
const rpc = async (sql, args = []) => (await db.query(sql, args)).rows[0]?.result;
const asUser = async (id) => {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id || '']);
  await db.exec(id ? 'set role authenticated' : 'set role anon');
};
const save = (changes) =>
  db.query('select public.save_workspace($1::jsonb)', [JSON.stringify(changes)]);
const publicCall = (action = 'load', stars = null, message = null, contact = false) =>
  rpc('select public.public_invitation($1,$2,$3,$4,$5) as result', [
    token,
    action,
    stars,
    message,
    contact,
  ]);

before(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated;
    grant execute on function auth.uid() to anon,authenticated;`);
  await db.query('insert into auth.users values ($1,$2,$3),($4,$5,$6)', [
    ownerA,
    'a@example.test',
    '{"business_name":"Zaak A"}',
    ownerB,
    'b@example.test',
    '{"business_name":"Zaak B"}',
  ]);
  await db.exec(await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8'));
  await db.exec('grant usage on schema public to service_role');
  await db.exec(await readFile(new URL('../supabase/sms.sql', import.meta.url), 'utf8'));
});
after(() => db.close());

test('anonymous users cannot load workspaces or read customer tables', async () => {
  await asUser(null);
  await assert.rejects(db.query('select public.load_workspace()'), /permission denied/);
  await assert.rejects(db.query('select * from public.customers'), /permission denied/);
  assert.equal(await rpc("select public.public_invitation('unknown') as result"), null);
});

test('each authenticated user gets a separate, empty workspace', async () => {
  await asUser(ownerA);
  workspaceA = await rpc('select public.load_workspace() as result');
  assert.equal(workspaceA.business.name, 'Zaak A');
  assert.deepEqual(workspaceA.customers, []);
  assert.equal(
    (await rpc('select public.load_workspace() as result')).business.id,
    workspaceA.business.id,
  );
  await asUser(ownerB);
  workspaceB = await rpc('select public.load_workspace() as result');
  assert.notEqual(workspaceA.business.id, workspaceB.business.id);
});

test('customer and invitation are saved atomically in the authenticated business', async () => {
  await asUser(ownerA);
  await save({
    customers: [{ id: customer, name: 'Klant', phone: '+32476123456' }],
    invitations: [{ id: invitation, customerId: customer, token, message: 'Testuitnodiging' }],
  });
  const data = await rpc('select public.load_workspace() as result');
  assert.equal(data.customers.length, 1);
  assert.equal(data.invitations[0].business_id, workspaceA.business.id);
  await asUser(ownerB);
  assert.deepEqual((await rpc('select public.load_workspace() as result')).customers, []);
  await assert.rejects(
    save({
      invitations: [
        {
          id: '55555555-5555-4555-8555-555555555555',
          customerId: customer,
          token: 'b'.repeat(32),
          message: 'Hijack',
        },
      ],
    }),
    /Invalid customer/,
  );
  await assert.rejects(save({ business: { id: workspaceA.business.id } }), /Invalid workspace/);
});

test('public token allows a rating and idempotent feedback without disclosing personal data', async () => {
  await asUser(null);
  let data = await publicCall();
  assert.equal(data.business.email, undefined);
  assert.equal(data.invitation.customer_id, undefined);
  assert.equal(data.invitation.message, undefined);
  await assert.rejects(publicCall('rate', 6), /Invalid rating/);
  await assert.rejects(publicCall('feedback', null, 'Test'), /A rating is required/);
  data = await publicCall('rate', 2);
  assert.equal(data.rating.stars, 2);
  const ratingId = data.rating.id;
  assert.equal((await publicCall('rate', 3)).rating.id, ratingId);
  await assert.rejects(publicCall('feedback', null, ' '.repeat(10)), /Invalid feedback/);
  await publicCall('feedback', null, 'Wachttijd was lang', true);
  await publicCall('feedback', null, 'Aangepaste feedback', false);
  await asUser(ownerA);
  const dataA = await rpc('select public.load_workspace() as result');
  assert.equal(dataA.feedback.length, 1);
  assert.equal(dataA.feedback[0].message, 'Aangepaste feedback');
  assert.equal(dataA.feedback[0].contact_allowed, false);
  feedbackId = dataA.feedback[0].id;
  await asUser(ownerB);
  await assert.rejects(
    save({ feedback: [{ id: feedbackId, status: 'resolved' }] }),
    /Invalid feedback/,
  );
  await asUser(ownerA);
  await save({ feedback: [{ id: feedbackId, status: 'resolved' }] });
  assert.equal(
    (await rpc('select public.load_workspace() as result')).feedback[0].status,
    'resolved',
  );
});

test('per-token request limits and token expiration are enforced in the database', async () => {
  await db.exec('reset role');
  await db.query(
    'update public.invitation_request_limits set requests=60,window_start=now() where invitation_id=$1',
    [invitation],
  );
  await asUser(null);
  await assert.rejects(publicCall(), /Too many requests/);
  await db.exec('reset role');
  await db.query("update public.invitations set expires_at=now()-interval '1 second' where id=$1", [
    invitation,
  ]);
  await asUser(null);
  assert.equal(await publicCall(), null);
});

test('SMS functions are server-only, reserve once and preserve terminal delivery statuses', async () => {
  const smsToken = 'c'.repeat(32);
  const sid = 'SM' + '1'.repeat(32);
  const reserve = (uid = ownerA, tok = smsToken) =>
    rpc('select public.reserve_sms($1,$2,$3,$4,$5) as result', [
      uid,
      tok,
      'SMS klant',
      '+32476123456',
      'Persoonlijke SMS',
    ]);
  const result = (status, provider = sid) =>
    db.query('select public.record_sms_result($1,$2,$3,$4)', [smsToken, provider, status, null]);
  await asUser(ownerA);
  await assert.rejects(reserve(), /permission denied/);
  await assert.rejects(result('delivered'), /permission denied/);
  await asUser(null);
  await assert.rejects(reserve(), /permission denied/);
  await db.exec('reset role; set role service_role');
  assert.equal((await reserve()).send, true);
  assert.equal((await reserve()).send, false);
  await assert.rejects(reserve(ownerB), /Invalid invitation/);
  await result('delivered'); // webhook arrives before create response
  await result('queued');
  await result('failed');
  await asUser(ownerA);
  let data = await rpc('select public.load_workspace() as result');
  const sms = data.invitations.find((i) => i.token === smsToken);
  assert.equal(sms.delivery_status, 'delivered');
  assert.equal(sms.provider_id, sid);
  assert.equal(data.customers.length, 1); // existing phone reused
  await db.exec('reset role; set role service_role');
  for (let i = 0; i < 9; i++) await reserve(ownerA, (i + 1).toString(16).padStart(32, '0'));
  await assert.rejects(reserve(ownerA, 'd'.repeat(32)), /SMS limit reached/);
  // Rate limit never blocks a safe retry of an already reserved request.
  assert.equal((await reserve()).send, false);
});

test('customer-only imports save online and invalid batches roll back completely', async () => {
  await asUser(ownerA);
  const before = await rpc('select public.load_workspace() as result');
  await save({customers:[{id:'77777777-7777-4777-8777-777777777777',name:'CSV klant',phone:'+32488123456'}]});
  let data = await rpc('select public.load_workspace() as result');
  assert.equal(data.customers.length,before.customers.length+1);
  assert.equal(data.invitations.length,before.invitations.length);
  await assert.rejects(save({customers:[
    {id:'88888888-8888-4888-8888-888888888888',name:'Eerste rij',phone:'+32499123456'},
    {id:'99999999-9999-4999-8999-999999999999',name:'Foute rij',phone:'invalid'},
  ]}),/Invalid phone/);
  data=await rpc('select public.load_workspace() as result');
  assert.equal(data.customers.length,before.customers.length+1);
  assert.equal(data.customers.some(c=>c.name==='Eerste rij'),false);
  await asUser(ownerB);
  assert.equal((await rpc('select public.load_workspace() as result')).customers.length,0);
});
