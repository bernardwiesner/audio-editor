<template>
  <div ref="waveformElement" class="waveform" />
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import WaveSurfer from 'wavesurfer.js'
import type { WaveSurferOptions } from 'wavesurfer.js'

const props = defineProps<{
  file: File | null
  peaks: Float32Array[]
  duration: number
  waveSurfer?: Partial<Omit<WaveSurferOptions, 'container' | 'url' | 'peaks' | 'duration'>>
}>()

const emit = defineEmits<{
  created: [waveSurfer: WaveSurfer]
  ready: [waveSurfer: WaveSurfer]
}>()

const waveformElement = ref<HTMLDivElement>()
let waveSurfer: WaveSurfer | null = null

async function renderWaveform (): Promise<void> {
  waveSurfer?.destroy()
  if (!props.file || !waveformElement.value) return

  waveSurfer = WaveSurfer.create({
    height: 120,
    barWidth: 1,
    barGap: 1,
    waveColor: '#bab8b8',
    progressColor: '#3E4784',
    dragToSeek: true,
    normalize: true,
    ...props.waveSurfer,
    container: waveformElement.value,
    url: URL.createObjectURL(props.file),
    peaks: props.peaks,
    duration: props.duration
  })
  emit('created', waveSurfer)
  waveSurfer.on('ready', () => emit('ready', waveSurfer!))
}

watch(() => [props.file, props.peaks, props.duration], async () => {
  await nextTick()
  await renderWaveform()
})

onBeforeUnmount(() => waveSurfer?.destroy())
</script>

<style scoped>
.waveform { background: #f8fafc; border: 1px solid #d0d5dd; border-radius: .75rem; min-height: 152px; min-width: 0; overflow: hidden; width: 100%; }
</style>
