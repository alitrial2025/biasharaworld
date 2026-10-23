"use client";
import {useState} from 'react';
import {useDemo} from '@/lib/store';
import {Button} from './ui';
export function LiveSync(){const {store}=useDemo();const [message,setMessage]=useState('');return <section className="panel"><h2>Your shared business records</h2><p>Your saved changes are available on the website and Android app. Refresh to see the latest updates.</p><p>Last updated: {store.workspace?new Date(store.workspace.updatedAt).toLocaleString('en-KE',{timeZone:'Africa/Nairobi'}):'Not connected'}</p><p role="status">{store.busy?'Saving…':store.error||message||'Connected'}</p><Button onClick={async()=>{await store.hydrate();setMessage(store.error?'':'Records refreshed.')}} disabled={store.busy}>Refresh records</Button>{store.hasPending&&<Button onClick={()=>void store.retry().catch(()=>{})}>Retry unconfirmed request</Button>}<p>Reconnect to save changes. If a save was interrupted, retry it safely here.</p></section>}
