"use client";
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {supabase} from '@/lib/supabase';
export default function Callback(){
 const [error,setError]=useState('');
 useEffect(()=>{let active=true;const params=new URLSearchParams(location.search);supabase().auth.getSession().then(({data,error})=>{if(!active)return;if(error||!data.session){setError(params.get('error_description')||error?.message||'This confirmation link expired or was opened in another browser. Try signing in, or request a new reset link.');return}location.replace(params.get('intent')==='recovery'?'/reset-password':'/dashboard')});return()=>{active=false}},[]);
 return <main id="main-content" className="container section"><h1>{error?'Account link needs attention':'Confirming your account…'}</h1>{error&&<><p role="alert">{error}</p><Link href="/login">Return to sign in</Link></>}</main>
}
