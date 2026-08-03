// Instruments as data, and a pure function from (patch, note, velocity) to a concrete plan.
//
// The split is borrowed from driftbox and it is the reason any of this is testable: nothing
// in this file knows an AudioContext exists. `buildVoice` turns a patch and a note into a
// list of oscillator frequencies, gains and envelope times — plain numbers — and render.ts is
// the only thing that turns those into nodes.
//
// So every interesting claim about an instrument is a unit test with no audio device:
// "a hard note is brighter than a soft one", "a high note decays faster than a low one",
// "no envelope ever ramps exponentially to zero". Those are the things that actually make a
// synthesised instrument sound like an instrument, and they are exactly the things nobody
// checks when the synthesis is tangled up with the graph.

import { frequency } from '../theory/pitch.js'

export interface AdsrSpec {
  attack: number
  decay: number
  /** 0..1. Zero means the note decays away whatever the key does — a piano rather than an
   *  organ. */
  sustain: number
  release: number
}

export interface OperatorSpec {
  /** Frequency as a multiple of the note. 1 is the fundamental; 14 is the bell-like tine
   *  that makes an electric piano sound like one. */
  ratio: number
  type: OscillatorType
  /**
   * Peak modulation depth, as a multiple of the carrier frequency.
   *
   * Zero (or absent) means this operator is a carrier and goes to the output. Anything else
   * means it modulates whichever operator `modulates` points at.
   */
  index?: number
  /** Index into the patch's own operator list. Absent means "straight to the output". */
  modulates?: number
  amp: AdsrSpec
  gain: number
  /** Fixed detune in cents, on top of the ratio. Two near-identical operators a few cents
   *  apart is most of what makes a synth sound wide rather than thin. */
  detune?: number
}

export interface FilterSpec {
  type: BiquadFilterType
  frequency: number
  Q?: number
  /** How far the filter opens on attack, in octaves, before decaying back. */
  envelope?: number
  envelopeDecay?: number
}

export interface NoiseSpec {
  gain: number
  amp: AdsrSpec
  filter?: FilterSpec
}

export interface PatchSpec {
  id: string
  name: string
  /** One line, for the instrument picker. */
  blurb: string
  operators: OperatorSpec[]
  noise?: NoiseSpec
  filter?: FilterSpec
  /**
   * How much brighter a hard note is than a soft one.
   *
   * Velocity has to drive BRIGHTNESS, not just volume. A real instrument played harder does
   * not simply get louder — it gets harmonically richer, and a synth that only scales gain
   * sounds like someone turning a volume knob rather than like someone playing.
   */
  velocityBrightness: number
  /**
   * How much shorter a high note is, per octave above middle C.
   *
   * A piano's top note rings for under a second and its bottom note for the best part of
   * ten. Without this every note decays identically and the instrument sounds like an organ
   * pretending to be a piano — which is the single most common tell of a from-scratch synth.
   */
  decayTracking: number
  /** Random detune per note, in cents, so two strikes of the same key do not phase-cancel
   *  into something thinner than one. */
  spread: number
  /** Measured offline, not guessed. See the note in master.ts. */
  trim: number
  reverbSend: number
  /** True for organ and pad: the note rings until released rather than decaying away. */
  sustained: boolean
}

/** A concrete operator, ready to be turned into nodes. */
export interface PlannedOperator {
  frequency: number
  detune: number
  type: OscillatorType
  /** Output gain for a carrier; modulation depth in Hz for a modulator. */
  gain: number
  amp: AdsrSpec
  /** Index of the operator this modulates, or undefined for a carrier. */
  modulates?: number
}

export interface VoicePlan {
  operators: PlannedOperator[]
  noise?: { gain: number; amp: AdsrSpec; filter?: FilterSpec }
  filter?: FilterSpec
  /** Overall gain, velocity and trim already applied. */
  gain: number
  /** How long the note rings if never released. Used to know when to free the nodes, and by
   *  the sounding registry to know when to put the key out. */
  duration: number
  reverbSend: number
  sustained: boolean
}

/** The smallest gain an exponential ramp may target. Zero is invalid and throws; this is
 *  inaudible and legal. Every ramp-to-silence in the codebase ends here and then hard-sets. */
export const SILENCE = 1e-4

/** Deterministic per-note jitter in the range -1..1. Not Math.random: a test has to be able
 *  to assert on a patch, and two notes at the same pitch should differ in a stable way. */
function jitter(midi: number, salt: number): number {
  let x = (midi + 1) * 2246822519 + salt * 3266489917
  x ^= x << 13
  x ^= x >>> 17
  x ^= x << 5
  return ((x >>> 0) / 0xffffffff) * 2 - 1
}

function scaleAdsr(amp: AdsrSpec, decayScale: number): AdsrSpec {
  return {
    attack: amp.attack,
    decay: amp.decay * decayScale,
    sustain: amp.sustain,
    release: amp.release * decayScale,
  }
}

/**
 * Turn a patch, a note and a velocity into concrete numbers.
 *
 * Pure. No AudioContext, no randomness that a test cannot reproduce, no side effects.
 */
export function buildVoice(patch: PatchSpec, midi: number, velocity = 0.8): VoicePlan {
  const clamped = Math.max(0.05, Math.min(1, velocity))
  const carrierHz = frequency(midi)

  // Higher notes decay faster. Measured in octaves from middle C so the effect is symmetric
  // about the middle of the keyboard rather than anchored at note zero.
  const octavesAboveMiddle = (midi - 60) / 12
  const decayScale = Math.pow(2, -octavesAboveMiddle * patch.decayTracking)

  // Velocity drives modulation depth as well as gain. The exponent is what makes a soft note
  // genuinely duller rather than just quieter.
  const brightness = Math.pow(clamped, 1 / (1 + patch.velocityBrightness))

  const operators: PlannedOperator[] = patch.operators.map((operator, index) => {
    const isModulator = operator.index !== undefined && operator.index > 0
    const detune =
      (operator.detune ?? 0) + jitter(midi, index) * patch.spread

    return {
      frequency: carrierHz * operator.ratio,
      detune,
      type: operator.type,
      // A modulator's "gain" is a frequency deviation in Hz, which is why it is scaled by the
      // carrier: an index of 2 means "swing the carrier by twice its own frequency", and that
      // has to mean the same thing at every pitch or the timbre changes across the keyboard.
      gain: isModulator
        ? carrierHz * operator.index! * brightness
        : operator.gain * clamped,
      amp: scaleAdsr(operator.amp, decayScale),
      modulates: operator.modulates,
    }
  })

  const filter = patch.filter
    ? {
        ...patch.filter,
        // Open the filter further for a harder note, on top of whatever the envelope does.
        frequency: patch.filter.frequency * (0.6 + 0.4 * brightness * 2),
      }
    : undefined

  const longest = operators.reduce((most, operator) => {
    const amp = operator.amp
    return Math.max(most, amp.attack + amp.decay + amp.release)
  }, 0)

  return {
    operators,
    noise: patch.noise
      ? { ...patch.noise, amp: scaleAdsr(patch.noise.amp, decayScale) }
      : undefined,
    filter,
    gain: patch.trim * clamped,
    duration: longest,
    reverbSend: patch.reverbSend,
    sustained: patch.sustained,
  }
}

/** How long a note rings after release, so a caller can tell the sounding registry when to
 *  put the key out without waiting for the whole tail. */
export function releaseTime(plan: VoicePlan): number {
  return plan.operators.reduce((most, operator) => Math.max(most, operator.amp.release), 0)
}
