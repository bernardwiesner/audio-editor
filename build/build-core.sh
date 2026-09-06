#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
EXTRA_CFLAGS=${EXTRA_CFLAGS:--O3 -msimd128}
EXTRA_LDFLAGS=${EXTRA_LDFLAGS:-}

test -f "$PROJECT_DIR/build/codec-manifest.json" || {
  echo 'Run npm run build:codecs first.' >&2
  exit 1
}

node "$PROJECT_DIR/build/write-codec-flags.mjs" "$PROJECT_DIR/build/codec-manifest.json"
docker buildx build \
  --build-arg EXTRA_CFLAGS="$EXTRA_CFLAGS" \
  --build-arg EXTRA_LDFLAGS="$EXTRA_LDFLAGS" \
  -o "$PROJECT_DIR/dist/ffmpeg" \
  "$PROJECT_DIR"
