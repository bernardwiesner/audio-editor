import { createInterface } from 'node:readline/promises'
import { writeFile } from 'node:fs/promises'
import { codecs } from './codecs.mjs'

const prompt = createInterface({ input: process.stdin, output: process.stdout })
console.log('Select codecs for the custom FFmpeg.wasm build. Defaults: MP3, AAC/M4A.')
codecs.forEach((codec, index) => console.log(`${index + 1}. ${codec.label}${codec.default ? ' (default)' : ''}`))
const answer = await prompt.question('Numbers separated by commas, or Enter for defaults: ')
prompt.close()

const selectedIndexes = answer
  ? answer.split(',').map((item) => Number.parseInt(item.trim(), 10) - 1)
  : codecs.map((codec, index) => codec.default ? index : -1).filter((index) => index >= 0)
const selected = selectedIndexes.map((index) => codecs[index]).filter(Boolean)
if (selected.length === 0) throw new Error('Choose at least one codec.')

const manifest = {
  codecs: selected.map(({ id, label, flags }) => ({ id, label, flags })),
  configureFlags: selected.flatMap((codec) => codec.flags)
}
await writeFile(new URL('./codec-manifest.json', import.meta.url), JSON.stringify(manifest, null, 2) + '\n')
console.log(`Selected ${selected.map((codec) => codec.label).join(', ')}.`)
console.log('Run npm run build:core to create dist/ffmpeg.')
