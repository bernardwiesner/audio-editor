import { beforeEach, describe, expect, it, vi } from 'vitest'

const processor = {
  getDuration: vi.fn(),
  getPeaksByChunk: vi.fn(),
  trim: vi.fn(),
  cut: vi.fn()
}

vi.mock('../core/audioProcessor', () => ({
  AudioProcessor: class {
    getDuration = processor.getDuration
    getPeaksByChunk = processor.getPeaksByChunk
    trim = processor.trim
    cut = processor.cut
  }
}))

import { useAudioEditor } from './useAudioEditor'

describe('useAudioEditor', () => {
  const file = new File(['audio'], 'episode.mp3', { type: 'audio/mpeg' })

  beforeEach(() => {
    vi.clearAllMocks()
    processor.getDuration.mockResolvedValue(10)
    processor.getPeaksByChunk.mockResolvedValue([Float32Array.from({ length: 10 }, (_, index) => index)])
    processor.trim.mockResolvedValue(new File(['audio'], 'trimmed.mp3', { type: 'audio/mpeg' }))
    processor.cut.mockResolvedValue(new File(['audio'], 'cut.mp3', { type: 'audio/mpeg' }))
  })

  it('slices existing peaks when trimming', async () => {
    const editor = useAudioEditor()
    await editor.load(file)

    await editor.trim(2, 7)

    expect(editor.state.duration).toBe(5)
    expect(Array.from(editor.state.peaks[0])).toEqual([2, 3, 4, 5, 6])
    expect(processor.getPeaksByChunk).toHaveBeenCalledTimes(1)
  })

  it('removes the selected peaks when cutting', async () => {
    const editor = useAudioEditor()
    await editor.load(file)

    await editor.cut(2, 5)

    expect(editor.state.duration).toBe(7)
    expect(Array.from(editor.state.peaks[0])).toEqual([0, 1, 5, 6, 7, 8, 9])
    expect(processor.getPeaksByChunk).toHaveBeenCalledTimes(1)
  })
})
