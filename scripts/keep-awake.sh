#!/bin/sh
set -eu
if ! command -v caffeinate >/dev/null 2>&1; then
  printf '%s\n' 'Temporary sleep prevention requires macOS.' >&2
  exit 1
fi
exec caffeinate -dimsu "$@"
