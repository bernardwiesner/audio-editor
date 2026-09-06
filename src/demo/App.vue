<template>
  <main class="min-h-screen bg-slate-950 px-5 py-12 text-slate-900 sm:px-8">
    <div class="mx-auto max-w-5xl">
      <header class="mb-8 text-white">
        <p class="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">Audio Editor demo</p>
        <h1 class="text-4xl font-bold tracking-tight sm:text-5xl">Make clean edits in the browser.</h1>
        <p class="mt-4 max-w-2xl text-base leading-7 text-slate-300">Upload an MP3 or M4A, select the part you want to keep or remove, then use undo and redo to refine the edit.</p>
      </header>

      <section class="grid gap-4 rounded-2xl bg-white p-5 shadow-2xl shadow-black/30 sm:p-8">
        <header class="flex flex-wrap items-center justify-between gap-3">
          <label class="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 font-semibold text-white">
            <i aria-hidden="true" class="fa-solid fa-folder-open" />
            <span>Choose audio</span>
            <input accept=".mp3,.m4a,audio/mpeg,audio/mp4" class="hidden" type="file" @change="selectFile">
          </label>
          <input ref="insertInput" accept=".mp3,.m4a,audio/mpeg,audio/mp4" class="hidden" type="file" @change="selectInsert">
          <span class="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm text-slate-500">{{ state.file?.name || 'MP3 or M4A' }}</span>
        </header>

        <div class="relative min-h-[154px] min-w-0">
          <AudioEditor
            :duration="state.duration"
            :file="state.file"
            :peaks="state.peaks"
            @created="onWaveformCreated"
            @ready="onWaveformReady"
          />
          <div v-if="state.processing" class="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-slate-950/35 backdrop-blur-[1px]">
            <div class="relative z-20 inline-flex items-center gap-3 rounded-lg bg-white px-4 py-3 font-semibold text-slate-900 shadow-xl">
              <i aria-hidden="true" class="fa-solid fa-spinner animate-spin text-indigo-700" />
              {{ state.progress ? `Generating waveform: ${state.progress}%` : 'Processing audio…' }}
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3 font-semibold tabular-nums text-slate-500">
          <button :disabled="!state.file || state.processing" class="inline-flex items-center gap-2 rounded-lg border border-indigo-900 bg-indigo-900 px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-45" @click="togglePlay">
            <i :class="playing ? 'fa-solid fa-pause' : 'fa-solid fa-play'" aria-hidden="true" />
            {{ playing ? 'Pause' : 'Play' }}
          </button>
          <span>{{ formatTime(currentTime) }} / {{ formatTime(state.duration) }}</span>
          <span class="h-6 w-px bg-slate-300" />
          <button aria-label="Zoom out" :disabled="!state.file || state.processing || zoomLevel === 0" class="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 disabled:cursor-not-allowed disabled:opacity-45" @click="zoomOut">
            <i aria-hidden="true" class="fa-solid fa-magnifying-glass-minus" />
          </button>
          <button aria-label="Zoom in" :disabled="!state.file || state.processing || zoomLevel === ZOOM_STEPS - 1" class="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 disabled:cursor-not-allowed disabled:opacity-45" @click="zoomIn">
            <i aria-hidden="true" class="fa-solid fa-magnifying-glass-plus" />
          </button>
        </div>

        <div class="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 font-semibold text-slate-700">
          <template v-if="!selectionMode">
            <button :disabled="!canSelect" class="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 disabled:cursor-not-allowed disabled:opacity-45" @click="startSelection('trim')"><i aria-hidden="true" class="fa-solid fa-crop-simple" />Trim</button>
            <button :disabled="!canSelect" class="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 disabled:cursor-not-allowed disabled:opacity-45" @click="startSelection('cut')"><i aria-hidden="true" class="fa-solid fa-scissors" />Cut</button>
            <button :disabled="!canSelect" class="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 disabled:cursor-not-allowed disabled:opacity-45" @click="chooseInsert"><i aria-hidden="true" class="fa-solid fa-file-import" />Insert audio</button>
          </template>

          <template v-else>
            <span class="text-sm text-slate-600">{{ selectionMode === 'trim' ? 'Keep' : 'Remove' }} {{ formatTime(start) }} – {{ formatTime(end) }}</span>
            <button :disabled="!canEdit" class="inline-flex items-center gap-2 rounded-lg border border-indigo-900 bg-indigo-900 px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-45" @click="applySelection"><i aria-hidden="true" class="fa-solid fa-check" />Apply {{ selectionMode }}</button>
            <button class="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2" @click="cancelSelection"><i aria-hidden="true" class="fa-solid fa-xmark" />Cancel</button>
          </template>

          <span class="h-6 w-px bg-slate-300" />
          <button :disabled="!canUndo || state.processing" class="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 disabled:cursor-not-allowed disabled:opacity-45" @click="undo"><i aria-hidden="true" class="fa-solid fa-rotate-left" />Undo</button>
          <button :disabled="!canRedo || state.processing" class="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 disabled:cursor-not-allowed disabled:opacity-45" @click="redo"><i aria-hidden="true" class="fa-solid fa-rotate-right" />Redo</button>
          <button :disabled="!state.file || state.processing" class="ml-auto inline-flex items-center gap-2 rounded-lg border border-indigo-900 bg-indigo-900 px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-45" @click="saveAudio"><i aria-hidden="true" class="fa-solid fa-download" />Save audio</button>
        </div>
      </section>

      <p class="mt-5 text-center text-sm text-slate-400">Audio stays in your browser while you edit.</p>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type WaveSurfer from 'wavesurfer.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js'
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.esm.js'
import ZoomPlugin from 'wavesurfer.js/dist/plugins/zoom.esm.js'
import { AudioEditor, useAudioEditor } from '../index'

const ZOOM_STEPS = 7

const insertInput = ref<HTMLInputElement>()
const start = ref(0)
const end = ref(0)
const currentTime = ref(0)
const playing = ref(false)
const zoomLevel = ref(0)
const selectionMode = ref<'trim' | 'cut' | null>(null)
const selection = ref<ReturnType<ReturnType<typeof RegionsPlugin.create>['addRegion']> | null>(null)
const { state, canUndo, canRedo, load, trim, cut, getInsertPlan, insert, undo, redo } = useAudioEditor()
let waveSurfer: WaveSurfer | null = null
let regions: ReturnType<typeof RegionsPlugin.create> | null = null
let nextPlayheadTime: number | null = null
let insertedRange: { start: number, end: number } | null = null
let zoomLevels: number[] = []
const canSelect = computed(() => Boolean(state.file) && !state.processing)
const canEdit = computed(() => Boolean(selection.value) && end.value > start.value && end.value <= state.duration && !state.processing)

async function selectFile (event: Event): Promise<void> {
  const nextFile = (event.target as HTMLInputElement).files?.[0]
  if (!nextFile) return
  await load(nextFile)
  start.value = 0
  end.value = state.duration
}

function chooseInsert (): void {
  insertInput.value!.click()
}

async function selectInsert (event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const insertFile = input.files?.[0]
  if (!insertFile) return
  const insertionTime = currentTime.value
  const plan = await getInsertPlan(insertFile)
  const confirmed = !plan.requiresTranscode || window.confirm(`This audio needs to be converted to ${plan.originalStream.codec} before it can be inserted. Continue?`)
  if (!confirmed) {
    input.value = ''
    return
  }
  nextPlayheadTime = insertionTime
  const insertDuration = await insert(insertFile, insertionTime, plan)
  insertedRange = { start: insertionTime, end: insertionTime + insertDuration }
  input.value = ''
}

function onWaveformCreated (nextWaveSurfer: WaveSurfer): void {
  waveSurfer = nextWaveSurfer
  regions = waveSurfer.registerPlugin(RegionsPlugin.create())
  waveSurfer.registerPlugin(TimelinePlugin.create({ height: 15 }))
  const minZoom = waveSurfer.getWrapper().clientWidth / state.duration
  const maxZoom = minZoom * 2 ** (ZOOM_STEPS - 1)
  waveSurfer.registerPlugin(ZoomPlugin.create({
    scale: (maxZoom - minZoom) / (ZOOM_STEPS - 1) / 100,
    deltaThreshold: 10,
    maxZoom
  }))
  waveSurfer.on('timeupdate', (time) => {
    currentTime.value = time
  })
  waveSurfer.on('interaction', (time) => {
    currentTime.value = time
  })
  waveSurfer.on('drag', (relativeX) => {
    currentTime.value = relativeX * state.duration
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
  waveSurfer.on('zoom', (minPxPerSec) => {
    let closestLevel = 0
    for (let index = 1; index < zoomLevels.length; index += 1) {
      if (Math.abs(zoomLevels[index] - minPxPerSec) < Math.abs(zoomLevels[closestLevel] - minPxPerSec)) {
        closestLevel = index
      }
    }
    zoomLevel.value = closestLevel
  })
  regions.on('region-updated', (region) => {
    start.value = region.start
    end.value = region.end
  })
}

function onWaveformReady (): void {
  setZoomLevels()
  zoomLevel.value = 0
  if (nextPlayheadTime !== null) {
    waveSurfer!.setTime(nextPlayheadTime)
    currentTime.value = nextPlayheadTime
    nextPlayheadTime = null
  }

  if (!insertedRange) return
  const region = regions!.addRegion({
    id: 'insert',
    start: insertedRange.start,
    end: insertedRange.end,
    color: 'rgba(0, 255, 255, 0.3)',
    drag: false,
    resize: false
  })
  region.element.style.backdropFilter = 'brightness(65%) contrast(400%)'
  insertedRange = null
}

function setZoomLevels (): void {
  const minZoom = waveSurfer!.getWrapper().clientWidth / state.duration
  const maxZoom = minZoom * 2 ** (ZOOM_STEPS - 1)
  zoomLevels = [0]
  for (let step = 1; step < ZOOM_STEPS; step += 1) {
    zoomLevels.push(Math.min(minZoom * 2 ** step, maxZoom))
  }
}

function setZoomLevel (nextZoomLevel: number): void {
  zoomLevel.value = nextZoomLevel
  waveSurfer!.zoom(zoomLevels[nextZoomLevel])
}

function zoomIn (): void {
  setZoomLevel(Math.min(ZOOM_STEPS - 1, zoomLevel.value + 1))
}

function zoomOut (): void {
  setZoomLevel(Math.max(0, zoomLevel.value - 1))
}

function togglePlay (): void {
  waveSurfer!.playPause()
}

function saveAudio (): void {
  const url = URL.createObjectURL(state.file!)
  const link = document.createElement('a')
  link.href = url
  link.download = state.file!.name
  link.click()
  URL.revokeObjectURL(url)
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
  const totalMilliseconds = Math.floor(value * 1000)
  const minutes = Math.floor(totalMilliseconds / 60000)
  const seconds = Math.floor(totalMilliseconds / 1000) % 60
  const milliseconds = totalMilliseconds % 1000
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`
}
</script>
