// The master chain, and the reverb.
//
//   voices → bus → compressor → master → destination
//                ↘ send → convolver → return ↗
//
// The reverb is worth building on day one rather than "later". A from-scratch synth played
// completely dry sounds like a demo of a synth; the same notes with a short plate behind them
// sound produced. It is about thirty lines, and no other thirty lines in the audio layer buy
// as much.

import { noiseBuffer } from './render.js'

export interface Master {
  /** Where voices connect their dry output. */
  bus: GainNode
  /** Where voices connect their reverb send. */
  send: GainNode
  /** For a scope or a level meter. */
  analyser: AnalyserNode
  /** Shared white noise, so every voice and drum does not build its own buffer. */
  noise: AudioBuffer
  setVolume: (value: number) => void
  volume: () => number
}

/**
 * A plate-ish impulse response, generated rather than loaded.
 *
 * Exponentially decaying filtered noise. Not a real convolution of a real room, and it does
 * not need to be — it needs to put the instruments in a space, and it needs to weigh nothing
 * and require no network request. A real IR file would be the only binary asset in the
 * project and the only thing that could fail to load.
 */
function plateImpulse(ctx: BaseAudioContext, seconds = 1.6, decay = 3.2): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds)
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate)
  let x = 1234567
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel)
    for (let index = 0; index < length; index++) {
      x ^= x << 13
      x ^= x >>> 17
      x ^= x << 5
      const white = ((x >>> 0) / 0xffffffff) * 2 - 1
      // A short fade-in stops the reverb having a click of its own at time zero.
      const onset = Math.min(1, index / (ctx.sampleRate * 0.005))
      data[index] = white * onset * Math.pow(1 - index / length, decay)
    }
  }
  return impulse
}

export function createMaster(ctx: AudioContext): Master {
  const bus = ctx.createGain()
  bus.gain.value = 0.9

  const compressor = ctx.createDynamicsCompressor()
  // Gentle, and set to catch a full chord plus drums rather than to squash anything. Without
  // it, six notes and a kick together clip on the way out and the result is a crackle that
  // sounds like a broken speaker rather than like too much level.
  compressor.threshold.value = -14
  compressor.knee.value = 24
  compressor.ratio.value = 3
  compressor.attack.value = 0.004
  compressor.release.value = 0.18

  const master = ctx.createGain()
  master.gain.value = 0.7

  const send = ctx.createGain()
  send.gain.value = 1
  const convolver = ctx.createConvolver()
  convolver.buffer = plateImpulse(ctx)
  const returnGain = ctx.createGain()
  returnGain.gain.value = 0.55
  // Reverb on a very low note is mud rather than space, so the send is high-passed.
  const sendFilter = ctx.createBiquadFilter()
  sendFilter.type = 'highpass'
  sendFilter.frequency.value = 300

  const analyser = ctx.createAnalyser()
  analyser.fftSize = 2048
  analyser.smoothingTimeConstant = 0.7

  bus.connect(compressor)
  send.connect(sendFilter)
  sendFilter.connect(convolver)
  convolver.connect(returnGain)
  returnGain.connect(compressor)
  compressor.connect(master)
  master.connect(analyser)
  analyser.connect(ctx.destination)

  return {
    bus,
    send,
    analyser,
    noise: noiseBuffer(ctx, 2),
    setVolume: (value) => {
      master.gain.setTargetAtTime(Math.max(0, Math.min(1, value)) * 0.7, ctx.currentTime, 0.02)
    },
    volume: () => master.gain.value / 0.7,
  }
}
