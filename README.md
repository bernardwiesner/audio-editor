# Audio Editor

A Vue 3, TypeScript audio editor built on FFmpeg.wasm and WaveSurfer. It trims
to a selected range, cuts a selected range, generates WaveSurfer peaks, and supports multi-step undo/redo.

The default build accepts MP3 and M4A/AAC, but you can also compile a custom build using the provided script in the repo
to support more audio codecs and formats.

## Run the demo

`npm install`, then `npm run dev`. The default MP3/M4A FFmpeg.wasm core is
included with the package, so the demo needs no asset configuration.

## Use

```vue
<script setup lang="ts">
import { AudioEditor } from 'audio-editor'
</script>

<template>
  <AudioEditor />
</template>
```

Use `useAudioEditor()` when you need custom controls. Trim and cut preserve the
uploaded MP3 or M4A container and return the edited file through the composable
state. Pass custom `coreURL` and `wasmURL` only when using a codec build you
created yourself.

## Build size

The FFmpeg.wasm build is intentionally kept minimalistic with a stripped down version of ffmpeg so it can be kept as small as possible as it has to be downloaded by the client in the browser. Adding more codecs will increase the size of the build, but it should not be much.

Build output:
- `dist/ffmpeg-core.js`
- `dist/ffmpeg-core.wasm`

Typical output size (uncompressed):
- `ffmpeg-core.wasm`: ~`1.3 MB`
- `ffmpeg-core.js`: ~`80 KB`

Delivery recommendations:
- Serve these files with HTTP compression (`gzip` or `br`), especially the `.wasm`.
- In practice, compressed `.wasm` download size is often ~`70%` smaller (for a `1.3 MB` file, roughly `350-450 KB` over the network).
- After first download, assets should be cached by the browser in SPA deployments (subject to your cache headers/versioning strategy), so repeat visits avoid re-downloading unchanged core files.

## Custom codec builds

Run `npm run build:codecs`, choose from MP3, AAC/M4A, WAV/PCM, FLAC,
Opus/Ogg, Vorbis/Ogg, ALAC/M4A, and WMA, then run `npm run build:core`.
