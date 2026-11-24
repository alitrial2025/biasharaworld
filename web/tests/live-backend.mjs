import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const base=process.env.TEST_BASE_URL||'http://localhost:3001';
for (const target of [url,base]) assert.ok(['127.0.0.1','localhost'].includes(new URL(target).hostname),'This suite creates business and verification fixtures and requires a local backend.');
const admin=createClient(url,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const users=[],businesses=[];let passed=0;
function check(name,fn){fn();passed++;console.log('PASS',name)}
async function actor(label){const email=`test-${label}-${randomUUID()}@biashara-test.invalid`,password=randomUUID()+'Aa9!';const created=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{name:'Backend verification'}});if(created.error)throw created.error;users.push(created.data.user.id);const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});const login=await client.auth.signInWithPassword({email,password});if(login.error)throw login.error;return {id:created.data.user.id,email,client,token:login.data.session.access_token}}
async function req(actor,body,path='/api/workspace'){const response=await fetch(base+path,{signal:AbortSignal.timeout(30000),method:body?'POST':'GET',headers:{...(actor?{Authorization:'Bearer '+actor.token}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});return {status:response.status,body:await response.json()}}
async function create(a){const r=await req(a,{type:'createBusiness',profile:{name:'Test Owner',business:'Verification only',location:'Nairobi',type:'Retail shop'}});assert.equal(r.status,200,JSON.stringify(r.body));businesses.push(r.body.workspace.businessId);return r.body.workspace}
async function command(a,w,command,requestId=randomUUID()){return req(a,{revision:w.revision,requestId,command})}
try{
 check('Unauthenticated workspace rejected',()=>{});assert.equal((await req(null)).status,401);
 const a=await actor('owner'),b=await actor('other'),c=await actor('staff');
 let w=await create(a);const otherWorkspace=await create(b);
 check('New businesses contain no sample records',()=>{assert.equal(w.state.products.length,0);assert.equal(w.state.sales.length,0);assert.equal(w.state.operations.receipts.length,0);assert.equal(w.state.customers.length,0);assert.equal(w.state.operations.loyalty['Mary Wambui'],undefined);assert.equal(w.state.operations.branches.length,1)});
 const alien=await b.client.from('business_records').select('*').eq('business_id',w.businessId);check('Cross-tenant reads denied by RLS',()=>{assert.equal(alien.error,null);assert.equal(alien.data.length,0)});
 const write=await a.client.from('business_records').update({state:{hacked:true}}).eq('business_id',w.businessId);check('Authenticated clients cannot upload snapshots',()=>assert.ok(write.error));
 const forged=await a.client.rpc('commit_business_command',{p_business:w.businessId,p_user:a.id,p_revision:0,p_request:randomUUID(),p_hash:'x',p_type:'checkout',p_state:{},p_workspace:{},p_result:{}});check('Direct authoritative RPC denied',()=>assert.ok(forged.error));
 let r=await command(a,w,{type:'addProduct',product:{name:'Real test product',size:'1 unit',sku:'VERIFY',category:'Food',price:100,cost:60,stock:5,reorder:2,art:7}});assert.equal(r.status,200,JSON.stringify(r.body));w=r.body.workspace;const product=w.state.products[0];
 check('Product and opening batch persist',()=>{assert.equal(product.stock,5);assert.equal(w.state.operations.batches[0].quantity,5)});
 const isolated=await req(b);check('Another account stays empty',()=>assert.equal(isolated.body.workspace.state.products.length,0));
 const stale=await command(a,{...w,revision:0},{type:'setTarget',target:1000});check('Stale revision rejected',()=>assert.equal(stale.status,409));
 r=await command(a,w,{type:'cart',id:product.id,quantity:2});assert.equal(r.status,200,JSON.stringify(r.body));w=r.body.workspace;
 const requestId=randomUUID();const payload={type:'checkout',payments:[{method:'Cash',amount:20000}]};r=await command(a,w,payload,requestId);assert.equal(r.status,200,JSON.stringify(r.body));const revision=w.revision;w=r.body.workspace;
 check('Confirmed checkout reduces stock exactly once',()=>{assert.equal(w.state.products[0].stock,3);assert.equal(w.state.operations.receipts.length,1);assert.equal(w.state.operations.receipts[0].total,20000);assert.equal(w.state.operations.receipts[0].lines[0].cost,6000)});
 r=await command(a,{...w,revision},payload,requestId);check('Retry is idempotent after revision changes',()=>{assert.equal(r.status,200);assert.equal(r.body.result.duplicate,true);assert.equal(r.body.workspace.state.products[0].stock,3)});
 r=await command(a,w,{type:'setTarget',target:1},requestId);check('Reused key with different command rejected',()=>assert.equal(r.status,409));
 const responses=await Promise.all([command(a,w,{type:'setTarget',target:1000}),command(a,w,{type:'setTarget',target:2000})]);check('Concurrent writes cannot lose updates',()=>assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]));w=(await req(a)).body.workspace;
 async function save(command){const r=await globalThis.fetch(base+'/api/workspace',{method:'POST',headers:{Authorization:'Bearer '+a.token,'Content-Type':'application/json'},signal:AbortSignal.timeout(30000),body:JSON.stringify({revision:w.revision,requestId:randomUUID(),command})});const d=await r.json();assert.equal(r.status,200,JSON.stringify(d));w=d.workspace;return d.result}
 await save({type:'addProduct',product:{name:'Second product',size:'1 unit',sku:'VERIFY2',category:'Food',price:50,cost:30,stock:10,reorder:2,art:0}});
 const second=w.state.products.find(p=>p.sku==='VERIFY2').id;
 await save({type:'addCustomer',customer:{name:'Verified customer',phone:'',email:'',balance:100,purchases:0,color:'mint'}});
 await save({type:'payBalance',id:w.state.customers[0].id,amount:25});check('Customer repayment persists',()=>assert.equal(w.state.customers[0].balance,75));
 await save({type:'addExpense',expense:{name:'Transport',category:'Transport',amount:10,date:new Date().toISOString().slice(0,10),method:'Cash'}});
 await save({type:'cart',id:product.id,quantity:1});await save({type:'cart',id:second,quantity:1});await save({type:'basket',customer:'Verified customer',discount:10,redeem:0});
 await save({type:'hold',name:'Customer collection'});check('Held basket persists without reducing stock',()=>{assert.equal(w.state.operations.held.length,1);assert.equal(w.state.products[0].stock,3)});
 await save({type:'resume',id:w.state.operations.held[0].id});const split=await save({type:'checkout',payments:[{method:'Cash',amount:10000},{method:'M-Pesa',amount:3500}]});
 check('Split tenders and rewards are server-calculated',()=>{assert.equal(w.state.operations.receipts[0].total,13500);assert.equal(w.state.operations.loyalty['Verified customer'],1)});
 await save({type:'return',id:split.id,productId:product.id,quantity:1,restock:true,reason:'Customer returned unused item'});
 check('Refund preserves discounted net price and stock',()=>{assert.equal(w.state.operations.returns[0].amount,9000);assert.equal(w.state.products[0].stock,3)});
 await save({type:'cart',id:second,quantity:2});await save({type:'basket',discount:0,redeem:0});const doc=await save({type:'document',kind:'Quotation',due:'2027-12-31'});await save({type:'convertDocument',id:doc.id});
 const invoice=w.state.operations.documents.find(d=>d.kind==='Invoice');await save({type:'payDocument',id:invoice.id});
 r=await command(a,w,{type:'payDocument',id:invoice.id});check('Invoice payment is recorded only once',()=>assert.equal(r.status,400));
 await save({type:'openRegister',amount:10000});await save({type:'cashEntry',amount:-1000,label:'Float removed'});await save({type:'closeRegister',amount:9000});check('Register close reconciles expected cash',()=>assert.equal(w.state.operations.registers[0].expected,9000));
 const count=await save({type:'startCount',name:'Shelf verification'});await save({type:'count',id:count.id,productId:product.id,quantity:4});await save({type:'finaliseCount',id:count.id,reason:'Physical recount'});
 check('Stocktake writes audited stock movement',()=>{assert.equal(w.state.products[0].stock,4);assert.ok(w.state.operations.movements.some(m=>m.reason.includes('count')||m.reason.includes('Stocktake')))});
 await save({type:'batch',productId:product.id,quantity:1,code:'Expired test batch',expires:'2025-01-01'});const expired=w.state.operations.batches.find(b=>b.code==='Expired test batch');await save({type:'writeOff',id:expired.id,reason:'Expired stock'});
 await save({type:'variant',parentId:product.id,name:'Small pack',size:'250 g',sku:'SMALL',price:5000,stock:2});await save({type:'bundle',name:'Mixed basket',price:12500,components:[{productId:product.id,quantity:1},{productId:second,quantity:1}]});
 check('Variants and bundles persist across API reads',()=>{assert.ok(w.state.products.some(p=>p.variantOf===product.id));assert.ok(w.state.products.some(p=>p.components?.length===2))});
 await save({type:'clearCart'});await save({type:'addBranch',name:'Second branch',location:'Nairobi'});const destination=w.state.operations.branches.at(-1).id;
 const transfer=await save({type:'transfer',productId:product.id,quantity:1,to:destination});await save({type:'dispatchTransfer',id:transfer.id});await save({type:'receiveTransfer',id:transfer.id});
 check('Branch transfer updates both stock ledgers once',()=>assert.equal(w.state.operations.stock[destination][product.id],1));
 await save({type:'addSupplier',name:'Recorded supplier',category:'Groceries',description:'Verified test contact',delivery:'Collection',minimum:0,deliveryFee:0});const supplier=w.state.suppliers[0];await save({type:'supplierQuote',id:supplier.id,productId:product.id,cost:55});
 const bundle=w.state.products.find(p=>p.components?.length===2);
 r=await command(a,w,{type:'createOrder',supplier:supplier.name,items:[{productId:bundle.id,quantity:1,cost:55}],deliveryFee:0});
 check('Purchase orders reject bundles before receiving stock',()=>{assert.equal(r.status,400);assert.equal(r.body.error,'Choose individual stock items for this order.')});
 const po=await save({type:'createOrder',supplier:supplier.name,items:[{productId:product.id,quantity:2,cost:55}],deliveryFee:0});await save({type:'receiveOrder',id:po.id});r=await command(a,w,{type:'receiveOrder',id:po.id});check('Supplier quotes and goods receipts are real and single-use',()=>{assert.equal(w.state.suppliers[0].quotes[product.id],55);assert.equal(r.status,400)});
 await save({type:'preferences',language:'sw',theme:'dark',textSize:130});check('Personal preferences persist',()=>assert.equal(w.state.operations.preferences.language,'sw'));
 const audit=await a.client.from('business_commands').select('input').eq('business_id',w.businessId).eq('command_type','checkout');check('Financial commands retain actor-scoped audit inputs',()=>assert.ok(audit.data.every(r=>r.input?.command?.type==='checkout')));
 r=await command(a,w,{type:'inviteMember',member:{name:'Test staff',email:c.email,role:'Cashier'}});assert.equal(r.status,200,JSON.stringify(r.body));w=r.body.workspace;
 const staff=(await req(c)).body.workspace;check('Verified invited email joins the correct business',()=>{assert.equal(staff.businessId,w.businessId);assert.equal(staff.role,'Cashier')});
 r=await command(c,staff,{type:'addProduct',product:{name:'Forbidden',size:'',sku:'NO',category:'Food',price:1,cost:0,stock:0,reorder:1,art:0}});check('Cashier cannot edit inventory',()=>assert.equal(r.status,400));
 w=(await req(a)).body.workspace;
 const ownerVerification=await req(a,null,'/api/identity-verification');
 const staffVerification=await req(c,null,'/api/identity-verification');
 const fabricated=await req(a,{action:'refresh',status:'Approved'},'/api/identity-verification');
 check('Only the owner can use verification and clients cannot supply a decision',()=>{
  assert.equal(ownerVerification.status,200);assert.equal(staffVerification.status,403);assert.equal(fabricated.status,400);
 });
 const companyPath='/api/company-verification';
 const companyStaff=await req(c,null,companyPath);
 const companyForged=await req(a,{action:'refresh',representativeReview:'Approved'},companyPath);
 const reviewArgs={target_business:w.businessId,company_session:randomUUID(),identity_session:randomUUID(),decision:'Approved',ops_case_reference:randomUUID(),operator_reference:'test'};
 const clientReview=await a.client.rpc('review_company_representative',reviewArgs);
 const serviceReview=await admin.rpc('review_company_representative',reviewArgs);
 check('Company review is reserved for operators and client decisions are rejected',()=>{
  assert.equal(companyStaff.status,403);assert.equal(companyForged.status,400);
  assert.equal(clientReview.error?.code,'42501');assert.equal(serviceReview.error?.code,'42501');
 });
 r=await command(a,w,{type:'shop',published:true,name:'Verification shop'});
 check('Unverified businesses cannot publish a shop',()=>assert.equal(r.status,403));
 const approval=await admin.from('business_identity_verifications').insert({business_id:w.businessId,owner_id:a.id,workflow_id:randomUUID(),session_id:randomUUID(),status:'Approved',checked_at:new Date().toISOString()});
 assert.equal(approval.error,null);
 const declare={action:'declare',legalStructure:'individual'};
 const approvedWithoutStructure=await command(a,w,{type:'shop',published:true});
 const staffDeclaration=await req(c,declare,'/api/identity-verification');
 const declaration=await req(a,declare,'/api/identity-verification');
 const repeatedDeclaration=await req(a,declare,'/api/identity-verification');
 const changedDeclaration=await req(a,{...declare,legalStructure:'registered_entity'},'/api/identity-verification');
 check('Owner must declare a legal structure, and retry cannot change that declaration',()=>{
  assert.equal(approvedWithoutStructure.status,403);assert.equal(staffDeclaration.status,403);
  assert.equal(declaration.body.merchantStatus,'verified');assert.equal(repeatedDeclaration.status,200);assert.equal(changedDeclaration.status,409);
 });
 const companyDeclaration=await req(b,{...declare,legalStructure:'registered_entity'},'/api/identity-verification');
 assert.equal(companyDeclaration.status,200);
 const companyOwnerApproval=await admin.from('business_identity_verifications').insert({business_id:otherWorkspace.businessId,owner_id:b.id,workflow_id:randomUUID(),session_id:randomUUID(),status:'Approved',checked_at:new Date().toISOString()});
 assert.equal(companyOwnerApproval.error,null);
 const companyStatus=await req(b,null,'/api/identity-verification');
 const companySettlement=await admin.from('merchant_payment_accounts').insert({business_id:otherWorkspace.businessId,owner_id:b.id,bank_name:'Fixture',account_last_four:'0001'});
 const companyPublish=await command(b,otherWorkspace,{type:'shop',published:true});
 check('Company cannot publish or connect settlement with only personal KYC',()=>{
  assert.equal(companyStatus.body.merchantStatus,'company_verification_required');
  assert.equal(companyPublish.status,403);assert.equal(companySettlement.error?.code,'42501');
 });
 r=await command(a,w,{type:'shop',published:true,name:'Verification shop'});assert.equal(r.status,200,JSON.stringify(r.body));w=r.body.workspace;
 const shop=await req(null,null,'/api/shop/'+w.slug);check('Public shop excludes costs and private records',()=>{assert.equal(shop.status,200);assert.equal(shop.body.products[0].cost,undefined);assert.equal(shop.body.customers,undefined)});
 const customerOrder={requestId:randomUUID(),cart:{[product.id]:1},address:'Collect at shop'};
 r=await req(b,customerOrder,'/api/shop/'+w.slug);assert.equal(r.status,200,JSON.stringify(r.body));
 const portal=await req(b,null,'/api/portal/'+w.slug),stranger=await req(c,null,'/api/portal/'+w.slug);check('Customer sees only their own orders',()=>{assert.equal(portal.body.orders.length,1);assert.equal(stranger.body.orders.length,0)});
 const reference=`biashara-${randomUUID()}`;
 const payment=await admin.from('customer_order_payments').insert({business_id:w.businessId,order_id:r.body.id,user_id:b.id,reference,amount_minor:12500,subaccount_code:'ACCT_testprivate',checkout_url:'https://checkout.paystack.com/testprivate'});
 assert.equal(payment.error,null);
 const revoked=await admin.from('business_identity_verifications').update({status:'Kyc Expired'}).eq('business_id',w.businessId);
 assert.equal(revoked.error,null);
 const closed=await req(null,null,'/api/shop/'+w.slug);
 const blockedOrder=await req(b,{requestId:randomUUID(),cart:{[product.id]:1},address:'Collect at shop'},'/api/shop/'+w.slug);
 const retriedOrder=await req(b,customerOrder,'/api/shop/'+w.slug);
 const previousOrders=await req(b,null,'/api/portal/'+w.slug);
 check('Expired verification stops new orders and preserves existing customer access',()=>{
  assert.equal(closed.status,404);assert.equal(blockedOrder.status,404);assert.equal(retriedOrder.status,200);
  assert.equal(retriedOrder.body.id,r.body.id);assert.equal(previousOrders.body.orders.length,1);
 });
 const ownerActivity=await req(a,null,`/api/payments/activity?status=pending&order=${r.body.id}`);
 const otherActivity=await req(b,null,'/api/payments/activity');
 const cashierActivity=await req(c,null,'/api/payments/activity');
 const cashierRefresh=await req(c,{order:r.body.id},'/api/payments/activity');
 const otherRefresh=await req(b,{order:r.body.id},'/api/payments/activity');
 const invalidActivity=await req(a,null,'/api/payments/activity?order=1e3');
 w=(await req(a)).body.workspace;
 const member=w.state.members.find(m=>m.email===c.email);
 const promotion=await command(a,w,{type:'updateMember',id:member.id,role:'Manager'});
 assert.equal(promotion.status,200);
 const managerActivity=await req(c,null,'/api/payments/activity');
 check('Payment activity isolates businesses, limits roles and hides checkout and settlement credentials',()=>{
  assert.equal(ownerActivity.status,200);assert.equal(ownerActivity.body.entries.length,1);
  const entry=ownerActivity.body.entries[0];assert.equal(entry.reference,reference);assert.equal(entry.amount_minor,12500);
  for(const field of ['user_id','checkout_url','subaccount_code']) assert.ok(!(field in entry));
  assert.equal(otherActivity.status,200);assert.equal(otherActivity.body.entries.length,0);
  assert.equal(cashierActivity.status,403);assert.equal(cashierRefresh.status,403);assert.equal(otherRefresh.status,404);
  assert.equal(managerActivity.status,200);assert.equal(managerActivity.body.entries[0].reference,reference);
  assert.equal(invalidActivity.status,400);
 });
 console.log(JSON.stringify({passed,failed:0,backend:new URL(url).hostname}));
}finally{
 for(const id of businesses){await admin.from('business_commands').delete().eq('business_id',id);await admin.from('businesses').delete().eq('id',id)}
 for(const id of users){const r=await admin.auth.admin.deleteUser(id);if(r.error)console.error('Test account cleanup failed:',r.error.message)}
}
