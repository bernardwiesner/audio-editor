#!/usr/bin/env bash

set -euo pipefail

source build/codec-flags.sh

CONF_FLAGS=(
  --target-os=none
  --arch=x86_32
  --enable-cross-compile
  --disable-x86asm
  --disable-inline-asm
  --disable-stripping
  --disable-programs
  --disable-doc
  --disable-debug
  --disable-runtime-cpudetect
  --disable-autodetect
  --disable-network
  --disable-everything

  --enable-small
  --enable-protocol=file
  --enable-protocol=pipe

  --enable-ffmpeg
  --enable-ffprobe
  --enable-avcodec
  --enable-avformat
  --enable-avfilter
  --enable-swresample

  --enable-filter=atrim,asetpts

  --nm=emnm
  --ar=emar
  --ranlib=emranlib
  --cc=emcc
  --cxx=em++
  --objcc=emcc
  --dep-cc=emcc
  --extra-cflags="$CFLAGS"
  --extra-cxxflags="$CXXFLAGS"
)

emconfigure ./configure "${CONF_FLAGS[@]}" "${CODEC_FLAGS[@]}"
emmake make -j"$(nproc)"
