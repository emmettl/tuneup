// A single note you can reshape while it sounds.
//
// Everything else in this project schedules a voice and lets it run — you cannot change a note
// that has already been handed to the audio thread. The rock and electronica chapters need the
// opposite: a note that holds while the learner turns a knob, so the CHANGE is what is heard
// rather than a series of separate notes that happen to differ.
//
// So this owns its nodes and exposes setters, and it is the only place in the codebase that
// does. It is deliberately not part of `player()` — a persistent, mutable voice is exactly the
// thing the scheduled path is designed to avoid, and mixing the two would blur why.

import { audioContext, unlock } from './context.js'
import { player } from './player.js'
import { frequency } from '../theory/pitch.js'

export type Wave = 'sine' | 'triangle' | 'sawtooth' | 'square'

export interface TimbreSettings {
  wave: Wave
  /** Filter cutoff in Hz. */
  cutoff: number
  /** Filter resonance. Above about 12 it starts to whistle at the cutoff. */
  resonance: number
  /** 0 is clean. Drives a waveshaper — the rock chapter's whole subject. */
  drive: number
  /** Two oscillators this many cents apart. Zero is one oscillator. */
  detune: number
}

export const DEFAULT_TIMBRE: TimbreSettings = {
  wave: 'sawtooth',
  cutoff: 2200,
  resonance: 2,
  drive: 0,
  detune: 0,
}

/**
 * A waveshaper curve for overdrive.
 *
 * The classic arctan-ish shape: gentle in the middle, flattening at the extremes, so quiet
 * signals pass almost untouched and loud ones are squashed. That asymmetry between quiet and
 * loud IS distortion — a curve that scaled everything equally would just be a volume change.
 */
function driveCurve(amount: number): Float32Array<ArrayBuffer> {
  const samples = 1024
  // Typed against ArrayBuffer explicitly: the default Float32Array type admits a
  // SharedArrayBuffer, and WaveShaperNode.curve does not accept one.
  const curve = new Float32Array(new ArrayBuffer(samples * 4))
  // Zero has to stay linear, or a "clean" setting is not clean.
  const k = amount * 120
  for (let index = 0; index < samples; index++) {
    const x = (index * 2) / samples - 1
    curve[index] = k === 0 ? x : ((1 + k) * x) / (1 + k * Math.abs(x))
  }
  return curve
}

export class TimbreVoice {
  private readonly ctx: AudioContext
  private oscillators: OscillatorNode[] = []
  private gain: GainNode
  private filter: BiquadFilterNode
  private shaper: WaveShaperNode
  private makeup: GainNode
  private settings: TimbreSettings
  private playing = false

  constructor(settings: TimbreSettings = DEFAULT_TIMBRE) {
    void unlock()
    this.ctx = audioContext()
    this.settings = { ...settings }

    this.filter = this.ctx.createBiquadFilter()
    this.filter.type = 'lowpass'
    this.shaper = this.ctx.createWaveShaper()
    this.shaper.oversample = '4x'
    this.makeup = this.ctx.createGain()
    this.gain = this.ctx.createGain()
    this.gain.gain.value = 0

    this.filter.connect(this.shaper)
    this.shaper.connect(this.makeup)
    this.makeup.connect(this.gain)
    // Through the shared master chain, not straight to the destination. A distorted sawtooth
    // wired direct bypasses the compressor and the volume control, so it arrives far louder
    // than every other instrument and ignores the one control a learner would reach for.
    player().prepare()
    this.gain.connect(player().bus ?? this.ctx.destination)

    this.apply()
  }

  private apply(): void {
    const { cutoff, resonance, drive } = this.settings
    const now = this.ctx.currentTime
    // setTargetAtTime rather than a jump: a knob turned quickly should glide, and a stepped
    // filter cutoff zipper-noises audibly.
    this.filter.frequency.setTargetAtTime(cutoff, now, 0.02)
    this.filter.Q.setTargetAtTime(resonance, now, 0.02)
    this.shaper.curve = driveCurve(drive)
    // Distortion adds level, so some compensation is needed — without it, turning drive up is
    // heard as "louder" rather than "dirtier", which is the wrong lesson entirely.
    //
    // But only some. The first attempt divided by (1 + drive * 2.2), which over-corrected far
    // enough that the distorted stage measured QUIETER than the clean one — 0.045 against
    // 0.115 — so drive read as a volume cut. The waveshaper's own curve already flattens the
    // peaks; this only has to take the edge off what is left.
    this.makeup.gain.setTargetAtTime(1 / (1 + drive * 0.85), now, 0.02)
  }

  /** Start, or re-pitch if already sounding. Chord tones are given as MIDI numbers. */
  play(pitches: number[]): void {
    void unlock()
    this.stop(true)
    const now = this.ctx.currentTime

    for (const midi of pitches) {
      const voices = this.settings.detune > 0 ? [-1, 1] : [0]
      for (const side of voices) {
        const osc = this.ctx.createOscillator()
        osc.type = this.settings.wave
        osc.frequency.value = frequency(midi)
        osc.detune.value = side * this.settings.detune
        osc.connect(this.filter)
        osc.start(now)
        this.oscillators.push(osc)
      }
    }

    // Scaled by voice count so a five-note chord is not five times louder than one note.
    const level = 0.28 / Math.sqrt(Math.max(1, this.oscillators.length))
    this.gain.gain.cancelScheduledValues(now)
    this.gain.gain.setValueAtTime(this.gain.gain.value, now)
    this.gain.gain.linearRampToValueAtTime(level, now + 0.02)
    this.playing = true
  }

  update(patch: Partial<TimbreSettings>): void {
    const wave = patch.wave
    this.settings = { ...this.settings, ...patch }
    // Oscillator type and detune are per-node, so they change live rather than through apply.
    if (wave) for (const osc of this.oscillators) osc.type = wave
    if (patch.detune !== undefined) {
      this.oscillators.forEach((osc, index) => {
        if (this.settings.detune === 0) osc.detune.value = 0
        else osc.detune.value = (index % 2 === 0 ? -1 : 1) * this.settings.detune
      })
    }
    this.apply()
  }

  get isPlaying(): boolean {
    return this.playing
  }

  stop(immediate = false): void {
    if (this.oscillators.length === 0) return
    const now = this.ctx.currentTime
    const end = now + (immediate ? 0.01 : 0.06)
    this.gain.gain.cancelScheduledValues(now)
    this.gain.gain.setValueAtTime(this.gain.gain.value, now)
    this.gain.gain.linearRampToValueAtTime(0, end)
    for (const osc of this.oscillators) {
      try {
        osc.stop(end + 0.01)
      } catch {
        // Already stopped.
      }
    }
    this.oscillators = []
    this.playing = false
  }

  dispose(): void {
    this.stop(true)
    this.gain.disconnect()
    this.filter.disconnect()
    this.shaper.disconnect()
    this.makeup.disconnect()
  }

  /** The spectrum, for the display that shows distortion generating new partials. */
  connectAnalyser(analyser: AnalyserNode): void {
    this.makeup.connect(analyser)
  }
}
