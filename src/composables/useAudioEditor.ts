import { computed, reactive } from 'vue'
import { AudioProcessor, type FfmpegAssets } from '../core/audioProcessor'
import { EditHistory } from '../core/history'
import type { EditState, EditorOptions } from '../core/types'

export function useAudioEditor (assets?: FfmpegAssets, options: EditorOptions = {}) {
  const processor = new AudioProcessor(assets)
  const state = reactive({
    file: null as File | null,
    peaks: [] as Float32Array[],
    duration: 0,
    progress: 0,
    processing: false
  })
  const history = reactive(new EditHistory<EditState>(options.maxHistory))

  async function load (nextFile: File): Promise<void> {
    state.processing = true
    try {
      state.duration = await processor.getDuration(nextFile)
      state.progress = 0
      console.log('Generating peaks from audio file...')
      const generationStartedAt = performance.now()
      state.peaks = await processor.getPeaksByChunk(nextFile, state.duration, (value) => {
        state.progress = value
        options.onProgress?.(value)
      })
      console.log(`Peak generation took ${Math.round(performance.now() - generationStartedAt)}ms`)
      state.file = nextFile
    } finally {
      state.processing = false
    }
  }

  async function edit (operation: (current: File) => Promise<File>): Promise<void> {
    if (!state.file) throw new Error('Load an audio file before editing.')
    const current = { file: state.file, peaks: state.peaks }
    state.processing = true
    try {
      const next = await operation(state.file)
      history.commit(current)
      await load(next)
    } finally {
      state.processing = false
    }
  }

  async function trim (start: number, end: number): Promise<void> {
    await edit(async (current) => await processor.trim(current, start, end))
  }

  async function cut (start: number, end: number): Promise<void> {
    await edit(async (current) => await processor.cut(current, start, end, state.duration))
  }

  async function restore (historyState: EditState | null): Promise<void> {
    if (!historyState) return
    state.file = historyState.file
    state.peaks = historyState.peaks
    state.duration = await processor.getDuration(historyState.file)
  }

  async function undo (): Promise<void> {
    if (!state.file) return
    await restore(history.undo({ file: state.file, peaks: state.peaks }))
  }

  async function redo (): Promise<void> {
    if (!state.file) return
    await restore(history.redo({ file: state.file, peaks: state.peaks }))
  }

  return {
    state,
    canUndo: computed(() => history.canUndo),
    canRedo: computed(() => history.canRedo),
    load,
    trim,
    cut,
    undo,
    redo
  }
}
