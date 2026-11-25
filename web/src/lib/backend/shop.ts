import {admin,ApiError} from './server';
import type {StorefrontDraft} from '../storefront';
import type {DemoState} from '../data';
import {available} from '../operations';
import {mergeState} from './empty';
import {merchantVerificationStatus} from './merchant-verification';
export async function requirePublicShop(businessId:string,state:DemoState) {
 if(!state.operations.shop.published||await merchantVerificationStatus(businessId)!=='verified')throw new ApiError('This shop is not published.',404);
}
export async function shopRecord(slug:string,published=true) {
 const db=admin();const business=await db.from('businesses').select('id,slug').eq('slug',slug).maybeSingle();
 if(business.error)throw new ApiError('Shop unavailable. Try again later.',503);
 if(!business.data)throw new ApiError('Shop not found.',404);
 const [record,storefront]=await Promise.all([
  db.from('business_records').select('state,revision').eq('business_id',business.data.id).single(),
  db.from('business_storefronts').select('live').eq('business_id',business.data.id).maybeSingle<{live:StorefrontDraft|null}>()
 ]);
 if(record.error||storefront.error)throw new ApiError('Shop unavailable.',503);
 const state=record.data.state as DemoState;
 if(published)await requirePublicShop(business.data.id,state);
 const projected=mergeState(state,{activeBranch:state.operations.shop.branch});
 return {id:business.data.id,state:projected,canonical:state,revision:record.data.revision,storefront:storefront.data?.live};
}
export function publicShop(state:DemoState, storefront?:StorefrontDraft|null) {
 const shop=state.operations.shop;
 return {name:shop.name,description:shop.description,fee:shop.fee,products:state.products.filter(p=>!shop.hidden.includes(p.id)&&storefront?.catalog!=='off'&&(storefront?.catalog!=='selected'||storefront.products.includes(p.id))).map(p=>({id:p.id,name:p.name,size:p.size,category:p.category,price:p.price,art:p.art,stock:available(state,p.id,shop.branch)}))};
}
