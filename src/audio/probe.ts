// Offline measurement of the instruments.
//
// The questions that actually matter about synthesised audio cannot be answered in Node,
// because they are about samples: is this voice audible at all, is it clipping, is one
// instrument ten times louder than another, does its envelope ever reach silence. All of
// those are numbers once the graph has been rendered, and `OfflineAudioContext` renders it
// far faster than real time with no speakers involved.
//
// This is the same measurement that will become a `.browser.test.ts` once the browser project
// is added in the polish phase. Until then it is driven from the scratch page, because the
// answer is needed NOW — the per-patch `trim` values are guesses until something measures
// them, and a kick nine times louder than the piano is not something to discover late.

import { PATCHES, type InstrumentId, INSTRUMENT_IDS } from './instruments/keys.js'
import { DrumKit, DRUM_IDS, type DrumId } from './instruments/kit.js'
import { renderVoice } from './render.js'
import { noiseBuffer } from './render.js'
import { buildVoice } from './spec.js'

export interface Measurement {
  id: string
  /** Loudest sample, 0..1+. Above 1 is clipping. */
  peak: number
  /** Root-mean-square over the whole render — closer to perceived loudness than peak. */
  rms: number
  /** Seconds until the tail falls below -60dB. Infinity means it never does. */
  tail: number
}

function analyse(id: string, buffer: AudioBuffer): Measurement {
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
    id,
    peak,
    rms: Math.sqrt(sum / data.length),
    tail: lastAudible < 0 ? 0 : lastAudible / buffer.sampleRate,
  }
}

async function renderOffline(
  seconds: number,
  build: (ctx: OfflineAudioContext, targets: { output: AudioNode; noise: AudioBuffer }) => void,
): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(1, Math.ceil(44100 * seconds), 44100)
  const output = ctx.createGain()
  output.connect(ctx.destination)
  build(ctx, { output, noise: noiseBuffer(ctx, 2) })
  return ctx.startRendering()
}

/** One note on one instrument, measured. */
export async function measureInstrument(
  id: InstrumentId,
  midi = 60,
  velocity = 0.9,
): Promise<Measurement> {
  const patch = PATCHES[id]
  const plan = buildVoice(patch, midi, velocity)
  const buffer = await renderOffline(4, (ctx, targets) => {
    const handle = renderVoice(ctx, plan, 0, targets)
    // Sustained patches never end on their own, so release them explicitly — otherwise the
    // measurement is of an organ held for the whole render, which is not what a note is.
    if (plan.sustained) handle.release(1)
  })
  return analyse(id, buffer)
}

export async function measureDrum(id: DrumId): Promise<Measurement> {
  const buffer = await renderOffline(2, (ctx, targets) => {
    const kit = new DrumKit(ctx as unknown as AudioContext, targets)
    kit.hit(id, 0, 1)
  })
  return analyse(id, buffer)
}

export interface ProbeReport {
  instruments: Measurement[]
  drums: Measurement[]
  /** Ratio of loudest to quietest PEAK across everything. The number that says whether one
   *  voice will bury another. See the note in `probe` for why peak rather than RMS. */
  spread: number
  problems: string[]
}

/** Measure everything and report what is wrong with it. */
export async function probe(): Promise<ProbeReport> {
  const instruments: Measurement[] = []
  for (const id of INSTRUMENT_IDS) instruments.push(await measureInstrument(id))
  const drums: Measurement[] = []
  for (const id of DRUM_IDS) drums.push(await measureDrum(id))

  const all = [...instruments, ...drums]
  // Spread is measured on PEAK, not RMS.
  //
  // RMS is averaged over a fixed render window, so it punishes anything short: a 20ms rimshot
  // and a ringing organ chord have wildly different RMS even when they sit perfectly together
  // in a mix. The first version of this gated on RMS and reported a 92x spread, most of which
  // was "percussion is percussive".
  //
  // Peak is what decides whether one voice buries another at the moment they coincide, which
  // is the question actually being asked. RMS is still reported per voice, because it is the
  // better guide when comparing two sounds of similar length.
  const peaks = all.map((m) => m.peak).filter((value) => value > 0)
  const spread = peaks.length ? Math.max(...peaks) / Math.min(...peaks) : Infinity

  const problems: string[] = []
  for (const m of all) {
    if (m.peak === 0) problems.push(`${m.id}: silent`)
    else if (m.peak > 1) problems.push(`${m.id}: clipping at ${m.peak.toFixed(2)}`)
    if (m.tail === 0 && m.peak > 0) problems.push(`${m.id}: no tail`)
  }
  if (spread > 4) problems.push(`peak spread ${spread.toFixed(1)}x — something will bury something`)

  return { instruments, drums, spread, problems }
}
