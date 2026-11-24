import {admin,identity,fail,json,ApiError} from '@/lib/backend/server';
import {shopRecord} from '@/lib/backend/shop';
import {merchantSettlementCode} from '@/lib/backend/payments/customer-orders';
import {paystackConfig} from '@/lib/backend/payments/paystack';
import {merchantVerificationStatus} from '@/lib/backend/merchant-verification';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{slug:string}>}){
 try {
  const user=await identity(request);if(!user.email_confirmed_at)throw new ApiError('Confirm your email to see your records.',403);
  const {id,state}=await shopRecord((await params).slug,false);
  const owned=await admin().from('customer_order_access').select('order_id').eq('business_id',id).eq('user_id',user.id);
  if(owned.error)throw new ApiError('Could not load your orders.',503);
  const [settlement, attempts] = await Promise.all([
   paystackConfig() ? merchantVerificationStatus(id).then(status => status === 'verified' ? merchantSettlementCode(id) : null).catch(() => null) : null,
   admin().from('customer_order_payments').select('order_id,paid_at').eq('business_id',id).eq('user_id',user.id),
  ]);
  const ownedOrders=new Set(owned.data.map(order=>order.order_id));
  const pending=new Set((attempts.data??[]).filter(payment=>!payment.paid_at).map(payment=>payment.order_id));
  const pendingOption=settlement?'pending':'suspended';
  const newPaymentOption=settlement?'available':null;
  const customer=state.customers.find(c=>c.email.toLowerCase()===(user.email||'').toLowerCase());
  // IDs in the route never grant access. Only a verified email or recorded order ownership does.
  const orders=state.operations.deliveries.filter(o=>ownedOrders.has(o.id)||(customer&&o.customer===customer.name)).map(order=>({
   ...order, onlinePayment: !order.paid && ownedOrders.has(order.id) && order.status==='Delivered' && order.total>0
      ? pending.has(order.id) ? pendingOption : newPaymentOption : null,
  }));
  return json({business:state.profile.business,customer:customer?.name||user.user_metadata?.name||'Customer',balance:customer?.balance||0,points:customer?state.operations.loyalty[customer.name]||0:0,orders,documents:customer?state.operations.documents.filter(d=>d.customer===customer.name):[]});
 }catch(e){return fail(e)}
}
