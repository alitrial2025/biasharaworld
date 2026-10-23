#!/usr/bin/env bash
# Install and verify the Next.js UI independently of the Android toolchain.
set -euo pipefail
biashara_repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$biashara_repo_root/web"
node --eval 'const [major, minor] = process.versions.node.split(".").map(Number); if (major < 20 || (major === 20 && minor < 9)) { console.error("Node.js 20.9+ is required."); process.exit(1); }'
export npm_config_cache="${npm_config_cache:-/tmp/biasharaos-npm-cache}"
npm ci --no-fund --no-audit
if [[ -f ../app/build/outputs/apk/debug/app-debug.apk ]]; then
  cp ../app/build/outputs/apk/debug/app-debug.apk public/downloads/biasharaos-preview.apk
fi
npm run lint
npm run build
npm run typecheck
