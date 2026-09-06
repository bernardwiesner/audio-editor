#!/usr/bin/env bash

set -euo pipefail

CONF_FLAGS=(
  -I.
  -I./src/fftools
  -Llibavcodec
  -Llibavdevice
  -Llibavfilter
  -Llibavformat
  -Llibavutil
  -Llibswresample
  -Llibswscale
  -lavcodec
  -lavdevice
  -lavfilter
  -lavformat
  -lavutil
  -lswresample
  -lswscale
  -Wno-deprecated-declarations
  $LDFLAGS
  -sENVIRONMENT=worker
  -sWASM_BIGINT
  -sMODULARIZE
  -sINITIAL_MEMORY=64MB
  -sALLOW_MEMORY_GROWTH
  -sEXPORT_NAME=createFFmpegCore
  -sEXPORTED_FUNCTIONS=$(node src/bind/ffmpeg/export.js)
  -sEXPORTED_RUNTIME_METHODS=$(node src/bind/ffmpeg/export-runtime.js)
  -lworkerfs.js
  --pre-js src/bind/ffmpeg/bind.js

  src/fftools/cmdutils.c
  src/fftools/ffmpeg.c
  src/fftools/ffmpeg_filter.c
  src/fftools/ffmpeg_hw.c
  src/fftools/ffmpeg_mux.c
  src/fftools/ffmpeg_opt.c
  src/fftools/opt_common.c
  src/fftools/ffprobe.c
)

emcc "${CONF_FLAGS[@]}" "$@"
