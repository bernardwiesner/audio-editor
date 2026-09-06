export { default as AudioEditor } from './components/AudioEditor.vue'
export { useAudioEditor } from './composables/useAudioEditor'
export {
  AudioProcessor,
  type AudioStreamInfo,
  type FfmpegAssets,
  type InsertPlan,
  type InsertResult
} from './core/audioProcessor'
export { defaultFfmpegAssets } from './core/defaultFfmpegAssets'
export { EditHistory } from './core/history'
export type { EditState, EditorOptions, PeakOptions } from './core/types'
