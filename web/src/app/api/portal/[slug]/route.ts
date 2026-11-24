import {admin,identity,fail,json,ApiError} from '@/lib/backend/server';
import {shopRecord} from '@/lib/backend/shop';
import {merchantSettlementCode} from '@/lib/backend/payments/customer-orders';
import {checkoutChannels,paystackConfig} from '@/lib/backend/payments/paystack';
import {paymentMethods} from '@/lib/payment-methods';
import {merchantVerificationStatus} from '@/lib/backend/merchant-verification';
import {invoiceBalance} from '@/lib/operations';
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
  const documents=customer?state.operations.documents.filter(d=>d.customer===customer.name&&d.status!=='Draft')
   .map(doc=>({id:doc.id,kind:doc.kind,total:doc.total,status:doc.status,due:doc.due,outstanding:doc.kind==='Invoice'?invoiceBalance(doc):null})):[];
  const preferences=customer||ownedOrders.size?await admin().from('customer_marketing_events').select('email_opt_in')
   .eq('business_id',id).eq('customer_user',user.id).order('recorded_at',{ascending:false}).order('id',{ascending:false}).limit(1).maybeSingle():null;
  const emailOptIn=preferences&&!preferences.error?(preferences.data?.email_opt_in??false):null;
  return json({business:state.profile.business,customer:customer?.name||user.user_metadata?.name||'Customer',balance:customer?.balance||0,points:customer?state.operations.loyalty[customer.name]||0:0,orders,checkoutMethods:settlement?checkoutChannels().map(channel=>paymentMethods[channel]):[],documents,emailOptIn});
 }catch(e){return fail(e)}
}
