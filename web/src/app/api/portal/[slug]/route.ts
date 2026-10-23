import {admin,identity,fail,json,ApiError} from '@/lib/backend/server';
import {shopRecord} from '@/lib/backend/shop';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{slug:string}>}){
 try {
  const user=await identity(request);if(!user.email_confirmed_at)throw new ApiError('Confirm your email to see your records.',403);
  const {id,state}=await shopRecord((await params).slug,false);
  const owned=await admin().from('customer_order_access').select('order_id').eq('business_id',id).eq('user_id',user.id);
  if(owned.error)throw new ApiError('Could not load your orders.',503);
  const customer=state.customers.find(c=>c.email.toLowerCase()===(user.email||'').toLowerCase());
  // IDs in the route never grant access. Only a verified email or recorded order ownership does.
  return json({business:state.profile.business,customer:customer?.name||user.user_metadata?.name||'Customer',balance:customer?.balance||0,points:customer?state.operations.loyalty[customer.name]||0:0,orders:state.operations.deliveries.filter(o=>owned.data.some(a=>a.order_id===o.id)||(customer&&o.customer===customer.name)),documents:customer?state.operations.documents.filter(d=>d.customer===customer.name):[]});
 }catch(e){return fail(e)}
}
