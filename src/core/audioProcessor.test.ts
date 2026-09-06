import { beforeEach, describe, expect, it, vi } from 'vitest'

const ffmpeg = {
  load: vi.fn(),
  writeFile: vi.fn(),
  exec: vi.fn().mockResolvedValue(0),
  readFile: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
  deleteFile: vi.fn(),
  ffprobe: vi.fn()
}

vi.mock('@ffmpeg/ffmpeg', () => ({
  FFmpeg: class {
    load = ffmpeg.load
    writeFile = ffmpeg.writeFile
    exec = ffmpeg.exec
    readFile = ffmpeg.readFile
    deleteFile = ffmpeg.deleteFile
    ffprobe = ffmpeg.ffprobe
  }
}))

vi.mock('@ffmpeg/util', () => ({ fetchFile: vi.fn().mockResolvedValue(new Uint8Array([1])) }))

import { AudioProcessor } from './audioProcessor'

describe('AudioProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ffmpeg.exec.mockResolvedValue(0)
    ffmpeg.readFile.mockResolvedValue(new Uint8Array([1, 2, 3]))
  })

  it('trims MP3 with stream copy', async () => {
    const processor = new AudioProcessor({ coreURL: 'core.js', wasmURL: 'core.wasm' })
    const file = new File(['audio'], 'episode.mp3', { type: 'audio/mpeg' })

    await processor.trim(file, 2, 7)

    expect(ffmpeg.exec).toHaveBeenCalledWith([
      '-i', 'input.mp3', '-ss', '2', '-t', '5', '-c', 'copy', '-map', 'a', 'output.mp3'
    ])
  })

  it('preserves M4A when trimming', async () => {
    const processor = new AudioProcessor({ coreURL: 'core.js', wasmURL: 'core.wasm' })
    const file = new File(['audio'], 'episode.m4a', { type: 'audio/mp4' })

    const trimmed = await processor.trim(file, 2, 7)

    expect(trimmed.name).toBe('episode.m4a')
    expect(trimmed.type).toBe('audio/mp4')
    expect(ffmpeg.exec).toHaveBeenCalledWith([
      '-i', 'input.m4a', '-ss', '2', '-t', '5', '-c', 'copy', '-map', 'a', 'output.m4a'
    ])
  })
})
