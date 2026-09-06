export const codecs = [
  { id: 'mp3', label: 'MP3', default: true, flags: ['--enable-demuxer=mp3', '--enable-muxer=mp3', '--enable-parser=mpegaudio', '--enable-decoder=mp3'] },
  { id: 'aac', label: 'AAC / M4A', default: true, flags: ['--enable-demuxer=mov,aac', '--enable-muxer=mov,mp4,ipod', '--enable-parser=aac', '--enable-decoder=aac', '--enable-bsf=aac_adtstoasc'] },
  { id: 'pcm', label: 'WAV / PCM', flags: ['--enable-demuxer=wav', '--enable-muxer=wav', '--enable-decoder=pcm*'] },
  { id: 'flac', label: 'FLAC', flags: ['--enable-demuxer=flac', '--enable-muxer=flac', '--enable-decoder=flac'] },
  { id: 'opus', label: 'Opus / Ogg', flags: ['--enable-demuxer=ogg', '--enable-muxer=ogg', '--enable-decoder=opus'] },
  { id: 'vorbis', label: 'Vorbis / Ogg', flags: ['--enable-demuxer=ogg', '--enable-muxer=ogg', '--enable-decoder=vorbis'] },
  { id: 'alac', label: 'ALAC / M4A', flags: ['--enable-demuxer=mov', '--enable-muxer=mov,mp4,ipod', '--enable-decoder=alac'] },
  { id: 'wma', label: 'WMA', flags: ['--enable-demuxer=asf', '--enable-muxer=asf', '--enable-decoder=wmav2'] }
]
