<template>
  <section class="audio-editor">
    <header class="editor-header">
      <label class="file-picker">
        <span>Choose audio</span>
        <input accept=".mp3,.m4a,audio/mpeg,audio/mp4" type="file" @change="selectFile">
      </label>
      <span class="file-name">{{ state.file?.name || 'MP3 or M4A' }}</span>
    </header>

    <div class="waveform-panel">
      <div ref="waveformElement" class="waveform" />
      <div v-if="state.processing" class="processing">
        {{ state.progress ? `Generating waveform: ${state.progress}%` : 'Processing audio…' }}
      </div>
    </div>

    <div class="transport">
      <button :disabled="!state.file || state.processing" class="play-button" @click="togglePlay">
        {{ playing ? 'Pause' : 'Play' }}
      </button>
      <span>{{ formatTime(currentTime) }} / {{ formatTime(state.duration) }}</span>
    </div>

    <div class="controls">
      <template v-if="!selectionMode">
        <button :disabled="!canSelect" @click="startSelection('trim')">Trim</button>
        <button :disabled="!canSelect" @click="startSelection('cut')">Cut</button>
      </template>

      <template v-else>
        <span class="selection-summary">{{ selectionMode === 'trim' ? 'Keep' : 'Remove' }} {{ formatTime(start) }} – {{ formatTime(end) }}</span>
        <button :disabled="!canEdit" class="primary" @click="applySelection">Apply {{ selectionMode }}</button>
        <button @click="cancelSelection">Cancel</button>
      </template>

      <span class="control-divider" />
      <button :disabled="!canUndo || state.processing" @click="undo">Undo</button>
      <button :disabled="!canRedo || state.processing" @click="redo">Redo</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import WaveSurfer from 'wavesurfer.js'
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.esm.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js'
import { useAudioEditor } from '../composables/useAudioEditor'
import type { FfmpegAssets } from '../core/audioProcessor'

const props = defineProps<{
  ffmpeg?: FfmpegAssets
  waveSurfer?: Record<string, unknown>
}>()

const waveformElement = ref<HTMLDivElement>()
const start = ref(0)
const end = ref(0)
const currentTime = ref(0)
const playing = ref(false)
const selectionMode = ref<'trim' | 'cut' | null>(null)
const selection = ref<ReturnType<ReturnType<typeof RegionsPlugin.create>['addRegion']> | null>(null)
let waveSurfer: WaveSurfer | null = null
let regions: ReturnType<typeof RegionsPlugin.create> | null = null
let nextPlayheadTime: number | null = null
const editor = useAudioEditor(props.ffmpeg)
const { state, canUndo, canRedo, load, trim, cut, undo, redo } = editor
const canSelect = computed(() => Boolean(state.file) && !state.processing)
const canEdit = computed(() => Boolean(selection.value) && end.value > start.value && end.value <= state.duration && !state.processing)

async function selectFile (event: Event): Promise<void> {
  const nextFile = (event.target as HTMLInputElement).files?.[0]
  if (!nextFile) return
  await load(nextFile)
  start.value = 0
  end.value = state.duration
}

function togglePlay (): void {
  waveSurfer!.playPause()
}

function startSelection (mode: 'trim' | 'cut'): void {
  const startTime = mode === 'trim' ? 0 : waveSurfer!.getCurrentTime()
  const endTime = mode === 'trim'
    ? state.duration
    : Math.min(state.duration, startTime + Math.max(1, state.duration / 20))

  regions!.clearRegions()
  selection.value = regions!.addRegion({
    id: 'selection',
    start: startTime,
    end: endTime,
    color: mode === 'trim' ? 'rgba(34, 197, 94, 0.18)' : 'rgba(239, 68, 68, 0.2)',
    drag: mode === 'cut',
    resize: true
  })
  selectionMode.value = mode
  start.value = startTime
  end.value = endTime
}

function cancelSelection (): void {
  regions!.clearRegions()
  selection.value = null
  selectionMode.value = null
}

async function applySelection (): Promise<void> {
  const mode = selectionMode.value!
  const selectionStart = start.value
  cancelSelection()
  if (mode === 'trim') {
    await trim(start.value, end.value)
    return
  }
  nextPlayheadTime = selectionStart
  await cut(start.value, end.value)
}

function formatTime (value: number): string {
  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60)
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

async function renderWaveform (): Promise<void> {
  if (!state.file || !waveformElement.value) return
  waveSurfer?.destroy()
  regions = RegionsPlugin.create()
  const { plugins = [], ...waveSurferOptions } = props.waveSurfer ?? {}
  waveSurfer = WaveSurfer.create({
    ...waveSurferOptions,
    container: waveformElement.value,
    url: URL.createObjectURL(state.file),
    peaks: state.peaks,
    duration: state.duration,
    height: 120,
    barWidth: 1,
    barGap: 1,
    waveColor: '#bab8b8',
    progressColor: '#3E4784',
    dragToSeek: true,
    normalize: true,
    plugins: [TimelinePlugin.create({ height: 15 }), regions, ...(plugins as [])]
  })
  waveSurfer.on('timeupdate', (time) => {
    currentTime.value = time
  })
  waveSurfer.on('ready', () => {
    if (nextPlayheadTime === null) return
    waveSurfer!.setTime(nextPlayheadTime)
    currentTime.value = nextPlayheadTime
    nextPlayheadTime = null
  })
  waveSurfer.on('play', () => {
    playing.value = true
  })
  waveSurfer.on('pause', () => {
    playing.value = false
  })
  waveSurfer.on('finish', () => {
    playing.value = false
  })
  regions.on('region-updated', (region) => {
    start.value = region.start
    end.value = region.end
  })
}

watch(() => state.file, async () => {
  await nextTick()
  await renderWaveform()
})

onBeforeUnmount(() => waveSurfer?.destroy())
</script>

<style scoped>
.audio-editor { display: grid; gap: 1rem; color: #172033; }
.editor-header, .transport, .controls { align-items: center; display: flex; flex-wrap: wrap; gap: .75rem; }
.editor-header { justify-content: space-between; }
.file-picker { background: #172033; border-radius: .5rem; color: #fff; cursor: pointer; font-weight: 600; padding: .65rem 1rem; }
.file-picker input { display: none; }
.file-name { color: #667085; font-size: .875rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.waveform-panel { min-height: 154px; position: relative; }
.waveform { background: #f8fafc; border: 1px solid #d0d5dd; border-radius: .75rem; min-height: 152px; overflow: hidden; }
.processing { align-items: center; background: rgba(255, 255, 255, .92); border-radius: .75rem; display: flex; inset: 0; justify-content: center; position: absolute; }
.transport { color: #667085; font-variant-numeric: tabular-nums; font-weight: 600; }
button { background: #fff; border: 1px solid #d0d5dd; border-radius: .5rem; color: #344054; cursor: pointer; font: inherit; font-weight: 600; padding: .55rem .8rem; }
button:hover:not(:disabled) { background: #f2f4f7; }
button:disabled { cursor: not-allowed; opacity: .45; }
.play-button, .primary { background: #3e4784; border-color: #3e4784; color: #fff; }
.play-button:hover:not(:disabled), .primary:hover:not(:disabled) { background: #30386a; }
.controls { background: #f8fafc; border: 1px solid #eaecf0; border-radius: .75rem; padding: .75rem; }
.selection-summary { color: #475467; font-size: .875rem; font-weight: 600; }
.control-divider { background: #d0d5dd; height: 1.5rem; width: 1px; }
</style>
