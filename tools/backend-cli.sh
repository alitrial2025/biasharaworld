#!/usr/bin/env bash
# Run the cloud CLIs without writing credentials into the repository or read-only home.
set -euo pipefail
biashara_cli_root="${BIASHARA_CLI_ROOT:-/workspace/.toolchains/backend-cli}"
biashara_cli_config="${BIASHARA_CLI_CONFIG:-/workspace/.config/biashara-cli}"
biashara_cli_cache="${BIASHARA_CLI_CACHE:-/workspace/.cache/biashara-cli}"
biashara_service="${1:-}"
if [[ "$biashara_service" != vercel && "$biashara_service" != supabase ]]; then
  echo 'Usage: bash tools/backend-cli.sh <vercel|supabase> [arguments...]' >&2
  exit 2
fi
shift
biashara_cli_bin="$biashara_cli_root/node_modules/.bin/$biashara_service"
if [[ ! -x "$biashara_cli_bin" ]]; then
  echo 'CLI is missing. Run bash tools/setup-backend-cli.sh first.' >&2
  exit 1
fi
umask 077
mkdir -p "$biashara_cli_config" "$biashara_cli_cache"
export XDG_CONFIG_HOME="$biashara_cli_config"
export XDG_DATA_HOME="$biashara_cli_config"
export XDG_CACHE_HOME="$biashara_cli_cache"
export NO_UPDATE_NOTIFIER=1
export DO_NOT_TRACK=1
if [[ "$biashara_service" == supabase ]]; then
  export SUPABASE_HOME="$biashara_cli_config/supabase"
  # This cloud machine has no persistent desktop keyring. Supabase writes mode-0600 files.
  export SUPABASE_NO_KEYRING=1
  export SUPABASE_NO_UPDATE_NOTIFIER=1
  export SUPABASE_TELEMETRY_DISABLED=1
  if [[ "${1:-}" == login ]]; then
    exec "$biashara_cli_bin" "$@" --agent no --output-format text
  fi
fi
exec "$biashara_cli_bin" "$@"
