import type {DemoState} from '../data';
import {localDate} from '../operations';
export function businessReport(state:DemoState,period='Day') {
 const days=period==='Month'?30:period==='Week'?7:1;
 const end=localDate();const startDate=new Date(end+'T00:00:00Z');startDate.setUTCDate(startDate.getUTCDate()-days+1);const start=startDate.toISOString().slice(0,10);
 const branch=state.operations.activeBranch;
 const branchReceipts = state.operations.receipts.filter((receipt) => receipt.branch === branch);
 const receiptsById = new Map(branchReceipts.map((receipt) => [receipt.id, receipt]));
 const receipts = branchReceipts.filter((receipt) => receipt.date >= start && receipt.date <= end);
 const refunds = state.operations.returns.filter((refund) =>
   refund.date >= start && refund.date <= end && receiptsById.has(refund.saleId));
 const sales=(receipts.reduce((s,r)=>s+r.total,0)-refunds.reduce((s,r)=>s+r.amount,0))/100;
 const expenses=state.expenses.filter(e=>e.date>=start&&e.date<=end).reduce((s,e)=>s+e.amount,0);
 const cost=receipts.reduce((s,r)=>s+r.lines.reduce((a,l)=>a+(l.cost??0)*l.quantity,0),0)-refunds.filter(r=>r.restock).reduce((s,r)=>s+(receiptsById.get(r.saleId)?.lines.find(l=>l.productId===r.productId)?.cost??0)*r.quantity,0);
 const revenue=new Map<number,number>();for(const r of receipts)for(const l of r.lines)revenue.set(l.productId,(revenue.get(l.productId)||0)+l.net/100);
 for(const r of refunds)revenue.set(r.productId,(revenue.get(r.productId)||0)-r.amount/100);
 const catalog = new Map(state.products.map((product) => [product.id, product]));
 const products = [...revenue].map(([id, amount]) => ({
   product: catalog.get(id), amount,
 })).sort((a, b) => b.amount - a.amount);
 const series=Array.from({length:13},()=>0);
 for(const r of receipts){const index=days===1?12:Math.min(12,Math.floor((Date.parse(r.date)-Date.parse(start))/(86400000*days)*13));series[index]+=r.total/100}
 for(const r of refunds){const index=days===1?12:Math.min(12,Math.floor((Date.parse(r.date)-Date.parse(start))/(86400000*days)*13));series[index]-=r.amount/100}
 return {sales,expenses,profit:sales-cost/100-expenses,products,series,start,end,receipts,refunds};
}
