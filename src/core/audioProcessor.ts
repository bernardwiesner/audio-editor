import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import { defaultFfmpegAssets } from './defaultFfmpegAssets'
import { decodeAudio, getPeaks } from './peaks'

const MAX_FILE_SIZE_MB = 30
const WAVES_PER_SECOND = 10
const MAX_PEAK_LENGTH = 30000

export interface FfmpegAssets {
  coreURL: string
  wasmURL: string
}

export interface AudioStreamInfo {
  codec: string
  sampleRate: string
  channels: number
  bitRate: string
}

export interface InsertResult {
  insertedFile: File
  mergedFile: File
}

export interface InsertPlan {
  requiresTranscode: boolean
  originalStream: AudioStreamInfo
  insertStream: AudioStreamInfo
}

export class AudioProcessor {
  private ffmpeg: FFmpeg | null = null

  constructor (private readonly assets: FfmpegAssets = defaultFfmpegAssets) {}

  public async trim (file: File, start: number, end: number): Promise<File> {
    return await this.process(file, ['-ss', String(start), '-t', String(end - start), '-c', 'copy', '-map', 'a'])
  }

  public async cut (file: File, start: number, end: number, duration: number): Promise<File> {
    const before = start > 0 ? await this.trim(file, 0, start) : null
    const after = end < duration ? await this.trim(file, end, duration) : null
    const parts = [before, after].filter((part): part is File => part !== null)
    if (parts.length === 0) throw new Error('Cut cannot remove the entire file.')
    if (parts.length === 1) return parts[0]

    return await this.concat(parts, file)
  }

  public async getInsertPlan (insertFile: File, originalFile: File): Promise<InsertPlan> {
    const originalStream = await this.getAudioStreamInfo(originalFile)
    const insertStream = await this.getAudioStreamInfo(insertFile)

    return {
      requiresTranscode: !this.canQuickInsert(originalFile, insertFile, originalStream, insertStream),
      originalStream,
      insertStream
    }
  }

  public async insert (
    insertFile: File,
    originalFile: File,
    time: number,
    duration: number,
    plan: InsertPlan
  ): Promise<InsertResult> {
    const insertedFile = plan.requiresTranscode
      ? await this.transcode(insertFile, originalFile, plan.originalStream)
      : insertFile

    if (plan.requiresTranscode) {
      console.log('Insert file transcoding required.')
    }

    const before = time > 0 ? await this.trim(originalFile, 0, time) : null
    const after = time < duration ? await this.trim(originalFile, time, duration) : null
    const parts = [before, insertedFile, after].filter((part): part is File => part !== null)

    return {
      insertedFile,
      mergedFile: await this.concat(parts, originalFile)
    }
  }

  public async getDuration (file: File): Promise<number> {
    const ffmpeg = await this.getFFmpeg()
    await this.write('input.' + this.getExtension(file), file)
    await ffmpeg.ffprobe([
      '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1',
      'input.' + this.getExtension(file), '-o', 'duration.txt'
    ])
    const data = await ffmpeg.readFile('duration.txt')
    await this.clear(['input.' + this.getExtension(file), 'duration.txt'])
    return Number.parseFloat(new TextDecoder().decode(data))
  }

  public async getAudioStreamInfo (file: File): Promise<AudioStreamInfo> {
    const ffmpeg = await this.getFFmpeg()
    const extension = this.getExtension(file)
    const input = 'probe.' + extension
    await this.write(input, file)
    await ffmpeg.ffprobe([
      '-v', 'error',
      '-show_entries', 'stream=codec_type,codec_name,bit_rate,sample_rate,channels',
      '-of', 'json',
      input,
      '-o', 'stream-info.json'
    ])
    const data = await ffmpeg.readFile('stream-info.json')
    await this.clear([input, 'stream-info.json'])
    const result = JSON.parse(new TextDecoder().decode(data))
    const stream = result.streams.find((candidate: { codec_type: string }) => candidate.codec_type === 'audio')

    return {
      codec: stream.codec_name,
      sampleRate: stream.sample_rate,
      channels: stream.channels,
      bitRate: stream.bit_rate
    }
  }

  public async getPeaksByChunk (file: File, duration: number, onProgress?: (progress: number) => void): Promise<Float32Array[]> {
    const maxLength = Math.min(MAX_PEAK_LENGTH, Math.round(duration * WAVES_PER_SECOND))
    const chunkCount = Math.max(1, Math.round(file.size / 1024 / 1024 / MAX_FILE_SIZE_MB))
    if (chunkCount === 1) {
      onProgress?.(98)
      return getPeaks(await decodeAudio(file), { maxLength })
    }

    const peaks: number[] = []
    const chunkPeakPromises: Promise<number[]>[] = []
    const interval = duration / chunkCount
    for (let index = 0; index < chunkCount; index += 1) {
      const start = index * interval
      const end = index === chunkCount - 1 ? duration : start + interval
      const chunk = await this.trim(file, start, end)
      const chunkLength = Math.max(1, Math.round(maxLength * ((end - start) / duration)))

      if (index % 2 === 0) {
        peaks.push(...(await Promise.all(chunkPeakPromises)).flat())
        chunkPeakPromises.length = 0
      }

      chunkPeakPromises.push(
        decodeAudio(chunk).then((decodedData) => Array.from(getPeaks(decodedData, { maxLength: chunkLength })[0]))
      )
      onProgress?.(Math.min(98, Math.round(((index + 1) / chunkCount) * 100)))
    }

    peaks.push(...(await Promise.all(chunkPeakPromises)).flat())
    return [Float32Array.from(peaks)]
  }

  private async process (file: File, args: string[]): Promise<File> {
    const extension = this.getExtension(file)
    const input = 'input.' + extension
    const output = 'output.' + extension
    await this.write(input, file)
    await this.exec(['-i', input, ...args, output])
    return await this.readFile(output, file)
  }

  private async concat (files: File[], originalFile: File): Promise<File> {
    const ffmpeg = await this.getFFmpeg()
    const extension = this.getExtension(originalFile)
    const inputPaths = files.map((_, index) => `part-${index}.${extension}`)

    for (let index = 0; index < files.length; index += 1) {
      await this.write(inputPaths[index], files[index])
    }

    await ffmpeg.writeFile('concat.txt', inputPaths.map((path) => `file ${path}`).join('\n'))
    await this.exec(['-f', 'concat', '-i', 'concat.txt', '-c', 'copy', 'output.' + extension])
    const mergedFile = await this.readFile('output.' + extension, originalFile)
    await this.clear([...inputPaths, 'concat.txt'])
    return mergedFile
  }

  private canQuickInsert (
    originalFile: File,
    insertFile: File,
    originalStream: AudioStreamInfo,
    insertStream: AudioStreamInfo
  ): boolean {
    return this.getExtension(originalFile) === this.getExtension(insertFile) &&
      originalStream.codec === insertStream.codec &&
      originalStream.sampleRate === insertStream.sampleRate &&
      originalStream.channels === insertStream.channels &&
      originalStream.bitRate === insertStream.bitRate
  }

  private async transcode (file: File, originalFile: File, stream: AudioStreamInfo): Promise<File> {
    const sourceExtension = this.getExtension(file)
    const targetExtension = this.getExtension(originalFile)
    const input = 'insert.' + sourceExtension
    const output = 'transcoded.' + targetExtension
    const targetName = file.name.replace(/\.[^.]+$/, '.' + targetExtension)

    await this.write(input, file)
    await this.exec([
      '-i', input,
      '-ar', stream.sampleRate,
      '-b:a', stream.bitRate,
      '-ac', String(stream.channels),
      '-c:a', stream.codec,
      '-map', 'a',
      output
    ])
    const transcodedFile = await this.readFile(output, file, targetName, originalFile.type)
    await this.clear([input])
    return transcodedFile
  }

  private async getFFmpeg (): Promise<FFmpeg> {
    if (this.ffmpeg) return this.ffmpeg
    this.ffmpeg = new FFmpeg()
    await this.ffmpeg.load(this.assets)
    return this.ffmpeg
  }

  private async write (name: string, file: File): Promise<void> {
    const ffmpeg = await this.getFFmpeg()
    await ffmpeg.writeFile(name, await fetchFile(file))
  }

  private async exec (args: string[]): Promise<void> {
    const ffmpeg = await this.getFFmpeg()
    console.log(args.join(' '))
    if (await ffmpeg.exec(args) !== 0) throw new Error('FFmpeg could not process this file.')
  }

  private async readFile (name: string, original: File, outputName = original.name, outputType = original.type): Promise<File> {
    const ffmpeg = await this.getFFmpeg()
    const data = await ffmpeg.readFile(name)
    await this.clear([name])
    return new File([data], outputName, { type: outputType })
  }

  private async clear (names: string[]): Promise<void> {
    const ffmpeg = await this.getFFmpeg()
    await Promise.all(names.map(async (name) => await ffmpeg.deleteFile(name)))
  }

  private getExtension (file: File): string {
    return file.name.split('.').pop()!.toLowerCase()
  }

}
