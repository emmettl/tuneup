// A drum kit, synthesised.
//
// Not an emulation of any particular machine — the rhythm and genre chapters need a groove
// that carries a lesson, not a museum piece. Each voice is a handful of nodes and the whole
// file is under two hundred lines, which is what makes four-on-the-floor and a shuffle
// possible without a single audio asset.
//
// The recipes are the standard ones and each is a sentence long:
//   kick   a sine whose pitch drops fast from a click to a thud
//   snare  filtered noise plus two tuned oscillators for the body
//   clap   four noise bursts a few milliseconds apart, which is what makes it sound like
//          several hands rather than one
//   hat    bandpassed noise, with the open and closed hats sharing a choke group so a closed
//          hat cuts an open one off — the thing that makes a hi-hat pattern breathe

import { SILENCE } from '../spec.js'

export type DrumId = 'kick' | 'snare' | 'clap' | 'hat' | 'openhat' | 'rim' | 'ride'

export const DRUM_IDS: DrumId[] = ['kick', 'snare', 'clap', 'hat', 'openhat', 'rim', 'ride']

export const DRUM_NAMES: Record<DrumId, string> = {
  kick: 'Kick',
  snare: 'Snare',
  clap: 'Clap',
  hat: 'Hi-hat',
  openhat: 'Open hat',
  rim: 'Rim',
  ride: 'Ride',
}

/** Measured relative to each other so nothing buries anything else. */
const TRIM: Record<DrumId, number> = {
  kick: 0.62,
  snare: 0.29,
  clap: 1.1,
  hat: 0.22,
  openhat: 0.2,
  rim: 1.5,
  ride: 0.24,
}

export interface KitTargets {
  output: AudioNode
  send?: AudioNode
  noise: AudioBuffer
}

function envelope(param: AudioParam, at: number, peak: number, decay: number, attack = 0.001) {
  param.cancelScheduledValues(at)
  param.setValueAtTime(SILENCE, at)
  param.exponentialRampToValueAtTime(Math.max(SILENCE, peak), at + attack)
  param.exponentialRampToValueAtTime(SILENCE, at + attack + decay)
  param.setValueAtTime(0, at + attack + decay)
}

export class DrumKit {
  private readonly ctx: AudioContext
  private readonly targets: KitTargets
  /** The currently ringing open hat, so a closed hat can cut it off. */
  private openHat: { gain: GainNode; stop: () => void } | null = null

  constructor(ctx: AudioContext, targets: KitTargets) {
    this.ctx = ctx
    this.targets = targets
  }

  private out(sendAmount: number): { input: GainNode } {
    const gain = this.ctx.createGain()
    gain.connect(this.targets.output)
    if (this.targets.send && sendAmount > 0) {
      const send = this.ctx.createGain()
      send.gain.value = sendAmount
      gain.connect(send)
      send.connect(this.targets.send)
    }
    return { input: gain }
  }

  private noiseSource(): AudioBufferSourceNode {
    const source = this.ctx.createBufferSource()
    source.buffer = this.targets.noise
    source.loop = true
    return source
  }

  hit(drum: DrumId, at: number, velocity = 1): void {
    const level = TRIM[drum] * Math.max(0.05, Math.min(1, velocity))
    switch (drum) {
      case 'kick':
        return this.kick(at, level)
      case 'snare':
        return this.snare(at, level)
      case 'clap':
        return this.clap(at, level)
      case 'hat':
        return this.hat(at, level, 0.045, true)
      case 'openhat':
        return this.hat(at, level, 0.36, false)
      case 'rim':
        return this.rim(at, level)
      case 'ride':
        return this.ride(at, level)
    }
  }

  private kick(at: number, level: number): void {
    const { input } = this.out(0.02)
    const osc = this.ctx.createOscillator()
    osc.type = 'sine'
    // The pitch drop is the kick. Starting around 120Hz and falling to 45 in forty
    // milliseconds gives the click of the beater and then the body, from one oscillator.
    osc.frequency.setValueAtTime(120, at)
    osc.frequency.exponentialRampToValueAtTime(45, at + 0.04)
    envelope(input.gain, at, level, 0.4)
    osc.connect(input)
    osc.start(at)
    osc.stop(at + 0.5)
    setTimeout(() => input.disconnect(), Math.max(0, (at - this.ctx.currentTime + 0.6) * 1000))
  }

  private snare(at: number, level: number): void {
    const { input } = this.out(0.16)
    const noise = this.noiseSource()
    const band = this.ctx.createBiquadFilter()
    band.type = 'highpass'
    band.frequency.value = 1400
    const noiseGain = this.ctx.createGain()
    envelope(noiseGain.gain, at, level, 0.16)
    noise.connect(band)
    band.connect(noiseGain)
    noiseGain.connect(input)

    // Two tuned oscillators for the drum's body. Noise alone is a hiss, not a snare.
    for (const [hz, gainLevel] of [
      [185, 0.5],
      [330, 0.3],
    ] as const) {
      const osc = this.ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = hz
      const gain = this.ctx.createGain()
      envelope(gain.gain, at, level * gainLevel, 0.1)
      osc.connect(gain)
      gain.connect(input)
      osc.start(at)
      osc.stop(at + 0.3)
    }

    input.gain.value = 1
    noise.start(at)
    noise.stop(at + 0.3)
    setTimeout(() => input.disconnect(), Math.max(0, (at - this.ctx.currentTime + 0.4) * 1000))
  }

  private clap(at: number, level: number): void {
    const { input } = this.out(0.3)
    // Four bursts a few milliseconds apart. One burst is a snare; the spacing is the whole
    // difference, and it is what makes a clap sound like a room full of people.
    for (const [index, offset] of [0, 0.009, 0.018, 0.03].entries()) {
      const noise = this.noiseSource()
      const band = this.ctx.createBiquadFilter()
      band.type = 'bandpass'
      band.frequency.value = 1100
      band.Q.value = 1.2
      const gain = this.ctx.createGain()
      const decay = index === 3 ? 0.14 : 0.02
      envelope(gain.gain, at + offset, level * (index === 3 ? 1 : 0.7), decay)
      noise.connect(band)
      band.connect(gain)
      gain.connect(input)
      noise.start(at + offset)
      noise.stop(at + offset + decay + 0.05)
    }
    setTimeout(() => input.disconnect(), Math.max(0, (at - this.ctx.currentTime + 0.5) * 1000))
  }

  private hat(at: number, level: number, decay: number, closed: boolean): void {
    // The choke group. A closed hat cuts off a ringing open one, which is what makes a
    // hi-hat pattern breathe rather than smear into continuous noise.
    if (this.openHat) {
      this.openHat.gain.gain.cancelScheduledValues(at)
      this.openHat.gain.gain.setValueAtTime(Math.max(SILENCE, this.openHat.gain.gain.value), at)
      this.openHat.gain.gain.exponentialRampToValueAtTime(SILENCE, at + 0.012)
      this.openHat = null
    }

    const { input } = this.out(0.08)
    const noise = this.noiseSource()
    const band = this.ctx.createBiquadFilter()
    band.type = 'highpass'
    band.frequency.value = 7200
    const gain = this.ctx.createGain()
    envelope(gain.gain, at, level, decay)
    noise.connect(band)
    band.connect(gain)
    gain.connect(input)
    noise.start(at)
    noise.stop(at + decay + 0.1)

    if (!closed) this.openHat = { gain, stop: () => noise.stop() }
    setTimeout(
      () => input.disconnect(),
      Math.max(0, (at - this.ctx.currentTime + decay + 0.2) * 1000),
    )
  }

  private rim(at: number, level: number): void {
    const { input } = this.out(0.12)
    const osc = this.ctx.createOscillator()
    osc.type = 'square'
    osc.frequency.value = 420
    const band = this.ctx.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.value = 1800
    band.Q.value = 6
    envelope(input.gain, at, level, 0.035)
    osc.connect(band)
    band.connect(input)
    osc.start(at)
    osc.stop(at + 0.1)
    setTimeout(() => input.disconnect(), Math.max(0, (at - this.ctx.currentTime + 0.2) * 1000))
  }

  private ride(at: number, level: number): void {
    const { input } = this.out(0.24)
    const noise = this.noiseSource()
    const band = this.ctx.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.value = 5200
    band.Q.value = 0.8
    const gain = this.ctx.createGain()
    envelope(gain.gain, at, level, 0.9)
    noise.connect(band)
    band.connect(gain)
    gain.connect(input)
    noise.start(at)
    noise.stop(at + 1.1)
    setTimeout(() => input.disconnect(), Math.max(0, (at - this.ctx.currentTime + 1.3) * 1000))
  }

  allOff(): void {
    this.openHat = null
  }
}
