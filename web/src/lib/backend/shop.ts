import {admin,ApiError} from './server';
import type {DemoState} from '../data';
import {available} from '../operations';
import {mergeState} from './empty';
export async function shopRecord(slug:string,published=true) {
 const db=admin();const business=await db.from('businesses').select('id,slug').eq('slug',slug).maybeSingle();
 if(business.error)throw new ApiError('Shop unavailable. Try again later.',503);
 if(!business.data)throw new ApiError('Shop not found.',404);
 const record=await db.from('business_records').select('state,revision').eq('business_id',business.data.id).single();
 if(record.error)throw new ApiError('Shop unavailable.',503);
 const state=record.data.state as DemoState;
 if(published&&!state.operations.shop.published)throw new ApiError('This shop is not published.',404);
 const projected=mergeState(state,{activeBranch:state.operations.shop.branch});
 return {id:business.data.id,state:projected,canonical:state,revision:record.data.revision};
}
export function publicShop(state:DemoState) {
 const shop=state.operations.shop;
 return {name:shop.name,description:shop.description,fee:shop.fee,products:state.products.filter(p=>!shop.hidden.includes(p.id)).map(p=>({id:p.id,name:p.name,size:p.size,price:p.price,art:p.art,stock:available(state,p.id,shop.branch)}))};
}
