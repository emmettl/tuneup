// The pitched instruments.
//
// The default is a two-operator FM electric piano, and that choice is the single highest
// quality-per-node decision available in Web Audio. A sine carrier with a sine modulator at
// roughly fourteen times its frequency, the modulator's envelope decaying in about a tenth of
// a second, produces the metallic strike-then-bloom of a struck tine — which is why the DX7
// electric piano exists and why it is still the most recognisable synth sound ever shipped.
// Three oscillators and two gain nodes, and it sounds like an instrument rather than a demo.
//
// The details that do the work, and which every from-scratch synth skips:
//
//   VELOCITY DRIVES BRIGHTNESS. Playing harder raises the modulation index, not just the
//   gain. A real instrument played harder gets harmonically richer; one that only gets louder
//   sounds like someone turning a volume knob.
//
//   HIGH NOTES DECAY FASTER. A piano's top note rings for under a second and its bottom note
//   for the best part of ten. Uniform decay is the clearest tell that a keyboard is fake.
//
//   NOTHING IS EXACTLY IN TUNE WITH ITSELF. A few cents of per-note detune stops two strikes
//   of the same key phase-cancelling into something thinner than one of them.

import type { PatchSpec } from '../spec.js'

export type InstrumentId =
  | 'rhodes'
  | 'piano'
  | 'organ'
  | 'pad'
  | 'bass'
  | 'sub'
  | 'guitar'
  | 'saw'
  | 'pluck'

export const RHODES: PatchSpec = {
  id: 'rhodes',
  name: 'Electric piano',
  blurb: 'Warm and bell-like. The default voice for everything on this site.',
  operators: [
    // The tine. A high ratio and a very fast decay: this is the strike, and it is gone
    // before the note has properly begun, which is exactly what a hammer hitting metal does.
    {
      ratio: 14,
      type: 'sine',
      index: 1.8,
      modulates: 1,
      gain: 1,
      amp: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.12 },
    },
    // The body. Long, simple, and what is left once the strike has died away.
    {
      ratio: 1,
      type: 'sine',
      gain: 0.9,
      amp: { attack: 0.002, decay: 2.4, sustain: 0, release: 0.35 },
    },
    // A second body an octave up, quiet, for presence on small speakers — which is what
    // most learners will be using.
    {
      ratio: 2,
      type: 'sine',
      gain: 0.16,
      detune: 4,
      amp: { attack: 0.002, decay: 1.1, sustain: 0, release: 0.25 },
    },
  ],
  filter: { type: 'lowpass', frequency: 7000, Q: 0.4 },
  velocityBrightness: 1.4,
  decayTracking: 0.55,
  spread: 3,
  trim: 0.53,
  reverbSend: 0.18,
  sustained: false,
}

export const PIANO: PatchSpec = {
  id: 'piano',
  name: 'Piano',
  blurb: 'Brighter and more percussive, with a faster decay.',
  operators: [
    {
      ratio: 3,
      type: 'sine',
      index: 1.1,
      modulates: 1,
      gain: 1,
      amp: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.15 },
    },
    {
      ratio: 1,
      type: 'triangle',
      gain: 0.85,
      amp: { attack: 0.001, decay: 1.8, sustain: 0, release: 0.3 },
    },
    // Slightly detuned unison, standing in for a real piano's two or three strings per note
    // beating gently against each other.
    {
      ratio: 1,
      type: 'triangle',
      gain: 0.4,
      detune: 7,
      amp: { attack: 0.001, decay: 1.6, sustain: 0, release: 0.3 },
    },
  ],
  filter: { type: 'lowpass', frequency: 8500, Q: 0.5 },
  velocityBrightness: 1.6,
  decayTracking: 0.75,
  spread: 4,
  trim: 0.42,
  reverbSend: 0.14,
  sustained: false,
}

export const ORGAN: PatchSpec = {
  id: 'organ',
  name: 'Organ',
  blurb: 'Holds forever and never decays. Good for hearing a chord clearly.',
  // Additive rather than FM: drawbar partials at 1, 2, 3, 4 and 6. An organ has no decay at
  // all, which makes it the clearest possible way to hear what notes are in a chord — worth
  // having for exactly that reason, in the lessons about chord construction.
  operators: [
    { ratio: 1, type: 'sine', gain: 0.7, amp: { attack: 0.006, decay: 0, sustain: 1, release: 0.09 } },
    { ratio: 2, type: 'sine', gain: 0.34, amp: { attack: 0.006, decay: 0, sustain: 1, release: 0.09 } },
    { ratio: 3, type: 'sine', gain: 0.18, amp: { attack: 0.008, decay: 0, sustain: 1, release: 0.09 } },
    { ratio: 4, type: 'sine', gain: 0.11, amp: { attack: 0.008, decay: 0, sustain: 1, release: 0.09 } },
    { ratio: 6, type: 'sine', gain: 0.07, amp: { attack: 0.01, decay: 0, sustain: 1, release: 0.09 } },
  ],
  velocityBrightness: 0.4,
  decayTracking: 0,
  spread: 2,
  trim: 0.17,
  reverbSend: 0.2,
  sustained: true,
}

export const PAD: PatchSpec = {
  id: 'pad',
  name: 'Pad',
  blurb: 'Soft, slow and wide. Chords held for bars at a time.',
  operators: [
    { ratio: 1, type: 'sawtooth', gain: 0.36, detune: -7, amp: { attack: 0.35, decay: 0, sustain: 1, release: 0.9 } },
    { ratio: 1, type: 'sawtooth', gain: 0.36, detune: 7, amp: { attack: 0.42, decay: 0, sustain: 1, release: 0.9 } },
    { ratio: 2, type: 'sine', gain: 0.14, amp: { attack: 0.5, decay: 0, sustain: 1, release: 0.9 } },
  ],
  filter: { type: 'lowpass', frequency: 2200, Q: 1.1, envelope: 1.4, envelopeDecay: 1.6 },
  velocityBrightness: 0.9,
  decayTracking: 0,
  spread: 6,
  trim: 0.25,
  reverbSend: 0.42,
  sustained: true,
}

export const BASS: PatchSpec = {
  id: 'bass',
  name: 'Bass',
  blurb: 'A single filtered saw with a fast sweep. Sits under everything.',
  operators: [
    { ratio: 1, type: 'sawtooth', gain: 0.9, amp: { attack: 0.004, decay: 0.6, sustain: 0.35, release: 0.12 } },
  ],
  filter: { type: 'lowpass', frequency: 420, Q: 6, envelope: 2.6, envelopeDecay: 0.22 },
  velocityBrightness: 1.8,
  decayTracking: 0.2,
  spread: 2,
  trim: 0.41,
  reverbSend: 0.04,
  sustained: false,
}

export const SUB: PatchSpec = {
  id: 'sub',
  name: 'Sub bass',
  blurb: 'Almost pure low end, with just enough edge to be audible on a laptop.',
  operators: [
    { ratio: 1, type: 'sine', gain: 0.95, amp: { attack: 0.006, decay: 0.9, sustain: 0.5, release: 0.14 } },
    // A pure sine sub is INAUDIBLE on the speakers most learners have — a phone or a laptop
    // reproduces nothing useful below about 150Hz. The quiet square an octave up gives the
    // ear a harmonic to infer the fundamental from, which is why the bass is still there on
    // a laptop even though the laptop cannot physically produce it.
    { ratio: 2, type: 'square', gain: 0.1, amp: { attack: 0.006, decay: 0.5, sustain: 0.3, release: 0.1 } },
  ],
  filter: { type: 'lowpass', frequency: 900, Q: 0.7 },
  velocityBrightness: 0.8,
  decayTracking: 0.15,
  spread: 1,
  trim: 0.26,
  reverbSend: 0.02,
  sustained: false,
}

export const GUITAR: PatchSpec = {
  id: 'guitar',
  name: 'Guitar',
  blurb: 'Plucked and bright. For riffs, licks and power chords.',
  // A filtered sawtooth with a very fast filter envelope and a noise transient. Karplus-
  // Strong would be more authentic and is far harder to control across a range this wide;
  // this is enough for the blues and rock chapters and behaves predictably at every pitch.
  operators: [
    { ratio: 1, type: 'sawtooth', gain: 0.7, amp: { attack: 0.002, decay: 1.4, sustain: 0.12, release: 0.2 } },
    { ratio: 2, type: 'sawtooth', gain: 0.18, detune: 6, amp: { attack: 0.002, decay: 0.7, sustain: 0.05, release: 0.15 } },
  ],
  noise: {
    gain: 0.09,
    amp: { attack: 0.0005, decay: 0.03, sustain: 0, release: 0.02 },
    filter: { type: 'bandpass', frequency: 2600, Q: 1.2 },
  },
  filter: { type: 'lowpass', frequency: 2400, Q: 2.2, envelope: 2.2, envelopeDecay: 0.18 },
  velocityBrightness: 1.5,
  decayTracking: 0.45,
  spread: 5,
  trim: 0.30,
  reverbSend: 0.16,
  sustained: false,
}

export const SAW: PatchSpec = {
  id: 'saw',
  name: 'Saw lead',
  blurb: 'Two detuned saws through a resonant filter. The dance-music stab.',
  operators: [
    { ratio: 1, type: 'sawtooth', gain: 0.5, detune: -12, amp: { attack: 0.006, decay: 0.4, sustain: 0.6, release: 0.18 } },
    { ratio: 1, type: 'sawtooth', gain: 0.5, detune: 12, amp: { attack: 0.006, decay: 0.4, sustain: 0.6, release: 0.18 } },
  ],
  filter: { type: 'lowpass', frequency: 1400, Q: 7, envelope: 2.2, envelopeDecay: 0.35 },
  velocityBrightness: 1.5,
  decayTracking: 0.1,
  spread: 8,
  trim: 0.34,
  reverbSend: 0.24,
  sustained: false,
}

export const PLUCK: PatchSpec = {
  id: 'pluck',
  name: 'Pluck',
  blurb: 'Short and percussive. Arpeggios and basslines.',
  operators: [
    { ratio: 1, type: 'square', gain: 0.6, amp: { attack: 0.002, decay: 0.26, sustain: 0, release: 0.1 } },
    { ratio: 3, type: 'sine', index: 0.9, modulates: 0, gain: 1, amp: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.06 } },
  ],
  filter: { type: 'lowpass', frequency: 3200, Q: 3, envelope: 1.8, envelopeDecay: 0.14 },
  velocityBrightness: 1.3,
  decayTracking: 0.5,
  spread: 4,
  trim: 0.69,
  reverbSend: 0.22,
  sustained: false,
}

export const PATCHES: Record<InstrumentId, PatchSpec> = {
  rhodes: RHODES,
  piano: PIANO,
  organ: ORGAN,
  pad: PAD,
  bass: BASS,
  sub: SUB,
  guitar: GUITAR,
  saw: SAW,
  pluck: PLUCK,
}

export const INSTRUMENT_IDS = Object.keys(PATCHES) as InstrumentId[]
