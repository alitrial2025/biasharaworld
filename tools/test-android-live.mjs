#!/usr/bin/env node
// Creates a temporary confirmed account, runs the actual Kotlin client against production, and cleans it up.
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const require=createRequire(new URL('../web/package.json',import.meta.url));
const {createClient}=require('@supabase/supabase-js');
const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const email=`native-${randomUUID()}@biashara-test.invalid`,password=randomUUID()+'Aa1!';
let userId;
try {
 const created=await admin.auth.admin.createUser({email,password,email_confirm:true});if(created.error)throw created.error;userId=created.data.user.id;
 const environment={...process.env,BIASHARA_LIVE_TEST_EMAIL:email,BIASHARA_LIVE_TEST_PASSWORD:password};
 delete environment.SUPABASE_SECRET_KEY;
 const exitCode=await new Promise((resolve,reject)=>{const child=spawn('./gradlew',[':app:testDebugUnitTest','--tests','com.biashara.app.data.NativeLiveWorkflowTest','--console=plain','--no-daemon','--no-parallel','--max-workers=1','-Dorg.gradle.jvmargs=-Xmx2200m -Dfile.encoding=UTF-8','-Pkotlin.compiler.execution.strategy=in-process'],{cwd:root,env:environment,stdio:'inherit'});child.once('error',reject);child.once('exit',code=>resolve(code??1))});
 process.exitCode=exitCode;
} finally {
 if(userId){const {data}=await admin.from('business_members').select('business_id,role').eq('user_id',userId);for(const m of data||[]){if(m.role!=='Owner')continue;const files=await admin.storage.from('product-images').list(m.business_id);if(files.data?.length)await admin.storage.from('product-images').remove(files.data.map(file=>m.business_id+'/'+file.name));await admin.from('business_commands').delete().eq('business_id',m.business_id);await admin.from('businesses').delete().eq('id',m.business_id)}await admin.auth.admin.deleteUser(userId)}
 console.log('Temporary native integration account and business records cleaned up.');
}
