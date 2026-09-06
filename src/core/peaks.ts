import type { PeakOptions } from './types'

export function getPeaks (
  decodedData: AudioBuffer,
  { maxLength = 8000, precision = 10000 }: PeakOptions = {}
): Float32Array[] {
  const channel = decodedData.getChannelData(0)
  const length = Math.max(1, Math.round(maxLength))
  const sampleSize = Math.max(1, Math.round(channel.length / length))
  const peaks = new Float32Array(length)

  for (let index = 0; index < length; index += 1) {
    const start = index * sampleSize
    const end = Math.min(channel.length, start + sampleSize)
    let max = 0

    for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
      const sample = channel[sampleIndex]
      if (Math.abs(sample) > Math.abs(max)) max = sample
    }
    peaks[index] = Math.round(max * precision) / precision
  }

  return [peaks]
}

export async function decodeAudio (file: Blob): Promise<AudioBuffer> {
  const context = new AudioContext({ sampleRate: 8000 })
  try {
    return await context.decodeAudioData(await file.arrayBuffer())
  } finally {
    await context.close()
  }
}
