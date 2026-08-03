// Where notes go on a stave, as pure arithmetic.
//
// Hand-rolled rather than VexFlow or abcjs, and the reason is that this is a thin function
// over data the theory core already carries. A note's vertical position on a stave is decided
// by its LETTER and octave — nothing else — and we spell notes properly precisely so that
// question is answerable. An engraving library would be the largest dependency in the project
// and would need the same information handed to it in its own format.
//
// The scope is bounded to match: clefs, key signatures, accidentals, note heads and stems.
// Not beaming, not multiple voices, not slurs. Every example on this site is a scale, a chord
// or a short figure, which is what makes hand-rolling viable at all.

import { type Key, accidentalFor, keySignature } from '../theory/key.js'
import { LETTERS, type Letter, type Spelled, letterIndex } from '../theory/pitch.js'

export type Clef = 'treble' | 'bass'

/**
 * The note that sits on the bottom line of each clef.
 *
 * Everything else is counted from here in DIATONIC steps — letters, not semitones — which is
 * why a stave can show C sharp and C flat on the same line.
 */
const BOTTOM_LINE: Record<Clef, Spelled> = {
  treble: { letter: 'E', alter: 0, octave: 4 },
  bass: { letter: 'G', alter: 0, octave: 2 },
}

/** How many letter-steps a note is above the clef's bottom line. Each step is half a stave
 *  space, so 0 is the bottom line, 1 the space above it, 2 the next line up. */
export function staffStep(note: Spelled, clef: Clef): number {
  const base = BOTTOM_LINE[clef]
  const octaves = note.octave - base.octave
  return letterIndex(note) - letterIndex(base) + octaves * LETTERS.length
}

/** Where the middle line sits, for deciding stem direction. */
const MIDDLE_STEP = 4

/** Stems point away from the middle line, so the notes stay inside the stave. */
export function stemDirection(step: number): 'up' | 'down' {
  return step < MIDDLE_STEP ? 'up' : 'down'
}

/**
 * The ledger lines a note needs, as staff steps.
 *
 * Only the LINES are returned, not the spaces — a note in the first space above the stave
 * needs one ledger line below it, not two.
 */
export function ledgerLines(step: number): number[] {
  const lines: number[] = []
  // Above the top line, which is step 8.
  for (let line = 10; line <= step; line += 2) lines.push(line)
  // Below the bottom line, which is step 0.
  for (let line = -2; line >= step; line -= 2) lines.push(line)
  return lines
}

export interface Accidental {
  /** -2..2, matching Spelled.alter. */
  alter: number
  /** True when it is a natural cancelling the key signature. */
  natural: boolean
}

/**
 * Whether a note needs an accidental written in front of it, given the key.
 *
 * The rule that makes notation readable: the key signature has already said "every F is
 * sharp", so an F sharp in D major needs nothing. What needs a mark is a note that DIFFERS
 * from the signature — including a natural, which is how you cancel one.
 *
 * Deliberately does not track accidentals earlier in the same bar. Real notation does, and
 * every example here is short enough that repeating the mark is clearer than expecting the
 * reader to remember it.
 */
export function accidentalNeeded(note: Spelled, key: Key): Accidental | null {
  const expected = accidentalFor(key, note.letter)
  if (note.alter === expected) return null
  return { alter: note.alter, natural: note.alter === 0 }
}

/** Where the key signature's marks go, in order, as staff steps. */
export function signatureSteps(key: Key, clef: Clef): { letter: Letter; step: number; sharp: boolean }[] {
  const signature = keySignature(key)
  if (signature.kind === 'none') return []
  const sharp = signature.kind === 'sharp'

  return signature.letters.map((letter) => ({
    letter,
    step: signaturePosition(letter, clef, sharp),
    sharp,
  }))
}

/**
 * The conventional height for each signature mark.
 *
 * Not free choice: sharps and flats sit in a fixed pattern that keeps them inside the stave
 * and reading as a group. Picking the nearest octave instead produces a signature that
 * zigzags off the top, which every musician reads as wrong even if the letters are right.
 */
function signaturePosition(letter: Letter, clef: Clef, sharp: boolean): number {
  // Steps for treble clef, measured from the bottom line (E4 = 0).
  const treble: Record<Letter, number> = sharp
    ? { F: 8, C: 5, G: 9, D: 6, A: 3, E: 7, B: 4 }
    : { B: 4, E: 7, A: 3, D: 6, G: 2, C: 5, F: 1 }
  // Bass clef sits two steps lower throughout.
  return (treble[letter] ?? 4) - (clef === 'bass' ? 2 : 0)
}

export interface StaffNote {
  note: Spelled
  step: number
  stem: 'up' | 'down'
  ledger: number[]
  accidental: Accidental | null
}

/** Lay out a run of notes for one clef. */
export function layoutNotes(notes: Spelled[], key: Key, clef: Clef): StaffNote[] {
  return notes.map((note) => {
    const step = staffStep(note, clef)
    return {
      note,
      step,
      stem: stemDirection(step),
      ledger: ledgerLines(step),
      accidental: accidentalNeeded(note, key),
    }
  })
}

/**
 * Which clef suits a set of notes.
 *
 * Chosen by how much ledger-line work each would need, because a stave covered in ledger
 * lines is harder to read than one in the other clef — and beginners should never be shown
 * the harder option for no reason.
 */
export function bestClef(notes: Spelled[]): Clef {
  const cost = (clef: Clef) =>
    notes.reduce((total, note) => total + ledgerLines(staffStep(note, clef)).length, 0)
  return cost('bass') < cost('treble') ? 'bass' : 'treble'
}
