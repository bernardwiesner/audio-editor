# Audio Editor

A Vue 3, TypeScript audio editor built on FFmpeg.wasm and WaveSurfer. It trims
to a selected range, cuts a selected range, inserts audio at the playhead,
generates WaveSurfer peaks, and supports multi-step undo/redo, everything done
with very little memory consumption and great speed with the power of WebAssembly.

The default build accepts MP3 and M4A/AAC, but you can also compile a custom build using the provided script in the repo
to support more audio codecs and formats.

## Run the demo

`npm install`, then `npm run dev`. The default MP3/M4A FFmpeg.wasm core is
included with the package, so the demo needs no asset configuration.

## Use

```vue
<script setup lang="ts">
import { AudioEditor, useAudioEditor } from 'audio-editor'

const { state } = useAudioEditor()
</script>

<template>
  <AudioEditor
    :file="state.file"
    :peaks="state.peaks"
    :duration="state.duration"
  />
</template>
```

`AudioEditor` only renders the waveform. Use `useAudioEditor()` to load and
edit audio, then build the file picker, transport, selections, and buttons for
your application. Trim and cut preserve the uploaded MP3 or M4A container.
Pass custom `coreURL` and `wasmURL` only when using a codec build you created
yourself.

Insert audio works best when it comes from the same source as the original
audio, with matching volume, codec, bitrate, sample rate, and channel count.
When those technical settings differ, the inserted audio is converted to match
the original before it is added. The existing audio is never re-transcoded.

## API

### `<AudioEditor />`

The waveform component accepts:

- `file: File | null` — the source audio file.
- `peaks: Float32Array[]` — waveform peaks from `useAudioEditor`.
- `duration: number` — source audio duration in seconds.
- `waveSurfer: Partial<Omit<WaveSurferOptions, 'container' | 'url' | 'peaks' | 'duration'>>` — optional WaveSurfer options, including plugins.

The component emits `created(waveSurfer)` and `ready(waveSurfer)`. Register
plugins during `created`, then add playback controls or regions in your own UI.

### `useAudioEditor(assets?, options?)`

`assets` is an optional `FfmpegAssets` object. `options` accepts `maxHistory`
and `onProgress(progress)` for waveform generation.

The composable returns:

- `state` — reactive `file`, `peaks`, `duration`, `progress`, and `processing` values.
- `canUndo` and `canRedo` — reactive booleans.
- `load(file)` — loads an MP3 or M4A file and generates its waveform peaks.
- `trim(start, end)` — keeps the selected range.
- `cut(start, end)` — removes the selected range.
- `getInsertPlan(file)` — reads the current and incoming audio settings without changing either file. Its `InsertPlan.requiresTranscode` value lets your UI ask for confirmation.
- `insert(file, time, plan)` — inserts the file at `time`, using the plan returned by `getInsertPlan`, and returns the inserted duration.
- `undo()` and `redo()` — restore prior edits.

### `AudioProcessor`

For non-Vue usage, `AudioProcessor` provides `trim`, `cut`, `getDuration`,
`getAudioStreamInfo`, `getPeaksByChunk`, `getInsertPlan`, and `insert`. Its
`insert` method uses the same `InsertPlan` workflow as the composable.

`FfmpegAssets` contains `coreURL` and `wasmURL`. `AudioStreamInfo` contains
`codec`, `sampleRate`, `channels`, and `bitRate`. `InsertPlan` contains
`requiresTranscode`, `originalStream`, and `insertStream`; `InsertResult`
contains `insertedFile` and `mergedFile`.

### Other exports

- `defaultFfmpegAssets` — the FFmpeg.wasm assets used automatically when no custom assets are supplied.
- `EditHistory<T>` — the standalone undo/redo history class. It provides `commit(current)`, `undo(current)`, `redo(current)`, `canUndo`, and `canRedo`.
- `EditorOptions` — the `useAudioEditor` options type.
- `EditState` — the file and waveform peaks stored in each history entry.
- `PeakOptions` — the waveform peak options type.

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
