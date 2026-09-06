export interface PeakOptions {
  maxLength?: number
  precision?: number
}

export interface EditState {
  file: File
  peaks: Float32Array[]
}

export interface EditorOptions {
  waveSurfer?: Record<string, unknown>
  maxHistory?: number
  onProgress?: (progress: number) => void
}
