import coreURL from '@ffmpeg/core?url'
import wasmURL from '@ffmpeg/core/wasm?url'

import type { FfmpegAssets } from './audioProcessor'

export const defaultFfmpegAssets: FfmpegAssets = { coreURL, wasmURL }
