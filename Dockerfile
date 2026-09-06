# syntax=docker/dockerfile-upstream:master-labs

FROM emscripten/emsdk:3.1.40 AS builder

ARG EXTRA_CFLAGS=""
ARG EXTRA_LDFLAGS=""
ENV CFLAGS="${EXTRA_CFLAGS}"
ENV CXXFLAGS="${EXTRA_CFLAGS}"
ENV LDFLAGS="${EXTRA_CFLAGS} ${EXTRA_LDFLAGS}"
ENV FFMPEG_VERSION=n5.1.4

RUN apt-get update && \
  apt-get install -y pkg-config autoconf automake libtool libtool-bin gettext ragel

ADD https://github.com/FFmpeg/FFmpeg.git#$FFMPEG_VERSION /src

COPY build /src/build
COPY src/bind /src/src/bind
COPY src/fftools /src/src/fftools

WORKDIR /src
RUN bash -x build/ffmpeg.sh
RUN mkdir -p dist/esm && bash -x build/ffmpeg-wasm.sh -sEXPORT_ES6 -o dist/esm/ffmpeg-core.js

FROM scratch AS export
COPY --from=builder /src/dist /dist
