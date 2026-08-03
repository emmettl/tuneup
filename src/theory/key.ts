// Keys, key signatures, and the circle of fifths.
//
// Everything here hangs off ONE number: how many fifths a key sits from C, in the range -7
// to +7. That number is the key signature (positive means sharps, negative means flats), it
// is the position on the circle, and the distance between two of them is how closely related
// two keys are. Deriving all three from a single integer is what makes the dial in chapter 3
// a mechanism rather than a poster to memorise.

import {
  LETTERS,
  type Letter,
  type Spelled,
  midiOf,
  note,
  noteName,
  parseNote,
  pitchClassOf,
} from './pitch.js'
import { type ScaleId, scaleNotes } from './scale.js'

export type Mode = 'major' | 'minor'

export interface Key {
  tonic: Spelled
  mode: Mode
}

/**
 * The letters in fifths order, centred so that C is zero.
 *
 * F C G D A E B — which is also, read backwards, the order flats appear in a key signature,
 * and read forwards from F, the order sharps do. That is not a coincidence to memorise; it
 * is the same sequence seen from both ends.
 */
const FIFTHS_ORDER: readonly Letter[] = ['F', 'C', 'G', 'D', 'A', 'E', 'B']

const LETTER_FIFTHS: Record<Letter, number> = { F: -1, C: 0, G: 1, D: 2, A: 3, E: 4, B: 5 }

/** How many fifths from C a spelled note sits. Each accidental is worth seven, because seven
 *  fifths is exactly one chromatic step round the circle. */
export function fifthsOfNote(n: Spelled): number {
  return LETTER_FIFTHS[n.letter] + 7 * n.alter
}

/** The note at a given position on the circle. The inverse of `fifthsOfNote`. */
export function noteAtFifths(fifths: number, octave = 4): Spelled {
  const index = fifths + 1
  const letter = FIFTHS_ORDER[((index % 7) + 7) % 7]!
  return { letter, alter: Math.floor(index / 7), octave }
}

/**
 * A minor key sits three positions clockwise of its tonic's own position, because it shares
 * a signature with the major a minor third above it. A minor and C major are both zero.
 */
const MINOR_OFFSET = 3

export function fifthsOf(key: Key): number {
  return fifthsOfNote(key.tonic) - (key.mode === 'minor' ? MINOR_OFFSET : 0)
}

export function keyFromFifths(fifths: number, mode: Mode): Key {
  return {
    tonic: noteAtFifths(fifths + (mode === 'minor' ? MINOR_OFFSET : 0)),
    mode,
  }
}

/** The order sharps are written in a signature: F C G D A E B. */
export const SHARP_ORDER: readonly Letter[] = ['F', 'C', 'G', 'D', 'A', 'E', 'B']
/** And flats, which is the same list backwards. */
export const FLAT_ORDER: readonly Letter[] = ['B', 'E', 'A', 'D', 'G', 'C', 'F']

export interface KeySignature {
  kind: 'sharp' | 'flat' | 'none'
  /** The altered letters, in the order they are written on a stave. */
  letters: Letter[]
  /** Signed, so the staff renderer and the circle can both use it directly. */
  fifths: number
}

export function keySignature(key: Key): KeySignature {
  const fifths = fifthsOf(key)
  if (fifths === 0) return { kind: 'none', letters: [], fifths }
  if (fifths > 0) return { kind: 'sharp', letters: SHARP_ORDER.slice(0, fifths), fifths }
  return { kind: 'flat', letters: FLAT_ORDER.slice(0, -fifths), fifths }
}

/** How a given letter is altered by the key signature: -1, 0 or +1. */
export function accidentalFor(key: Key, letter: Letter): number {
  const signature = keySignature(key)
  if (!signature.letters.includes(letter)) return 0
  return signature.kind === 'sharp' ? 1 : -1
}

/** The minor key that shares this key's signature, and vice versa. Same notes, new home. */
export function relative(key: Key): Key {
  return keyFromFifths(fifthsOf(key), key.mode === 'major' ? 'minor' : 'major')
}

/** The key with the same tonic and the other mode. C major and C minor — a different
 *  signature entirely, which is what makes it feel like a bigger move than the relative. */
export function parallel(key: Key): Key {
  return { tonic: key.tonic, mode: key.mode === 'major' ? 'minor' : 'major' }
}

/** One step clockwise: up a fifth, one more sharp (or one fewer flat). */
export function dominantKey(key: Key): Key {
  return keyFromFifths(fifthsOf(key) + 1, key.mode)
}

/** One step anticlockwise. */
export function subdominantKey(key: Key): Key {
  return keyFromFifths(fifthsOf(key) - 1, key.mode)
}

/**
 * How far apart two keys are on the circle, counting the short way round.
 *
 * The circle wraps at twelve, so C and B are one step apart rather than eleven — which is
 * what a listener hears, and what "closely related" has to mean for the dial to make sense.
 */
export function circleDistance(a: Key, b: Key): number {
  const raw = Math.abs(fifthsOf(a) - fifthsOf(b)) % 12
  return Math.min(raw, 12 - raw)
}

export interface CirclePosition {
  fifths: number
  major: Key
  minor: Key
  signature: KeySignature
}

/**
 * The twelve positions of the circle, starting at C and going clockwise.
 *
 * Twelve, not fifteen: the dial is a wheel, so it stops where it started rather than running
 * on into the theoretical keys. F sharp is included and its enharmonic twin G flat is not —
 * both are six accidentals and one of them has to be picked, and F sharp is the one a
 * beginner is more likely to meet.
 */
export function circleOfFifths(): CirclePosition[] {
  const positions: CirclePosition[] = []
  for (let fifths = 0; fifths < 12; fifths++) {
    // Past six sharps the flat spelling is the readable one — G flat rather than F sharp is
    // a matter of taste, but D flat over C sharp and so on is not.
    const signed = fifths <= 6 ? fifths : fifths - 12
    const major = keyFromFifths(signed, 'major')
    positions.push({
      fifths: signed,
      major,
      minor: keyFromFifths(signed, 'minor'),
      signature: keySignature(major),
    })
  }
  return positions
}

const MODE_SCALE: Record<Mode, ScaleId> = { major: 'major', minor: 'natural-minor' }

/** The scale of the key, spelled. Minor means natural minor here; harmonic and melodic are
 *  variations a lesson asks for explicitly rather than defaults. */
export function keyScale(key: Key): Spelled[] {
  return scaleNotes(key.tonic, MODE_SCALE[key.mode])
}

export function keyName(key: Key, options: { unicode?: boolean } = {}): string {
  return `${noteName(key.tonic, { unicode: options.unicode ?? true })} ${key.mode}`
}

/**
 * Parse a key name: 'C', 'Eb major', 'f# minor', 'A minor'.
 *
 * A bare note means major, which is the convention everywhere except in analysis where a
 * lowercase letter means minor — deliberately not supported, because 'a' meaning A minor and
 * 'A' meaning A major is a trap in hand-written lesson data.
 */
export function parseKey(text: string): Key | null {
  const match = /^(\S+)(?:\s+(major|minor|maj|min))?$/i.exec(text.trim())
  if (!match) return null
  const [, tonicText = '', modeText] = match
  const tonic = parseNote(tonicText)
  if (!tonic) return null
  const mode: Mode = modeText?.toLowerCase().startsWith('min') ? 'minor' : 'major'
  return { tonic, mode }
}

/** Like `parseKey` but throws. For literals written in this codebase. */
export function key(text: string): Key {
  const parsed = parseKey(text)
  if (!parsed) throw new Error(`not a key: ${text}`)
  return parsed
}

/**
 * Spell a MIDI number the way this key would write it.
 *
 * In-key notes get the spelling the scale already gives them. Out-of-key notes follow the
 * signature's direction — a sharp key sharpens, a flat key flattens — which is what stops a
 * chromatic passing note in E flat major turning up as a D sharp.
 */
export function spellInKey(midi: number, k: Key): Spelled {
  const rounded = Math.round(midi)
  const pitchClass = ((rounded % 12) + 12) % 12
  const octave = Math.floor(rounded / 12) - 1

  const inScale = keyScale(k).find((n) => pitchClassOf(n) === pitchClass)
  if (inScale) {
    // The scale is spelled in one octave from its tonic; re-seat it at the target octave.
    // Comparing MIDI rather than trusting the letter is what keeps B# and Cb on the right
    // side of the boundary.
    for (const shift of [0, -1, 1]) {
      const candidate: Spelled = { ...inScale, octave: octave + shift }
      if (midiOf(candidate) === rounded) return candidate
    }
  }

  const prefer = fifthsOf(k) < 0 ? 'flat' : 'sharp'
  return spellChromatic(rounded, prefer)
}

const SHARP_TABLE: readonly [Letter, number][] = [
  ['C', 0], ['C', 1], ['D', 0], ['D', 1], ['E', 0], ['F', 0],
  ['F', 1], ['G', 0], ['G', 1], ['A', 0], ['A', 1], ['B', 0],
]

const FLAT_TABLE: readonly [Letter, number][] = [
  ['C', 0], ['D', -1], ['D', 0], ['E', -1], ['E', 0], ['F', 0],
  ['G', -1], ['G', 0], ['A', -1], ['A', 0], ['B', -1], ['B', 0],
]

function spellChromatic(midi: number, prefer: 'sharp' | 'flat'): Spelled {
  const pitchClass = ((midi % 12) + 12) % 12
  const entry = (prefer === 'flat' ? FLAT_TABLE : SHARP_TABLE)[pitchClass]!
  return { letter: entry[0], alter: entry[1], octave: Math.floor(midi / 12) - 1 }
}

/** The fifteen keys that have a conventional signature, flats first. Used by key pickers,
 *  which should not offer the theoretical keys beyond seven accidentals. */
export function writableKeys(mode: Mode): Key[] {
  const keys: Key[] = []
  for (let fifths = -7; fifths <= 7; fifths++) keys.push(keyFromFifths(fifths, mode))
  return keys
}

/** Every letter used exactly once, which is the invariant a key signature depends on. */
export function spellsCleanly(key: Key): boolean {
  const letters = keyScale(key).map((n) => n.letter)
  return new Set(letters).size === LETTERS.length && letters.length === LETTERS.length
}

export const C_MAJOR: Key = { tonic: note('C'), mode: 'major' }
