import {createHash} from 'node:crypto';
import {z} from 'zod';
import {admin,identity,loadBusiness,ensureBusiness,fail,json,ApiError} from '@/lib/backend/server';
import {applyCommand} from '@/lib/backend/commands';
import {splitState} from '@/lib/backend/empty';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
 try {return json({workspace:await loadBusiness(await identity(request))});}catch(e){return fail(e)}
}
export async function POST(request:Request) {
 try {
  const user=await identity(request);
  if(Number(request.headers.get('content-length')||0)>200000) throw new ApiError('Request is too large.',413);
  const raw=await request.text();if(raw.length>200000) throw new ApiError('Request is too large.',413);
  const body=JSON.parse(raw);
  if(body.type==='createBusiness') {
   const profile=z.object({name:z.string().trim().min(1).max(200),business:z.string().trim().min(1).max(200),location:z.string().trim().max(200),type:z.string().trim().min(1).max(200)}).strict().parse(body.profile);
   return json({workspace:await ensureBusiness(user,profile)});
  }
  const input=z.object({requestId:z.uuid(),revision:z.number().int().min(0),command:z.unknown(),draft:z.object({cart:z.record(z.string().regex(/^\d+$/),z.number().int().min(0).max(1000000)),customer:z.string().trim().min(1).max(200),discount:z.number().int().min(0).max(1e9),discountKind:z.enum(['percent','fixed']),promotion:z.string().max(30),redeem:z.number().int().min(0).max(1e9)}).strict().optional()}).strict().parse(body);
  const workspace=await loadBusiness(user);
  if(!workspace) throw new ApiError('Create your business first.',409);
  const hash=createHash('sha256').update(JSON.stringify({command:input.command,...(input.draft?{draft:input.draft}:{})})).digest('hex');
  // A retried confirmed command returns its original result, even if stock has changed since then.
  const previous=await admin().from('business_commands').select('user_id,command_hash,result').eq('business_id',workspace.businessId).eq('request_id',input.requestId).maybeSingle();
  if(previous.error) throw new ApiError('Could not verify this request. Retry safely.',503);
  if(previous.data) {
   if(previous.data.user_id!==user.id||previous.data.command_hash!==hash) throw new ApiError('Request ID was used for another action.',409);
   return json({workspace,result:{...previous.data.result,duplicate:true}});
  }
  if(input.revision!==workspace.revision) throw new ApiError('Records changed. Refresh and review before trying again.',409);
  if(input.draft)Object.assign(workspace.state.operations,input.draft);
  const result=applyCommand(workspace.state,input.command,workspace.role);
  const {business,workspace:personal}=splitState(result.state);
  const {data,error}=await admin().rpc('commit_business_command',{
   p_business:workspace.businessId,p_user:user.id,p_revision:workspace.revision,p_request:input.requestId,p_hash:hash,
   p_type:(input.command as {type:string}).type,p_state:business,p_workspace:personal,p_result:{message:result.message,id:result.id},p_input:{command:input.command,...(input.draft?{draft:input.draft}:{})}
  });
  if(data?.conflict)throw new ApiError('Records changed. Refresh and review before trying again.',409);
  if(error) throw new ApiError(error.code==='40001'?'Records changed. Refresh and review before trying again.':'The change could not be confirmed. Retry the same request safely.',error.code==='40001'?409:503);
  return json({workspace:await loadBusiness(user),result:data});
 } catch(e) {return fail(e)}
}
