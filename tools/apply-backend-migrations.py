#!/usr/bin/env python3
"""Apply reviewed additive migrations to the dedicated BiasharaOS project via Management API.
Credentials stay outside source; migration hashes prevent unnoticed edits/reapplication.
"""
import hashlib,json,pathlib,urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[1]
TOKEN=pathlib.Path('/workspace/.config/biashara-cli/supabase/access-token').read_text().strip()
def sql(query):
 r=urllib.request.urlopen(urllib.request.Request('https://api.supabase.com/v1/projects/rhgoiebknrpxtouswaar/database/query',data=json.dumps({'query':query}).encode(),headers={'Authorization':'Bearer '+TOKEN,'Content-Type':'application/json'}),timeout=60)
 return json.load(r)
sql('create schema if not exists app_migrations; create table if not exists app_migrations.applied(name text primary key, sha256 text not null, applied_at timestamptz not null default now());')
for p in sorted((ROOT/'supabase/migrations').glob('*.sql')):
 digest=hashlib.sha256(p.read_bytes()).hexdigest()
 existing=sql("select sha256 from app_migrations.applied where name='"+p.name+"'")
 if existing:
  if existing[0]['sha256']!=digest: raise SystemExit('Applied migration was changed: '+p.name)
  print('Already applied:',p.name);continue
 sql('begin;\n'+p.read_text()+"\ninsert into app_migrations.applied(name,sha256) values ('"+p.name+"','"+digest+"');\ncommit;")
 print('Applied:',p.name)
