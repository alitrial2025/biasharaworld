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
