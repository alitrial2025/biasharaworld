import {createHmac} from 'node:crypto';
import {z} from 'zod';
import {admin,fail,json,ApiError} from '@/lib/backend/server';
export async function POST(request:Request){
 try{
  const raw=await request.text();if(raw.length>15000)throw new ApiError('Please keep your message under 4,000 characters.',413);
  const body=z.object({name:z.string().trim().min(1).max(200),email:z.email().max(320),business:z.string().trim().max(200),topic:z.string().trim().min(1).max(100),message:z.string().trim().min(5).max(4000)}).strict().parse(JSON.parse(raw));
  const address=request.headers.get('x-vercel-forwarded-for')||request.headers.get('x-forwarded-for')||'local-development';
  const rate=createHmac('sha256',process.env.SUPABASE_SECRET_KEY!).update(address.split(',')[0].trim()).digest('hex');
  const {data,error}=await admin().rpc('submit_contact',{p_name:body.name,p_email:body.email,p_business:body.business,p_topic:body.topic,p_message:body.message,p_rate:rate});
  if(error)throw new ApiError('Message could not be saved. Please try again later.',503);
  if(data.limited)throw new ApiError('Too many messages. Please try again in an hour.',429);
  return json({id:data.id});
 }catch(e){return fail(e)}
}
