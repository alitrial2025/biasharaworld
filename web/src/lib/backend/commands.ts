import { z } from 'zod';
import { execute, type Action } from '../operations';
import { today, type DemoState } from '../data';
const text=z.string().trim().min(1).max(200);
const note=z.string().trim().max(2000);
const id=z.number().int().positive().max(1e9);
const documentId=z.number().int().min(-1e9).max(1e9).refine(n=>n!==0);
const qty=z.number().int().min(0).max(1e6);
const amount=z.number().finite().min(0).max(1e9);
const int=amount.int();
const date=z.iso.date();
const product=z.object({name:text,size:note,sku:text,category:text,price:amount.positive(),cost:amount,stock:qty,reorder:qty,art:z.number().int().min(0).max(7),barcode:z.string().regex(/^\d{13}$/).optional()}).strict();
const customer=z.object({name:text,phone:z.string().trim().max(40),email:z.union([z.email(),z.literal('')]),balance:amount,purchases:qty,color:z.enum(['mint','sand','lavender','rose','blue'])}).strict();
const payment=z.object({method:z.enum(['Cash','M-Pesa','Card','Bank transfer','Bank']),amount:int}).strict();
const member=z.object({name:text,email:z.email(),role:z.enum(['Manager','Cashier','Viewer'])}).strict();
const shape:Record<string,z.ZodRawShape>={
 addSupplier:{name:text,category:text,description:note,delivery:note,minimum:amount,deliveryFee:amount},supplierQuote:{id:text,productId:id,cost:amount},
 inviteMember:{member},updateMember:{id,role:z.enum(['Manager','Cashier','Viewer'])},removeMember:{id},
 branch:{id:text},addBranch:{name:text,location:note},cart:{id,quantity:qty},basket:{customer:text.optional(),discount:int.optional(),discountKind:z.enum(['percent','fixed']).optional(),promotion:z.string().max(30).optional(),redeem:int.optional()},clearCart:{},hold:{name:text},resume:{id},discard:{id},checkout:{payments:z.array(payment).min(1).max(5),documentId:documentId.optional()},promotion:{name:text,percent:z.number().int().min(1).max(100),ends:date,productId:id.nullable()},return:{id,productId:id,quantity:qty.positive(),restock:z.boolean(),reason:text},document:{kind:z.enum(['Quotation','Invoice']),due:date},convertDocument:{id:documentId},issueDocument:{id:documentId},payDocument:{id:documentId},openRegister:{amount:int},cashEntry:{amount:z.number().int().min(-1e9).max(1e9),label:text},closeRegister:{amount:int},startCount:{name:text},count:{id,productId:id,quantity:qty},finaliseCount:{id,reason:note.optional()},refreshCount:{id,reason:note.optional()},batch:{productId:id,quantity:qty.positive(),expires:date,code:text},writeOff:{id,reason:text},variant:{parentId:id,name:text,size:note,sku:text,price:int.positive(),stock:qty},bundle:{name:text,price:int.positive(),components:z.array(z.object({productId:id,quantity:qty.positive()}).strict()).min(1).max(50)},barcode:{id,code:z.string().regex(/^\d{13}$/)},transfer:{productId:id,quantity:qty.positive(),to:text},dispatchTransfer:{id},receiveTransfer:{id},cancelTransfer:{id},shop:{name:text.optional(),description:note.optional(),published:z.boolean().optional(),branch:text.optional(),hidden:z.array(id).max(10000).optional(),fee:int.optional()},placeOrder:{customer:text,cart:z.record(z.string().regex(/^\d+$/),qty),address:text},orderStatus:{id,status:z.enum(['New','Confirmed','Packing','Dispatched','Delivered','Cancelled'])},pack:{id,productId:id},orderPaid:{id},rewardRate:{amount:int.positive()},preferences:{language:z.enum(['en','sw']).optional(),theme:z.enum(['light','dark','system']).optional(),textSize:z.union([z.literal(100),z.literal(115),z.literal(130)]).optional()},
 updateProfile:{profile:z.object({name:text.optional(),business:text.optional(),email:z.email().optional(),phone:note.optional(),location:note.optional(),type:text.optional()}).strict()},setTarget:{target:amount.positive()},addProduct:{product},updateProduct:{id,changes:product.partial()},addCustomer:{customer},payBalance:{id,amount:amount.positive()},addExpense:{expense:z.object({name:text,category:text,amount:amount.positive(),date,method:text}).strict()},removeExpense:{id},toggleNotification:{name:text},createOrder:{supplier:text,items:z.array(z.object({productId:id,quantity:qty.positive(),cost:amount}).strict()).min(1).max(500),deliveryFee:amount},receiveOrder:{id}
};
export function parseCommand(input:unknown):Record<string,unknown> & {type:string} {
 const type=z.object({type:text}).parse(input).type;
 if(!shape[type]) throw new Error('This action is unavailable. No changes were saved.');
 return z.object({type:z.literal(type),...shape[type]}).strict().parse(input) as Record<string,unknown> & {type:string};
}
const personal=new Set(['branch','cart','basket','clearCart','hold','resume','discard','preferences']);
const cashier=new Set([...personal,'checkout','document','convertDocument','issueDocument','payDocument','openRegister','cashEntry','closeRegister','addCustomer','payBalance','placeOrder','pack','orderStatus','orderPaid']);
export function authorizeCommand(role:string,type:string) {
 if(['inviteMember','updateMember','removeMember'].includes(type)&&role!=='Owner')throw new Error('Only the owner can manage team access.');
 if(role==='Owner'||role==='Manager'||(role==='Cashier'&&cashier.has(type))||(role==='Viewer'&&personal.has(type))) return;
 throw new Error('Your role does not allow this change. Ask the business owner.');
}
export function applyCommand(original:DemoState,input:unknown,role:string) {
 const a=parseCommand(input);
 authorizeCommand(role,a.type);
 let state=structuredClone(original);
 let resultId:number|undefined;
 // Input has been strictly validated. These casts expose the corresponding discriminated variants.
 const v=a as never as {product:DemoState['products'][number];changes:Partial<DemoState['products'][number]>;id:number;customer:DemoState['customers'][number];amount:number;expense:DemoState['expenses'][number];profile:Partial<DemoState['profile']>;target:number;name:string;supplier:string;items:DemoState['orders'][number]['items'];deliveryFee:number};
 const next=(items:{id:number}[])=>Math.max(0,...items.map(x=>x.id))+1;
 switch(a.type) {
 case 'addSupplier': {state.suppliers??=[];const name=a.name as string;state.suppliers.push({id:crypto.randomUUID(),name,initial:name[0],category:a.category as string,description:a.description as string,distance:'',rating:'',reviews:0,color:'mint',delivery:a.delivery as string,minimum:a.minimum as number,deliveryFee:a.deliveryFee as number,quotes:{}});break;}
 case 'supplierQuote': {const supplier=state.suppliers?.find(s=>s.id===a.id);if(!supplier||!state.products.some(p=>p.id===a.productId))throw new Error('Choose an existing supplier and product.');supplier.quotes??={};supplier.quotes[a.productId as number]=a.cost as number;break;}

 case 'inviteMember': {
  const m=a.member as Omit<DemoState['members'][number],'id'|'status'>;
  if(state.members.some(x=>x.email.toLowerCase()===m.email.toLowerCase()))throw new Error('This email is already on your team.');
  resultId=next(state.members);state.members.push({...m,id:resultId,status:'Invited'});break;
 }
 case 'updateMember': {const m=state.members.find(x=>x.id===v.id);if(!m||m.role==='Owner')throw new Error('The owner cannot be changed here.');m.role=a.role as string;break;}
 case 'removeMember': {const m=state.members.find(x=>x.id===v.id);if(!m||m.role==='Owner')throw new Error('The owner cannot be removed.');state.members=state.members.filter(x=>x.id!==v.id);break;}

 case 'updateProfile': Object.assign(state.profile,v.profile);break;
 case 'setTarget': state.target=v.target;break;
 case 'addProduct': {
  if(state.products.some(p=>p.sku===v.product.sku)) throw new Error('SKU already exists.');
  resultId=next(state.products);state.products.push({...v.product,id:resultId,stock:0});
  for(const b of state.operations.branches) state.operations.stock[b.id][resultId]=0;
  if(v.product.stock) state=execute(state,{type:'batch',productId:resultId,quantity:v.product.stock,code:'OPENING',expires:'2099-12-31'}).state;
  break;
 }
 case 'updateProduct': {
  const p=state.products.find(p=>p.id===v.id);if(!p) throw new Error('Product not found.');
  if(v.changes.sku&&state.products.some(q=>q.id!==p.id&&q.sku===v.changes.sku)) throw new Error('SKU already exists.');
  if(v.changes.stock!==undefined&&v.changes.stock!==p.stock) throw new Error('Use Stocktake or Receive batch to adjust stock with an audit trail.');
  Object.assign(p,v.changes);break;
 }
 case 'addCustomer':
  if(state.customers.some(c=>c.name.toLowerCase()===v.customer.name.toLowerCase())) throw new Error('A customer with this name exists. Use a distinct name.');
  resultId=next(state.customers);state.customers.push({...v.customer,id:resultId});break;
 case 'payBalance': {
  const c=state.customers.find(c=>c.id===v.id);if(!c||v.amount>c.balance) throw new Error('Payment exceeds the outstanding balance.');c.balance=Math.round((c.balance-v.amount)*100)/100;break;
 }
 case 'addExpense': resultId=next(state.expenses);state.expenses.unshift({...v.expense,id:resultId});break;
 case 'removeExpense': if(!state.expenses.some(e=>e.id===v.id)) throw new Error('Expense not found.');state.expenses=state.expenses.filter(e=>e.id!==v.id);break;
 case 'toggleNotification':state.notifications[v.name]=!state.notifications[v.name];break;
 case 'createOrder': {
  if(v.items.some(i=>!state.products.some(p=>p.id===i.productId))) throw new Error('An order product no longer exists.');
  resultId=next(state.orders);state.orders.unshift({id:resultId,supplier:v.supplier,items:v.items,deliveryFee:v.deliveryFee,branch:state.operations.activeBranch,amount:Math.round((v.items.reduce((s,i)=>s+i.quantity*i.cost,0)+v.deliveryFee)*100)/100,status:'Draft',date:today()});break;
 }
 case 'receiveOrder': {
  const order=state.orders.find(o=>o.id===v.id);if(!order||order.status==='Received'||order.branch!==state.operations.activeBranch) throw new Error('Order already received or belongs to another branch.');
  for(const item of order.items) state=execute(state,{type:'batch',productId:item.productId,quantity:item.quantity,code:`PO-${order.id}`,expires:'2099-12-31'}).state;
  state.orders.find(o=>o.id===v.id)!.status='Received';break;
 }
 default: {
  const result=execute(state,a as Action);state=result.state;resultId=result.id;
 }
 }
 // Snapshot cost at creation, so later product edits cannot rewrite historical margins.
 for(const r of state.operations.receipts) if(!original.operations.receipts.some(old=>old.id===r.id)) for(const line of r.lines) {
  const p=original.products.find(p=>p.id===line.productId);
  line.cost=p?.components?.length?p.components.reduce((s,c)=>s+Math.round((original.products.find(q=>q.id===c.productId)?.cost||0)*100)*c.quantity,0):Math.round((p?.cost||0)*100);
 }
 // Domain validators preserve atomic stock, receipt, return and discount invariants.
 for(const p of state.products) if(!p.components) state.operations.stock[state.operations.activeBranch][p.id]=p.stock;
 return {state,message:'Saved to your business.',id:resultId};
}
