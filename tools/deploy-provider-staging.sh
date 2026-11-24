#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

release_dir="$(mktemp -d)"
trap 'rm -rf -- "$release_dir"' EXIT
source_dir="$release_dir/source"
mkdir "$source_dir"
git ls-files --cached --others --exclude-standard -z -- .vercelignore web shared |
  tar --null -T - -cf - |
  tar -xf - -C "$source_dir"
test -f "$source_dir/web/package.json"
test -f "$source_dir/shared/operation-contracts.json"

bash tools/backend-cli.sh vercel deploy --cwd "$source_dir" \
  --project prj_yPKKqhYLJF7MQm8QU3oTJxkZZVUx --scope biasharaworld \
  --environment preview --yes --verify --json > "$release_dir/deployment.json"
deployment_url="$(node --input-type=module - "$release_dir/deployment.json" <<'JS'
import { readFileSync } from "node:fs";
const { deployment } = JSON.parse(readFileSync(process.argv[2], "utf8"));
if (deployment?.readyState !== "READY" || !deployment.verification?.ok || deployment.target === "production") {
  throw new Error("The Preview deployment did not pass verification.");
}
console.log(deployment.url);
JS
)"
bash tools/backend-cli.sh vercel alias set "$deployment_url" biasharaworld-staging.vercel.app \
  --cwd "$source_dir" --scope biasharaworld
curl --silent --show-error --max-time 15 \
  --output "$release_dir/public-check.json" https://biasharaworld-staging.vercel.app/api/workspace
node --input-type=module - "$release_dir/public-check.json" <<'JS'
import { readFileSync } from "node:fs";
const response = JSON.parse(readFileSync(process.argv[2], "utf8"));
if (response.error !== "Sign in to continue.") throw new Error("The staging alias did not reach the public app routes.");
JS
