"use client";
import {useState,type FormEvent} from 'react';
import {supabase} from '@/lib/supabase';
import {Brand,Button,Field} from '@/components/ui';
export default function Reset(){
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[done,setDone]=useState(false);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const d=new FormData(e.currentTarget);setBusy(true);setError('');try{const password=String(d.get('password'));if(password!==d.get('confirm'))throw new Error('Passwords do not match.');const {error}=await supabase().auth.updateUser({password});if(error)throw error;setDone(true)}catch(e){setError(e instanceof Error?e.message:'Please retry.')}finally{setBusy(false)}}
 return <main id="main-content" className="auth-page"><section className="auth-form-area"><div className="auth-form-wrap"><Brand/><h1>{done?'Password updated':'Choose a new password'}</h1>{error&&<p role="alert">{error}</p>}{done?<Button href="/dashboard">Open workspace</Button>:<form onSubmit={submit}><Field label="New password" name="password" type="password" minLength={8} autoComplete="new-password" required/><Field label="Confirm password" name="confirm" type="password" minLength={8} autoComplete="new-password" required/><Button type="submit" disabled={busy}>Save password</Button></form>}</div></section></main>
}
