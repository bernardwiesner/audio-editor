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

  it('reads audio stream settings for quick-insert matching', async () => {
    ffmpeg.readFile.mockResolvedValue(new TextEncoder().encode(JSON.stringify({
      streams: [{ codec_type: 'audio', codec_name: 'mp3', sample_rate: '44100', channels: 2, bit_rate: '128000' }]
    })))
    const processor = new AudioProcessor({ coreURL: 'core.js', wasmURL: 'core.wasm' })
    const file = new File(['audio'], 'episode.mp3', { type: 'audio/mpeg' })

    await expect(processor.getAudioStreamInfo(file)).resolves.toEqual({
      codec: 'mp3',
      sampleRate: '44100',
      channels: 2,
      bitRate: '128000'
    })
  })

  it('creates an insert plan before transcoding mismatched audio', async () => {
    ffmpeg.readFile.mockResolvedValue(new TextEncoder().encode(JSON.stringify({
      streams: [{ codec_type: 'audio', codec_name: 'aac', sample_rate: '44100', channels: 2, bit_rate: '128000' }]
    })))
    const processor = new AudioProcessor({ coreURL: 'core.js', wasmURL: 'core.wasm' })
    const original = new File(['audio'], 'episode.m4a', { type: 'audio/mp4' })
    const insert = new File(['audio'], 'intro.mp3', { type: 'audio/mpeg' })

    await expect(processor.getInsertPlan(insert, original)).resolves.toMatchObject({
      requiresTranscode: true,
      originalStream: { codec: 'aac' },
      insertStream: { codec: 'aac' }
    })
    expect(ffmpeg.exec).not.toHaveBeenCalled()
  })
})
