import { describe, expect, it } from 'vitest'
import { INSTRUMENT_IDS, PATCHES, RHODES } from './instruments/keys.js'
import { DRUM_IDS, DrumKit } from './instruments/kit.js'
import { noiseBuffer, renderVoice } from './render.js'
import { buildVoice } from './spec.js'

// The questions that cannot be answered in Node.
//
// Everything about the SHAPE of a voice is unit-tested against buildVoice with no audio
// device. What that leaves is everything about the samples: is it audible, is it clipping, is
// one instrument far louder than another, does the envelope ever actually reach silence.
//
// These were previously measured by hand from a page in the browser, which found three real
// bugs — voices cut off after 50ms, a clipping sub bass, and a 92x level spread — and then
// stopped being run, because nothing made anyone run it. That is what this file fixes.

interface Measured {
  peak: number
  rms: number
  /** Seconds until the tail falls below roughly -60dB. */
  tail: number
}

function analyse(buffer: AudioBuffer): Measured {
  const data = buffer.getChannelData(0)
  let peak = 0
  let sum = 0
  let lastAudible = -1
  for (let index = 0; index < data.length; index++) {
    const value = Math.abs(data[index]!)
    if (value > peak) peak = value
    sum += value * value
    if (value > 0.001) lastAudible = index
  }
  return {
    peak,
    rms: Math.sqrt(sum / data.length),
    tail: lastAudible < 0 ? 0 : lastAudible / buffer.sampleRate,
  }
}

async function render(
  seconds: number,
  build: (ctx: OfflineAudioContext, targets: { output: AudioNode; noise: AudioBuffer }) => void,
): Promise<Measured> {
  const ctx = new OfflineAudioContext(1, Math.ceil(44100 * seconds), 44100)
  const output = ctx.createGain()
  output.connect(ctx.destination)
  build(ctx, { output, noise: noiseBuffer(ctx, 2) })
  return analyse(await ctx.startRendering())
}

const instrument = (id: (typeof INSTRUMENT_IDS)[number], midi = 60) =>
  render(4, (ctx, targets) => {
    const plan = buildVoice(PATCHES[id], midi, 0.9)
    const handle = renderVoice(ctx, plan, 0, targets)
    // A sustained patch never ends by itself, so measuring one without releasing it measures
    // an organ held for the whole render, which is not what a note is.
    if (plan.sustained) handle.release(1)
  })

describe('every instrument makes a sound', () => {
  for (const id of INSTRUMENT_IDS) {
    it(`${id} is audible and does not clip`, async () => {
      const { peak } = await instrument(id)
      expect(peak, 'silent').toBeGreaterThan(0.05)
      expect(peak, 'clipping').toBeLessThanOrEqual(1)
    })
  }
})

describe('levels sit together', () => {
  it('keeps every instrument within a factor of three of the others', async () => {
    // Before this was measured, the spread was 92x and the sub bass was clipping at 1.05.
    // Trims are set from these numbers, so this test is what stops them drifting back.
    const peaks: Record<string, number> = {}
    for (const id of INSTRUMENT_IDS) peaks[id] = (await instrument(id)).peak
    const values = Object.values(peaks)
    const spread = Math.max(...values) / Math.min(...values)
    expect(spread, JSON.stringify(peaks)).toBeLessThan(3)
  })

  it('keeps the drums in the same range as the instruments', async () => {
    const drums: Record<string, number> = {}
    for (const id of DRUM_IDS) {
      drums[id] = (
        await render(2, (ctx, targets) => {
          new DrumKit(ctx as unknown as AudioContext, targets).hit(id, 0, 1)
        })
      ).peak
    }
    for (const [id, peak] of Object.entries(drums)) {
      expect(peak, `${id} silent`).toBeGreaterThan(0.05)
      expect(peak, `${id} clipping`).toBeLessThanOrEqual(1)
    }
  })
})

describe('envelopes end', () => {
  it('lets every struck voice decay to silence rather than ringing forever', async () => {
    for (const id of INSTRUMENT_IDS) {
      if (PATCHES[id].sustained) continue
      const { tail } = await instrument(id)
      expect(tail, `${id} never stops`).toBeLessThan(3.9)
      // And the other failure, which is the one that actually happened: a voice cut off
      // almost immediately. bass, sub and saw all measured 0.05s tails once.
      expect(tail, `${id} cut off`).toBeGreaterThan(0.15)
    }
  })

  it('holds a sustained voice flat until it is released', async () => {
    // This is the assertion that caught the release bug. An organ declares sustain 1 and
    // decay 0, so it must hold at full level for the whole three seconds and only then fade.
    // Before the fix it decayed across the entire note — 0.33 at 0.1s down to 0.003 at 2s —
    // because the release ramp interpolated from the end of the ATTACK rather than from the
    // held level. See EnvelopeResult in render.ts.
    const held = await render(4, (ctx, targets) => {
      renderVoice(ctx, buildVoice(PATCHES.organ, 60, 0.9), 0, targets).release(3)
    })
    expect(held.tail, 'faded before it was released').toBeGreaterThan(2.9)
  })

  it('does not lose level while a sustained voice is held', async () => {
    // The other half of the same bug, and the one a tail measurement alone would miss: it is
    // not enough that sound is still present at 3s, it has to be at roughly full level.
    const ctx = new OfflineAudioContext(1, 44100 * 4, 44100)
    const output = ctx.createGain()
    output.connect(ctx.destination)
    renderVoice(ctx, buildVoice(PATCHES.organ, 60, 0.9), 0, {
      output,
      noise: noiseBuffer(ctx, 1),
    }).release(3)
    const data = (await ctx.startRendering()).getChannelData(0)
    const peakNear = (seconds: number) => {
      let peak = 0
      const from = Math.floor(seconds * 44100)
      for (let i = from; i < from + 4410; i++) peak = Math.max(peak, Math.abs(data[i]!))
      return peak
    }
    const early = peakNear(0.2)
    const late = peakNear(2.5)
    expect(late / early, `${early.toFixed(3)} -> ${late.toFixed(3)}`).toBeGreaterThan(0.85)
  })
})

describe('the details that make it an instrument', () => {
  it('makes a harder note louder', async () => {
    const soft = await render(3, (ctx, t) => {
      renderVoice(ctx, buildVoice(RHODES, 60, 0.25), 0, t)
    })
    const hard = await render(3, (ctx, t) => {
      renderVoice(ctx, buildVoice(RHODES, 60, 1), 0, t)
    })
    expect(hard.peak).toBeGreaterThan(soft.peak)
    // NOT asserted here: that a harder note is also BRIGHTER, which is the more interesting
    // half and the one a gain-only velocity implementation would fail. Crest factor is the
    // obvious proxy and is wrong — it came out marginally LOWER for the hard note. Measuring
    // it honestly needs a highpass-filtered render compared against the unfiltered one, and
    // the first attempt at that wired both into the destination and measured their sum.
    //
    // buildVoice's velocity-to-modulation-index relationship IS unit-tested in spec.test.ts,
    // so the behaviour is covered; what is missing is confirmation that it survives rendering.
  })

  it('makes a high note decay faster than a low one', async () => {
    const low = await instrument('rhodes', 36)
    const high = await instrument('rhodes', 84)
    expect(high.tail).toBeLessThan(low.tail)
  })

  it('starts from silence, so no note begins with a click', async () => {
    const ctx = new OfflineAudioContext(1, 44100, 44100)
    const output = ctx.createGain()
    output.connect(ctx.destination)
    renderVoice(ctx, buildVoice(RHODES, 60, 0.9), 0, {
      output,
      noise: noiseBuffer(ctx, 1),
    })
    const data = (await ctx.startRendering()).getChannelData(0)
    // The first sample must be at silence. An exponential attack from 1e-4 starts audibly
    // above zero and ticks; a linear one from true zero does not.
    expect(Math.abs(data[0]!)).toBeLessThan(0.002)
  })
})
