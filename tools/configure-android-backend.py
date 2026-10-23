#!/usr/bin/env python3
"""Write only public client config into ignored Android build settings."""
import pathlib,json
root=pathlib.Path(__file__).resolve().parents[1]
config=json.loads(pathlib.Path('/workspace/.config/biashara-cli/supabase/biasharaworld-public-config.json').read_text())
(root/'backend.properties').write_text('SUPABASE_URL='+config['NEXT_PUBLIC_SUPABASE_URL']+'\nSUPABASE_PUBLISHABLE_KEY='+config['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']+'\nAPI_URL=https://biasharaworld.vercel.app\n')
print('Android public configuration saved; no admin credentials included.')
