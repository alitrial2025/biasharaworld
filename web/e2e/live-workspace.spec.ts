import {test,expect} from '@playwright/test';
import {createClient,type Session} from '@supabase/supabase-js';
import {randomUUID} from 'node:crypto';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3002';
const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SECRET_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
let session:Session;let userId='';let businessId='';
const email=`browser-${randomUUID()}@biashara-test.invalid`,password=randomUUID()+'Ab1!';
const storageKey='sb-'+new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split('.')[0]+'-auth-token';
const slugs=['scanner','baskets','promotions','split-payments','returns','documents','register','stocktakes','expiry','variants','movements','transfers','compare','deliveries','loyalty','branches','online-shop','customer-portal','sync','preferences'];
test.describe.configure({mode:'default'});
test.beforeAll(async()=>{
 const created=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{name:'Browser Owner'}});if(created.error)throw created.error;userId=created.data.user.id;
 const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
 const login=await client.auth.signInWithPassword({email,password});if(login.error)throw login.error;session=login.data.session!;
 const r=await fetch(base+'/api/workspace',{method:'POST',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({type:'createBusiness',profile:{name:'Browser Owner',business:'Browser verification',location:'Nairobi',type:'Retail shop'}})});const d=await r.json();expect(r.status,JSON.stringify(d)).toBe(200);businessId=d.workspace.businessId;
});
test.afterAll(async()=>{if(businessId){await admin.from('business_commands').delete().eq('business_id',businessId);await admin.from('businesses').delete().eq('id',businessId)}if(userId)await admin.auth.admin.deleteUser(userId)});
for(const slug of slugs)test(`empty authenticated business: ${slug}`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:storageKey,value:JSON.stringify(session)});
 await page.setViewportSize({width:390,height:844});await page.goto('/dashboard/'+slug);
 await expect(page.locator('.workspace-main h1')).toBeVisible({timeout:20000});
 await expect(page.locator('.workspace [role="alert"]')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 expect(errors).toEqual([]);
});
test('owners can open payment activity from Reports and filter by order', async ({ page }) => {
 await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: storageKey, value: JSON.stringify(session) });
 await page.goto('/dashboard/reports');
 await page.getByRole('link', { name: 'Payment activity' }).click();
 await expect(page.getByRole('heading', { name: 'Payment activity' })).toBeVisible();
 await expect(page.getByText('No payments match this view.')).toBeVisible();
 await page.getByLabel('Payment status').selectOption('pending');
 await page.getByLabel('Order number').fill('123');
 const result = page.waitForResponse(response => response.url().includes('/api/payments/activity?status=pending&order=123'));
 await page.getByRole('button', { name: 'Filter payments' }).click();
 expect((await result).status()).toBe(200);
 await expect(page.getByText('No payments match this view.')).toBeVisible();
});
test('company verification leads the owner to their required identity check', async ({ page }) => {
 await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: storageKey, value: JSON.stringify(session) });
 await page.route('**/api/company-verification', route => route.fulfill({ json: { enabled: true, requiresOwner: true } }));
 await page.goto('/dashboard/settings');
 await page.getByRole('link', { name: 'Kenyan company verification' }).click();
 await expect(page.getByRole('heading', { name: 'Kenyan company verification' })).toBeVisible();
 const ownerCheck = page.getByRole('link', { name: 'owner identity verification', exact: true });
 await expect(ownerCheck).toBeVisible();
 await expect(page.getByRole('button', { name: 'Start verification' })).toHaveCount(0);
 await ownerCheck.click();
 await expect(page.getByRole('heading', { name: 'Owner identity verification' })).toBeVisible();
 await page.getByLabel('Legal structure').selectOption('registered_entity');
 await page.getByRole('button', { name: 'Confirm legal structure' }).click();
 await expect(page.getByText('Company or other registered entity', { exact: true })).toBeVisible();
});
test('Paystack return checks the pending order with the server', async ({ page }) => {
 await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: storageKey, value: JSON.stringify(session) });
 let recorded = false;
 await page.route('**/api/portal/test-checkout', route => route.fulfill({ json: {
   business: 'Test merchant', customer: 'Test customer', balance: 0, points: 0, documents: [],
   orders: [{ id: 123, status: 'Delivered', total: 10000, paid: recorded, onlinePayment: recorded ? null : 'pending' }],
 } }));
 await page.route('**/api/payments/order/test-checkout', route => {
   expect(route.request().postDataJSON()).toEqual({ action: 'refresh', orderId: 123 });
   recorded = true;
   return route.fulfill({ json: { status: 'paid' } });
 });
 await page.goto('/portal/test-checkout?paymentOrder=123&status=success');
 await expect(page.getByRole('status')).toHaveText('Payment confirmed for order #123.');
 await expect(page.getByText(/Payment recorded/)).toBeVisible();
});
test('owners can reach the supplier, import and reconciliation workflows', async ({ page }) => {
 await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: storageKey, value: JSON.stringify(session) });
 await page.goto('/dashboard/suppliers');
 await page.getByRole('link', { name: 'Supplier network' }).click();
 await expect(page.getByRole('heading', { name: 'Supplier network' })).toBeVisible();
 await expect(page.getByText('No verified supplier listings match this search.')).toBeVisible();
 await page.goto('/dashboard/settings');
 await page.getByRole('link', { name: 'Import business records' }).click();
 await expect(page.getByRole('heading', { name: 'Import business records' })).toBeVisible();
 await expect(page.getByRole('button', { name: 'Download CSV template' })).toBeVisible();
 await page.goto('/dashboard/reports');
 await page.getByRole('link', { name: 'Financial overview' }).click();
 await expect(page.getByRole('heading', { name: 'Outstanding invoices and supplier bills' })).toBeVisible();
 await page.getByRole('link', { name: 'Reconcile settlements' }).click();
 await expect(page.getByRole('heading', { name: 'Settlement reconciliation' })).toBeVisible();
 await expect(page.getByText('No statement matches in this view.')).toBeVisible();
});
test('owners can save a service and find customer support notes', async ({ page }) => {
 await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: storageKey, value: JSON.stringify(session) });
 await page.goto('/dashboard/settings');
 await page.getByRole('link', { name: 'Services and bookings' }).click();
 await page.getByRole('button', { name: 'Add service' }).click();
 await page.getByLabel('Service name').fill('Fittings');
 await page.getByLabel('Duration (minutes)').fill('45');
 await page.getByLabel('Price (KES)').fill('250.50');
 await page.getByRole('button', { name: 'Save service' }).click();
 await expect(page.getByText('Service saved.', { exact: true })).toBeVisible();
 await expect(page.getByRole('button', { name: 'Edit Fittings' })).toBeVisible();
 await page.goto('/dashboard/customers');
 await page.getByRole('link', { name: 'Customer service notes' }).click();
 await expect(page.getByRole('heading', { name: 'Customer service notes' })).toBeVisible();
 await expect(page.getByText('Add a customer before saving a note.')).toBeVisible();
});
test('real sign-in, product creation and sign-out',async({page})=>{
 await page.goto('/login');await page.getByLabel('Email address').fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Continue to workspace'}).click();await expect(page.locator('.workspace-main h1')).toContainText('Browser',{timeout:20000});
 await page.goto('/dashboard/inventory');await page.getByRole('button',{name:'Add product',exact:true}).click();const dialog=page.getByRole('dialog');await dialog.getByLabel('Product name').fill('Actual inventory');await dialog.getByLabel('Pack size').fill('1 unit');await dialog.getByLabel('Selling price (KES)').fill('100');await dialog.getByLabel('Cost price (KES)').fill('60');await dialog.getByLabel('Stock quantity').fill('5');await dialog.getByRole('button',{name:'Add product',exact:true}).click();await expect(dialog).not.toBeVisible({timeout:20000});await expect(page.locator('tbody')).toContainText('Actual inventory');
 await page.reload();await expect(page.locator('tbody')).toContainText('5 units');
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page).toHaveURL(/login/);await page.goto('/dashboard');await expect(page).toHaveURL(/login/);
});
test('unauthenticated workspace and customer portal stay private',async({page})=>{
 await page.goto('/dashboard');await expect(page).toHaveURL(/login/);
 await page.goto('/portal/6');await expect(page.locator('main [role="alert"]')).toContainText('Sign in');await expect(page.getByText('Mary Wambui')).toHaveCount(0);
});

test('onboarding shows sector tools and keeps other tools searchable', async ({ page }) => {
 const email = `industry-ui-${randomUUID()}@biashara-test.invalid`;
 const password = randomUUID() + 'Ab1!';
 const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
 if (created.error) throw created.error;
 const id = created.data.user.id;
 let business = '';
 try {
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const login = await client.auth.signInWithPassword({ email, password });
  if (login.error) throw login.error;
  const currentSession = login.data.session!;
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: storageKey, value: JSON.stringify(currentSession) });
  await page.goto('/onboarding');
  await expect(page.getByLabel('Business type')).toHaveValue('');
  expect(await page.getByLabel('Business type').locator('option').count()).toBeGreaterThan(15);
  await page.getByLabel('Business name').fill('Workspace Insurance');
  await page.getByLabel('Business type').selectOption('insurance');
  await page.getByLabel('Location').fill('Nairobi');
  const result = page.waitForResponse(response => response.url().endsWith('/api/workspace') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Open workspace' }).click();
  business = (await (await result).json()).workspace.businessId;
  await expect(page).toHaveURL(/dashboard$/);
  await expect(page.getByRole('link', { name: 'Claims', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Business navigation' }).getByRole('link', { name: 'Inventory' })).toHaveCount(0);
  await page.getByRole('button', { name: /Search anything/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Search workspace' });
  await dialog.getByPlaceholder('Search tools, products or customers…').fill('inventory');
  await dialog.getByRole('button', { name: 'Inventory', exact: true }).click();
  await expect(page).toHaveURL(/dashboard\/inventory$/);
  await page.goto('/dashboard');
  await page.getByRole('link', { name: 'Policies', exact: true }).click();
  await page.getByLabel('Policy number').fill('POL-UI-1');
  await page.getByLabel('Policyholder name or reference').fill('Customer 100');
  await page.getByLabel('Coverage', { exact: true }).fill('Building');
  await page.getByLabel('Coverage start').fill('2026-01-01');
  await page.getByLabel('Coverage end').fill('2027-01-01');
  await page.getByLabel('Agreed premium (KES)').fill('318.75');
  await page.getByRole('button', { name: 'Save record' }).click();
  await expect(page.getByRole('heading', { name: 'POL-UI-1' })).toBeVisible();
  await page.getByRole('button', { name: 'Mark as active' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved · Active' })).toBeVisible();
  await page.goto('/dashboard/settings');
  await expect(page.getByLabel('Business type')).toHaveValue('insurance');
 } finally {
  if (business) {
   await admin.from('business_commands').delete().eq('business_id', business);
   await admin.from('businesses').delete().eq('id', business);
  }
  await admin.auth.admin.deleteUser(id);
 }
});

test('issued tickets download as guest-ready barcode images', async ({ page }, testInfo) => {
 const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
 const login = await client.auth.signInWithPassword({ email, password });
 if (login.error) throw login.error;
 const ticketSession = login.data.session!;
 const headers = { Authorization: 'Bearer ' + ticketSession.access_token, 'Content-Type': 'application/json' };
 async function api(path: string, input?: unknown) {
  const response = await fetch(base + path, { method: input ? 'POST' : 'GET', headers, body: input ? JSON.stringify(input) : undefined });
  const data = await response.json();
  expect(response.status, JSON.stringify(data)).toBe(200);
  return data;
 }
 async function changeIndustry(type: string) {
  const { workspace } = await api('/api/workspace');
  await api('/api/workspace', { revision: workspace.revision, requestId: randomUUID(), command: { type: 'updateProfile', profile: { type } } });
 }
 const command = (input: Record<string, unknown>) => api('/api/industry', { ...input, sector: 'entertainment', requestId: randomUUID() });
 async function add(module: string, name: string, values: Record<string, string | number>) {
  await command({ action: 'create', module, name, values });
  const { records } = await api('/api/industry');
  return records.find((record: { name: string }) => record.name === name);
 }
 await changeIndustry('entertainment');
 try {
  const event = await add('events', 'Saturday concert', { venue: 'City hall' });
  await command({ action: 'transition', id: event.id, from: event.status, status: 'Scheduled' });
  const show = await add('showtimes', 'Concert showtime', {
   event: event.id, start: new Date().toISOString(), end: new Date(Date.now() + 3600_000).toISOString(), room: 'Main stage',
  });
  const seat = await add('seats', 'A1', { show: show.id, section: 'Main floor' });
  const ticket = await add('tickets', 'Guest booking 1', { seat: seat.id, guest: 'Guest ref 1', amount: 0 });
  await command({ action: 'transition', id: ticket.id, from: ticket.status, status: 'Issued' });
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: storageKey, value: JSON.stringify(ticketSession) });
  await page.goto('/dashboard/industry?module=tickets');
  const booking = page.getByRole('article').filter({ hasText: 'Guest booking 1' });
  await expect(booking.getByText(ticket.code)).toBeVisible();
  const downloadEvent = page.waitForEvent('download');
  await booking.getByRole('button', { name: 'Download ticket' }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe(`biashara-ticket-${ticket.code}.png`);
  const file = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of file) chunks.push(chunk);
  const png = Buffer.concat(chunks);
  expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([920, 460]);
  await testInfo.attach('Sample admission ticket', { body: png, contentType: 'image/png' });
 } finally {
  await changeIndustry('Retail shop');
 }
});
