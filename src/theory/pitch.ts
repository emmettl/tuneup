// Pitch, spelled.
//
// The decision this file exists to make, and the one that is not retrofittable: a note is a
// LETTER plus an ALTERATION plus an OCTAVE, and its MIDI number is derived from that — never
// the other way round.
//
// A MIDI integer cannot answer "is this C sharp or D flat". Both are 61. But they are
// different notes: one belongs to A major and the other to E flat major, they sit on
// different lines of a stave, and writing the wrong one turns a correct chord into
// nonsense on the page. Every downstream module — key signatures, roman numerals, the staff
// renderer, scale spelling — needs the answer, and there is nowhere to recover it from once
// it has been thrown away.
//
// So: `Spelled` is the currency, and `midiOf` is a one-way door taken as late as possible,
// at the point a sound is actually made.

/** The seven letters, in the order the alphabet uses for pitch — starting at C, not A. */
export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const
export type Letter = (typeof LETTERS)[number]

/** 0..11. C is 0. */
export type PitchClass = number

export interface Spelled {
  letter: Letter
  /** Semitone alteration. -1 flat, +1 sharp, ±2 for the doubles. */
  alter: number
  /** Scientific pitch notation: middle C is C4, which is MIDI 60. */
  octave: number
}

/** Semitones above C, for each letter. The gaps between E–F and B–C are the whole reason a
 *  keyboard looks the way it does, and they are the only irregularity in the system. */
const LETTER_SEMITONES: Record<Letter, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
}

const LETTER_INDEX: Record<Letter, number> = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 }

export function isLetter(value: string): value is Letter {
  return value in LETTER_SEMITONES
}

/** 0..6, the diatonic axis. This is what makes intervals correct: an interval's NUMBER is a
 *  difference of letter indices, and its QUALITY is whatever semitones are left over. Every
 *  interval bug in a naive implementation comes from trying to derive the number from
 *  semitones instead, which cannot distinguish an augmented fourth from a diminished fifth. */
export function letterIndex(n: Spelled): number {
  return LETTER_INDEX[n.letter]
}

/** Absolute position on the diatonic ladder, counting octaves. Lets `between` subtract two
 *  notes without special-casing an octave boundary. */
export function diatonicIndex(n: Spelled): number {
  return LETTER_INDEX[n.letter] + 7 * n.octave
}

export function midiOf(n: Spelled): number {
  // +1 because MIDI puts C-1 at zero, so C4 lands on 60.
  return 12 * (n.octave + 1) + LETTER_SEMITONES[n.letter] + n.alter
}

export function pitchClassOf(n: Spelled): PitchClass {
  return ((midiOf(n) % 12) + 12) % 12
}

export function spelled(letter: Letter, alter: number, octave: number): Spelled {
  return { letter, alter, octave }
}

export function sameNote(a: Spelled, b: Spelled): boolean {
  return a.letter === b.letter && a.alter === b.alter && a.octave === b.octave
}

/** Same sound, possibly different spelling. C sharp and D flat are enharmonic; C sharp and
 *  C sharp in the next octave are not. */
export function enharmonic(a: Spelled, b: Spelled): boolean {
  return midiOf(a) === midiOf(b)
}

const ACCIDENTAL_ALTER: Record<string, number> = {
  '#': 1,
  '♯': 1,
  s: 1,
  b: -1,
  '♭': -1,
  x: 2,
  '\u{1D12A}': 2,
  '\u{1D12B}': -2,
  '♮': 0,
  n: 0,
}

// The `u` flag is load-bearing: the double-sharp and double-flat are astral-plane characters,
// and without it they go into the character class as two lone surrogates each — which would
// match half a glyph, and match the wrong half of an unrelated one.
const NOTE_PATTERN = /^([A-Ga-g])([#♯sb♭x\u{1D12A}\u{1D12B}♮n]*)(-?\d+)?$/u

/**
 * Parse a note name. Accepts ASCII or the real glyphs, and an optional octave.
 *
 *   note('C')      C natural, octave 4 — the default, because most theory talk is about
 *                  pitch classes and picking middle C keeps anything played audible.
 *   note('F#4')    note('Bb3')    note('Ebb2')    note('G♯5')    note('Fx3')
 *
 * Returns null rather than throwing: this parses lesson-authored strings, and a typo should
 * surface as a failing registry test rather than as a blank page.
 */
export function parseNote(text: string): Spelled | null {
  const match = NOTE_PATTERN.exec(text.trim())
  if (!match) return null

  const [, rawLetter = '', accidentals = '', rawOctave] = match
  const letter = rawLetter.toUpperCase()
  if (!isLetter(letter)) return null

  let alter = 0
  let sign = 0
  for (const glyph of accidentals) {
    const step = ACCIDENTAL_ALTER[glyph]
    if (step === undefined) return null
    // Accidentals have to agree in direction. Summing them alone would accept 'C#b#', which
    // is not a note name in any notation — it just happens to add up to something in range,
    // and letting arithmetic decide would wave through whatever typo produced it.
    if (step !== 0) {
      if (sign !== 0 && Math.sign(step) !== sign) return null
      sign = Math.sign(step)
    } else if (accidentals.length > 1) {
      // A natural cancels; it does not combine. 'C♮♮' and 'C♮#' are not names either.
      return null
    }
    alter += step
  }
  // Beyond a double the notation stops meaning anything a musician would read, and in
  // practice a triple accidental is a bug in whatever generated it rather than a real note.
  if (alter < -2 || alter > 2) return null

  return { letter, alter, octave: rawOctave === undefined ? 4 : Number(rawOctave) }
}

/** Like `parseNote` but throws. For literals written in this codebase, where a typo is a
 *  programming error and should not be silently carried as null. */
export function note(text: string): Spelled {
  const parsed = parseNote(text)
  if (!parsed) throw new Error(`not a note name: ${text}`)
  return parsed
}

/**
 * The accidental glyphs for an alteration.
 *
 * A function rather than a lookup table because the keys are negative, and a negative key in
 * an object literal has to be quoted — at which point it is a string pretending to be a
 * number and the type only agrees by coincidence.
 *
 * The double sharp is U+1D12A, which is outside the BMP and so is a surrogate pair. Written
 * as an escape rather than pasted so it survives any editor or terminal that mangles
 * astral-plane characters — which is how it got corrupted the first time.
 */
function accidentalGlyphs(alter: number, unicode: boolean): string {
  if (alter === 0) return ''
  if (unicode) {
    if (alter === 2) return '\u{1D12A}'
    if (alter === -2) return '\u{1D12B}'
    return alter > 0 ? '♯'.repeat(alter) : '♭'.repeat(-alter)
  }
  if (alter === 2) return 'x'
  return alter > 0 ? '#'.repeat(alter) : 'b'.repeat(-alter)
}

export interface NameOptions {
  /** Include the octave number. Off by default: lessons talk about "F sharp", not "F sharp 4". */
  octave?: boolean
  /** Real accidental glyphs rather than ASCII. On by default — this is display text. */
  unicode?: boolean
}

export function noteName(n: Spelled, options: NameOptions = {}): string {
  const { octave = false, unicode = true } = options
  return `${n.letter}${accidentalGlyphs(n.alter, unicode)}${octave ? n.octave : ''}`
}

/**
 * Frequency in Hz.
 *
 * Takes a number rather than a `Spelled` because it accepts FRACTIONAL midi: a guitar bend
 * in the rock chapter is 60.5, and forcing it through a spelled note would round it back to
 * a semitone and silently remove the thing being taught.
 */
export function frequency(midi: number, a4 = 440): number {
  return a4 * Math.pow(2, (midi - 69) / 12)
}

/** Semitones between two frequencies. The inverse of `frequency`, for the "high and low"
 *  lesson's readout. */
export function midiOfFrequency(hz: number, a4 = 440): number {
  return 69 + 12 * Math.log2(hz / a4)
}

const SHARP_SPELLINGS: readonly [Letter, number][] = [
  ['C', 0],
  ['C', 1],
  ['D', 0],
  ['D', 1],
  ['E', 0],
  ['F', 0],
  ['F', 1],
  ['G', 0],
  ['G', 1],
  ['A', 0],
  ['A', 1],
  ['B', 0],
]

const FLAT_SPELLINGS: readonly [Letter, number][] = [
  ['C', 0],
  ['D', -1],
  ['D', 0],
  ['E', -1],
  ['E', 0],
  ['F', 0],
  ['G', -1],
  ['G', 0],
  ['A', -1],
  ['A', 0],
  ['B', -1],
  ['B', 0],
]

/**
 * A default spelling for a MIDI number.
 *
 * This is the lossy direction and it is only ever a guess — which is why it takes a
 * preference rather than pretending there is a right answer. Callers that know the key
 * should use `theory/key.ts`'s spelling instead; this exists for the places where there
 * genuinely is no key, such as naming whatever the learner just pressed on a bare keyboard
 * in chapter 1.
 */
export function spellMidi(midi: number, prefer: 'sharp' | 'flat' = 'sharp'): Spelled {
  const rounded = Math.round(midi)
  const pitchClass = ((rounded % 12) + 12) % 12
  const octave = Math.floor(rounded / 12) - 1
  const table = prefer === 'flat' ? FLAT_SPELLINGS : SHARP_SPELLINGS
  const entry = table[pitchClass]!
  return { letter: entry[0], alter: entry[1], octave }
}

/**
 * Every reasonable spelling of the same sound, nearest-to-natural first.
 *
 * Used by the enharmonics lesson, where the whole point is showing that one key on the
 * keyboard has several names and they all sound identical. Capped at double accidentals; a
 * triple is not a name any reader would recognise.
 */
export function enharmonics(n: Spelled): Spelled[] {
  const target = midiOf(n)
  const found: Spelled[] = []
  for (const letter of LETTERS) {
    for (const alter of [0, -1, 1, -2, 2]) {
      // The octave has to be derived per candidate: B#3 and C4 are the same sound, so the
      // naive "keep n.octave" would spell that pair an octave apart.
      const naturalMidi = 12 * (n.octave + 1) + LETTER_SEMITONES[letter] + alter
      for (const shift of [0, -12, 12]) {
        if (naturalMidi + shift !== target) continue
        found.push({ letter, alter, octave: n.octave + shift / 12 })
      }
    }
  }
  return found.sort((a, b) => Math.abs(a.alter) - Math.abs(b.alter))
}

/** Move a note by whole octaves, keeping its spelling. */
export function shiftOctave(n: Spelled, by: number): Spelled {
  return { ...n, octave: n.octave + by }
}
