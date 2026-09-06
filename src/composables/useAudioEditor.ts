import { computed, reactive } from 'vue'
import { AudioProcessor, type FfmpegAssets, type InsertPlan } from '../core/audioProcessor'
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
      state.peaks = await generatePeaks(nextFile, state.duration)
      state.file = nextFile
    } finally {
      state.processing = false
    }
  }

  async function trim (start: number, end: number): Promise<void> {
    if (!state.file) throw new Error('Load an audio file before editing.')
    const current = { file: state.file, peaks: state.peaks }
    const originalDuration = state.duration
    const originalPeaks = state.peaks[0]

    state.progress = 0
    state.processing = true
    try {
      const trimmedFile = await processor.trim(state.file, start, end)
      const samplesPerSecond = originalPeaks.length / originalDuration

      history.commit(current)
      state.file = trimmedFile
      state.peaks = [originalPeaks.slice(start * samplesPerSecond, end * samplesPerSecond)]
      state.duration = end - start
    } finally {
      state.processing = false
    }
  }

  async function cut (start: number, end: number): Promise<void> {
    if (!state.file) throw new Error('Load an audio file before editing.')
    const current = { file: state.file, peaks: state.peaks }
    const originalDuration = state.duration
    const originalPeaks = state.peaks[0]

    state.progress = 0
    state.processing = true
    try {
      const cutFile = await processor.cut(state.file, start, end, originalDuration)
      const samplesPerSecond = originalPeaks.length / originalDuration
      const before = originalPeaks.slice(0, start * samplesPerSecond)
      const after = originalPeaks.slice(end * samplesPerSecond)
      const peaks = new Float32Array(before.length + after.length)

      peaks.set(before)
      peaks.set(after, before.length)
      history.commit(current)
      state.file = cutFile
      state.peaks = [peaks]
      state.duration = originalDuration - (end - start)
    } finally {
      state.processing = false
    }
  }

  async function getInsertPlan (insertFile: File): Promise<InsertPlan> {
    if (!state.file) throw new Error('Load an audio file before editing.')
    return await processor.getInsertPlan(insertFile, state.file)
  }

  async function insert (insertFile: File, time: number, plan: InsertPlan): Promise<number> {
    if (!state.file) throw new Error('Load an audio file before editing.')
    const current = { file: state.file, peaks: state.peaks }
    const originalDuration = state.duration
    const originalPeaks = state.peaks[0]

    state.processing = true
    try {
      const { insertedFile, mergedFile } = await processor.insert(
        insertFile,
        state.file,
        time,
        originalDuration,
        plan
      )
      const insertDuration = await processor.getDuration(insertedFile)
      const insertPeaks = await generatePeaks(insertedFile, insertDuration)
      const samplesPerSecond = originalPeaks.length / originalDuration
      const insertionIndex = Math.round(time * samplesPerSecond)
      const mergedPeaks = new Float32Array(originalPeaks.length + insertPeaks[0].length)

      mergedPeaks.set(originalPeaks.slice(0, insertionIndex))
      mergedPeaks.set(insertPeaks[0], insertionIndex)
      mergedPeaks.set(originalPeaks.slice(insertionIndex), insertionIndex + insertPeaks[0].length)

      history.commit(current)
      state.file = mergedFile
      state.peaks = [mergedPeaks]
      state.duration = originalDuration + insertDuration
      return insertDuration
    } finally {
      state.processing = false
    }
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

  async function generatePeaks (file: File, duration: number): Promise<Float32Array[]> {
    state.progress = 0
    console.log('Generating peaks from audio file...')
    const generationStartedAt = performance.now()
    const peaks = await processor.getPeaksByChunk(file, duration, (value) => {
      state.progress = value
      options.onProgress?.(value)
    })
    console.log(`Peak generation took ${Math.round(performance.now() - generationStartedAt)}ms`)
    return peaks
  }

  return {
    state,
    canUndo: computed(() => history.canUndo),
    canRedo: computed(() => history.canRedo),
    load,
    trim,
    cut,
    getInsertPlan,
    insert,
    undo,
    redo
  }
}
