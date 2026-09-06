import { describe, expect, it } from 'vitest'
import { getPeaks } from './peaks'

describe('getPeaks', () => {
  it('returns signed peak values for the first channel', () => {
    const decoded = {
      getChannelData: () => new Float32Array([0.1, -0.7, 0.2, 0.6])
    } as AudioBuffer

    const peaks = getPeaks(decoded, { maxLength: 2 })[0]
    expect(peaks[0]).toBeCloseTo(-0.7)
    expect(peaks[1]).toBeCloseTo(0.6)
  })
})
