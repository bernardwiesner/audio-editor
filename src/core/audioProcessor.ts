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

export class AudioProcessor {
  private ffmpeg: FFmpeg | null = null

  constructor (private readonly assets: FfmpegAssets = defaultFfmpegAssets) {}

  public async trim (file: File, start: number, end: number): Promise<File> {
    return await this.process(file, ['-ss', String(start), '-t', String(end - start), '-c', 'copy', '-map', 'a'])
  }

  public async cut (file: File, start: number, end: number, duration: number): Promise<File> {
    const before = start > 0 ? await this.trim(file, 0, start) : null
    const after = end < duration ? await this.trim(file, end, duration) : null
    const inputs = [before, after].filter((part): part is File => part !== null)
    if (inputs.length === 0) throw new Error('Cut cannot remove the entire file.')
    if (inputs.length === 1) return inputs[0]

    const ffmpeg = await this.getFFmpeg()
    const extension = this.getExtension(file)
    await this.write('before.' + extension, before!)
    await this.write('after.' + extension, after!)
    await ffmpeg.writeFile('concat.txt', 'file before.' + extension + '\nfile after.' + extension)
    await this.exec(['-f', 'concat', '-i', 'concat.txt', '-c', 'copy', 'output.' + extension])
    return await this.readFile('output.' + extension, file)
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

  private async readFile (name: string, original: File): Promise<File> {
    const ffmpeg = await this.getFFmpeg()
    const data = await ffmpeg.readFile(name)
    await this.clear([name])
    return new File([data], original.name, { type: original.type })
  }

  private async clear (names: string[]): Promise<void> {
    const ffmpeg = await this.getFFmpeg()
    await Promise.all(names.map(async (name) => await ffmpeg.deleteFile(name)))
  }

  private getExtension (file: File): string {
    return file.name.split('.').pop()!.toLowerCase()
  }

}
