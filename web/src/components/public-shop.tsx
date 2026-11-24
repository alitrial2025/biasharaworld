"use client";
import {useEffect,useState,type FormEvent} from 'react';
import Link from 'next/link';
import {Brand,Button,Field,ProductArt} from './ui';
import {supabase} from '@/lib/supabase';
import {cash} from '@/lib/operations';
type Shop={name:string;description:string;fee:number;products:{id:number;name:string;size:string;price:number;art:number;stock:number}[]};
export function PublicShop({slug}:{slug:string}) {
 const [shop,setShop]=useState<Shop|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[cart,setCart]=useState<Record<number,number>>({});
 const [pending,setPending]=useState<{requestId:string;cart:Record<number,number>;address:string}|null>(null);
 useEffect(()=>{fetch('/api/shop/'+slug,{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);setShop(d)}).catch(e=>setError(e.message))},[slug]);
 async function order(e:FormEvent<HTMLFormElement>){e.preventDefault();const address=String(new FormData(e.currentTarget).get('address')||'');const body=pending||{requestId:crypto.randomUUID(),cart:Object.fromEntries(Object.entries(cart).filter(([,n])=>n>0)),address};setPending(body);setBusy(true);setError('');try{const {data:{session}}=await supabase().auth.getSession();if(!session){setPending(null);throw new Error('Sign in or create an account before ordering. Your basket stays on this page.')}const r=await fetch('/api/shop/'+slug,{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok){if(r.status<500)setPending(null);throw new Error(d.error)}setMessage(`Order #${d.id} sent. The merchant will arrange delivery and payment.`);setPending(null);setCart({})}catch(e){setError(e instanceof Error?e.message:'Order unconfirmed. Retry safely.')}finally{setBusy(false)}}
 return <main id="main-content" className="container section"><header className="panel-heading"><Brand/><Link href={'/portal/'+slug}>My orders</Link><Link href="/login">Sign in</Link></header><h1>{shop?.name||'Your neighbourhood shop'}</h1><p>{shop?.description}</p>{error&&<p role="alert" className="operation-error">{error}</p>}{message&&<p role="status">{message}</p>}{shop&&<><div className="stats-grid">{shop.products.map(p=><article className="panel" key={p.id}><ProductArt art={p.art} name={p.name}/><h2>{p.name}</h2><p>{p.size} · {cash(Math.round(p.price*100))}</p><p>{p.stock} available</p><label>Quantity<input aria-label={'Quantity for '+p.name} type="number" min={0} max={p.stock} value={cart[p.id]||0} disabled={busy||!!pending} onChange={e=>setCart({...cart,[p.id]:Math.max(0,Math.min(p.stock,Math.floor(Number(e.target.value))))})}/></label></article>)}</div>{shop.products.length===0&&<p>The merchant has not listed products yet.</p>}<form onSubmit={order} className="panel"><h2>Your order</h2><p>Delivery fee: {cash(shop.fee)} · Total: {cash(shop.products.reduce((s,p)=>s+Math.round(p.price*100)*(cart[p.id]||0),shop.fee))}</p><Field name="address" label="Delivery address or pickup instructions" required minLength={3} maxLength={500}/><Button type="submit" disabled={busy||Object.values(cart).every(n=>!n)}>{pending?'Retry saved order':'Send order'}</Button><p>Check My orders for payment options once the merchant has delivered your order.</p></form></>}</main>
}
type PortalOrder = { id: number; status: string; total: number; paid: boolean; onlinePayment: "pending" | "available" | "suspended" | null };
type PortalData = { business: string; customer: string; balance: number; points: number; orders: PortalOrder[]; documents: { id: number; kind: string; total: number; status: string }[] };

async function customerRequest(path: string, input?: { action: "start" | "refresh"; orderId: number }) {
 const { data: { session } } = await supabase().auth.getSession();
 if (!session) throw new Error("Sign in with your verified customer email to view private records.");
 const response = await fetch(path, {
  method: input ? "POST" : "GET",
  headers: { Authorization: `Bearer ${session.access_token}`, ...(input ? { "Content-Type": "application/json" } : {}) },
  body: input ? JSON.stringify(input) : undefined, cache: "no-store",
 });
 const result = await response.json();
 if (!response.ok) throw new Error(result.error || "Could not load your order.");
 return result;
}

export function PublicPortal({ slug }: { slug: string }) {
 const [data, setData] = useState<PortalData | null>(null);
 const [error, setError] = useState("");
 const [message, setMessage] = useState("");
 const [busyOrder, setBusyOrder] = useState<number | null>(null);
 const portalPath = `/api/portal/${encodeURIComponent(slug)}`;
 useEffect(() => {
  let current = true;
  async function load() {
   const initial: PortalData = await customerRequest(portalPath);
   if (!current) return;
   setData(initial);
   const callback = new URL(window.location.href);
   const order = initial.orders.find(({ id }) => String(id) === callback.searchParams.get("paymentOrder"));
   if (!order || (order.onlinePayment !== "pending" && order.onlinePayment !== "suspended")) return;
   setBusyOrder(order.id);
   try {
    const verified = await customerRequest(`/api/payments/order/${encodeURIComponent(slug)}`, { orderId: order.id, action: "refresh" });
    if (!current) return;
    if (verified.status === "paid") {
     const updated = await customerRequest(portalPath);
     if (!current) return;
     setData(updated);
     setMessage(`Payment confirmed for order #${order.id}.`);
    }
   } finally { if (current) setBusyOrder(null); }
  }
  load().catch(error => { if (current) setError(error.message); });
  return () => { current = false; };
 }, [portalPath, slug]);

 async function payment(orderId: number, action: "start" | "refresh") {
  setBusyOrder(orderId);
  setError("");
  setMessage("");
  try {
   const result = await customerRequest(`/api/payments/order/${encodeURIComponent(slug)}`, { orderId, action });
   if (action === "start" && result.checkoutUrl) {
    const url = new URL(result.checkoutUrl);
    if (url.origin !== "https://checkout.paystack.com" || url.username || url.password) throw new Error("Could not open secure checkout.");
    window.location.assign(url.href);
    return;
   }
   setData(await customerRequest(portalPath));
   if (result.status === "paid") setMessage(`Payment confirmed for order #${orderId}.`);
   else if (result.status === "preparing") setMessage("Checkout is being prepared. Check the payment status before paying another way.");
   else if (result.status === "suspended") setMessage("Online checkout is unavailable for this order. Check the status before paying another way.");
   else setMessage("Payment has not been confirmed yet.");
  } catch (failure) {
   setError(failure instanceof Error ? failure.message : "Could not check the payment.");
  } finally { setBusyOrder(null); }
 }

 return (
  <main id="main-content" className="container section">
   <Brand />
   <h1>{data ? `Hello, ${data.customer}` : "Your customer account"}</h1>
   {error && <p role="alert">{error}</p>}
   {error && !data && <Button href="/login">Sign in</Button>}
   {message && <p role="status">{message}</p>}
   {data && <>
    <p>{data.business}</p>
    <div className="stats-grid">
     <article className="panel"><h2>Outstanding balance</h2>{cash(Math.round(data.balance * 100))}</article>
     <article className="panel"><h2>Reward points</h2>{data.points}</article>
    </div>
    <h2>Your orders</h2>
    {data.orders.length ? data.orders.map(order => (
     <article className="panel" key={order.id}>
      <h3>Order #{order.id}</h3>
      <p>{order.status} · {cash(order.total)} · {order.paid ? "Payment recorded" : "Payment pending"}</p>
      {order.onlinePayment && <div className="button-row">
       {order.onlinePayment !== "suspended" && <Button disabled={busyOrder !== null} onClick={() => void payment(order.id, "start")}>
        {order.onlinePayment === "pending" ? "Open checkout" : "Pay by card or M-Pesa"}
       </Button>}
       {order.onlinePayment !== "available" && <Button variant="secondary" disabled={busyOrder !== null} onClick={() => void payment(order.id, "refresh")}>Check payment status</Button>}
      </div>}
     </article>
    )) : <p>No orders yet.</p>}
    <h2>Your documents</h2>
    {data.documents.map(document => <article className="panel" key={document.id}>{document.kind} #{document.id} · {cash(document.total)} · {document.status}</article>)}
   </>}
   <Link href={`/shop/${slug}`}>Visit shop</Link>
  </main>
 );
}
