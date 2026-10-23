#!/usr/bin/env bash
# Install pinned official CLIs outside the application checkout.
set -euo pipefail
biashara_cli_root="${BIASHARA_CLI_ROOT:-/workspace/.toolchains/backend-cli}"
export npm_config_cache="${npm_config_cache:-/workspace/.cache/npm}"
mkdir -p "$biashara_cli_root"
if [[ -f "$biashara_cli_root/package-lock.json" ]] && node -e 'const p=require(process.argv[1]);process.exit(p.dependencies?.vercel==="65.2.0"&&p.dependencies?.supabase==="2.122.0"?0:1)' "$biashara_cli_root/package.json"; then
  npm ci --prefix "$biashara_cli_root" --no-fund --no-audit
else
  npm install --prefix "$biashara_cli_root" --save-exact --no-fund --no-audit vercel@65.2.0 supabase@2.122.0
fi
biashara_repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
bash "$biashara_repo_root/tools/backend-cli.sh" vercel --version
bash "$biashara_repo_root/tools/backend-cli.sh" supabase --version
