// Scales.
//
// A scale definition carries TWO parallel arrays, and the second one is the whole reason this
// file is not four lines long:
//
//   steps    semitones above the root
//   letters  how many LETTERS above the root's letter each degree is spelled
//
// The tempting shortcut is to derive `letters` — degree n uses letter n. That is right for
// every seven-note scale and wrong for every scale this site actually builds its genre
// chapters on:
//
//   major pentatonic  five notes over seven letters. C D E G A skips the F and the B.
//   blues             SIX notes over five letters. C E♭ F G♭ G B♭ puts two of them on G.
//
// Derive it and the blues scale comes out as C E♭ F G♭ A♭ B♭ — six letters, no G natural,
// and the lesson that the blue note sits *next to* the fifth becomes untellable. So the
// letters are written down per scale, deliberately, as data.

import {
  LETTERS,
  type PitchClass,
  type Spelled,
  letterIndex,
  midiOf,
  pitchClassOf,
} from './pitch.js'

export type ScaleId =
  | 'major'
  | 'natural-minor'
  | 'harmonic-minor'
  | 'melodic-minor'
  | 'ionian'
  | 'dorian'
  | 'phrygian'
  | 'lydian'
  | 'mixolydian'
  | 'aeolian'
  | 'locrian'
  | 'major-pentatonic'
  | 'minor-pentatonic'
  | 'blues'
  | 'whole-tone'
  | 'chromatic'

export interface ScaleDefinition {
  id: ScaleId
  name: string
  steps: readonly number[]
  /** Letter offsets from the root's letter, one per degree. See the note at the top. */
  letters: readonly number[]
  /** Only for scales that differ coming down. Melodic minor is the one that does. */
  descending?: readonly number[]
  /** One line, written for a caption rather than for a textbook. */
  blurb: string
}

function define(
  id: ScaleId,
  name: string,
  steps: readonly number[],
  letters: readonly number[],
  blurb: string,
  descending?: readonly number[],
): ScaleDefinition {
  return { id, name, steps, letters, blurb, descending }
}

const SEVEN = [0, 1, 2, 3, 4, 5, 6] as const

export const SCALES: Record<ScaleId, ScaleDefinition> = {
  major: define(
    'major',
    'major',
    [0, 2, 4, 5, 7, 9, 11],
    SEVEN,
    'Seven notes with the two small gaps in a particular place. The default sound of most music you know.',
  ),
  'natural-minor': define(
    'natural-minor',
    'natural minor',
    [0, 2, 3, 5, 7, 8, 10],
    SEVEN,
    'The same seven notes as a major scale somewhere else — started from a different home.',
  ),
  'harmonic-minor': define(
    'harmonic-minor',
    'harmonic minor',
    [0, 2, 3, 5, 7, 8, 11],
    SEVEN,
    'Minor with the seventh raised, so the chord before home pulls properly.',
  ),
  'melodic-minor': define(
    'melodic-minor',
    'melodic minor',
    [0, 2, 3, 5, 7, 9, 11],
    SEVEN,
    'Minor with the top two raised on the way up, and dropped again on the way down.',
    [0, 2, 3, 5, 7, 8, 10],
  ),

  // The modes. Same seven notes as a major scale, started from each degree in turn — which
  // is exactly what the rotating-ring lesson demonstrates, and why these are defined as
  // rotations rather than as seven unrelated formulas to memorise.
  ionian: define('ionian', 'Ionian', [0, 2, 4, 5, 7, 9, 11], SEVEN, 'The major scale, under its mode name.'),
  dorian: define(
    'dorian',
    'Dorian',
    [0, 2, 3, 5, 7, 9, 10],
    SEVEN,
    'Minor, but with a raised sixth that stops it sounding sad. The funk and house mode.',
  ),
  phrygian: define(
    'phrygian',
    'Phrygian',
    [0, 1, 3, 5, 7, 8, 10],
    SEVEN,
    'Minor with the second flattened. Dark, and unmistakably Spanish.',
  ),
  lydian: define(
    'lydian',
    'Lydian',
    [0, 2, 4, 6, 7, 9, 11],
    SEVEN,
    'Major with the fourth raised. The sound of wonder, and of film scores.',
  ),
  mixolydian: define(
    'mixolydian',
    'Mixolydian',
    [0, 2, 4, 5, 7, 9, 10],
    SEVEN,
    'Major with a flattened seventh. Where rock goes when it stops being polite.',
  ),
  aeolian: define(
    'aeolian',
    'Aeolian',
    [0, 2, 3, 5, 7, 8, 10],
    SEVEN,
    'The natural minor scale, under its mode name.',
  ),
  locrian: define(
    'locrian',
    'Locrian',
    [0, 1, 3, 5, 6, 8, 10],
    SEVEN,
    'The one with no stable fifth. It never really settles, which is the point.',
  ),

  // Five notes over seven letters: the fourth and seventh degrees are simply absent, so the
  // letter offsets skip 3 and 6.
  'major-pentatonic': define(
    'major-pentatonic',
    'major pentatonic',
    [0, 2, 4, 7, 9],
    [0, 1, 2, 4, 5],
    'The major scale with its two awkward notes removed. Nothing left to play wrong.',
  ),
  'minor-pentatonic': define(
    'minor-pentatonic',
    'minor pentatonic',
    [0, 3, 5, 7, 10],
    [0, 2, 3, 4, 6],
    'Five notes, and most of the guitar solos ever played.',
  ),
  // Six notes, five letters. The blue note is spelled as a FLATTENED FIFTH, which puts it on
  // the same letter as the fifth it sits beside — G♭ and G♮ in C. Spelling it as a sharp
  // fourth is equally common in print, but ♭5 is what the lesson says out loud, and the
  // adjacency is the thing being taught.
  blues: define(
    'blues',
    'blues',
    [0, 3, 5, 6, 7, 10],
    [0, 2, 3, 4, 4, 6],
    'Minor pentatonic with one extra note squeezed in. That note is the entire genre.',
  ),

  'whole-tone': define(
    'whole-tone',
    'whole tone',
    [0, 2, 4, 6, 8, 10],
    [0, 1, 2, 3, 4, 5],
    'Every gap the same size. No pull anywhere, so it floats.',
  ),
  chromatic: define(
    'chromatic',
    'chromatic',
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6],
    'Every note there is. Twelve doors, all in a row.',
  ),
}

export const SCALE_IDS = Object.keys(SCALES) as ScaleId[]

export function scaleDefinition(id: ScaleId): ScaleDefinition {
  return SCALES[id]
}

/** How many notes the scale has. Not always seven — see the top of this file. */
export function scaleLength(id: ScaleId): number {
  return SCALES[id].steps.length
}

/**
 * Spell a scale from a root.
 *
 * The letter comes from the definition and the alteration is whatever is left over to reach
 * the required semitone — so B flat major spells its fourth as E flat, never as D sharp, and
 * a lesson can print the notes without them looking like a typo.
 */
export function scaleNotes(root: Spelled, id: ScaleId, descending = false): Spelled[] {
  const definition = SCALES[id]
  const steps = descending && definition.descending ? definition.descending : definition.steps
  const rootMidi = midiOf(root)
  const rootLetter = letterIndex(root)

  return steps.map((semitones, degree) => {
    const offset = definition.letters[degree]!
    const absoluteLetter = rootLetter + offset
    const letter = LETTERS[absoluteLetter % 7]!
    const octave = root.octave + Math.floor(absoluteLetter / 7)
    const natural = midiOf({ letter, alter: 0, octave })
    return { letter, alter: rootMidi + semitones - natural, octave }
  })
}

/**
 * The scale as MIDI numbers, for playing.
 *
 * Includes the root again at the top of each octave — a scale you can hear is one that
 * arrives somewhere, and stopping on the seventh sounds like a mistake.
 */
export function scalePitches(rootMidi: number, id: ScaleId, octaves = 1): number[] {
  const { steps } = SCALES[id]
  const pitches: number[] = []
  for (let octave = 0; octave < octaves; octave++) {
    for (const semitones of steps) pitches.push(rootMidi + semitones + 12 * octave)
  }
  pitches.push(rootMidi + 12 * octaves)
  return pitches
}

/** Which degree a note is, 1-based, or null if it is outside the scale. Octave-agnostic. */
export function degreeOf(root: Spelled, id: ScaleId, n: Spelled): number | null {
  const target = (((pitchClassOf(n) - pitchClassOf(root)) % 12) + 12) % 12
  const index = SCALES[id].steps.findIndex((semitones) => semitones % 12 === target)
  return index === -1 ? null : index + 1
}

/** The pitch classes the scale occupies. What a keyboard or a pitch ring lights up. */
export function pitchClassSet(root: Spelled, id: ScaleId): ReadonlySet<PitchClass> {
  const base = pitchClassOf(root)
  return new Set(SCALES[id].steps.map((semitones) => (base + semitones) % 12))
}

export function isInScale(root: Spelled, id: ScaleId, n: Spelled): boolean {
  return degreeOf(root, id, n) !== null
}

/**
 * Rotate a step formula so it starts on a different degree.
 *
 * This is the modes lesson expressed as arithmetic: the notes never change, only which one
 * is called home. Exported because the rotating-ring widget rotates arbitrary scales, not
 * just the major one.
 */
export function rotateSteps(steps: readonly number[], degree: number): number[] {
  const size = steps.length
  const from = ((degree % size) + size) % size
  const origin = steps[from]!
  return steps.map((_, index) => {
    const value = steps[(from + index) % size]!
    // Wrapping into 0..11 is what turns "the note below the new home" into "the note above
    // it, an octave up", which is what makes the rotated formula ascend from zero again.
    return (((value - origin) % 12) + 12) % 12
  })
}

/**
 * Which named scale a step formula is, if any.
 *
 * The inverse of looking a formula up by name, and what lets a rotated scale name itself:
 * rotate the major formula by two and you get Dorian's, so a ring whose home has moved can
 * say what it has become rather than still claiming to be the scale it started as.
 */
export function scaleFromSteps(steps: readonly number[]): ScaleId | null {
  const wanted = [...steps].sort((a, b) => a - b).join(',')
  return (
    SCALE_IDS.find((id) => {
      // Modes share formulas with their parent scale — Ionian IS major — so the first match
      // in declaration order wins, and SCALES lists the plain names before the mode names.
      const candidate = SCALES[id].steps
      return candidate.length === steps.length && [...candidate].sort((a, b) => a - b).join(',') === wanted
    }) ?? null
  )
}

const MODE_ORDER: ScaleId[] = [
  'ionian',
  'dorian',
  'phrygian',
  'lydian',
  'mixolydian',
  'aeolian',
  'locrian',
]

/** The seven modes in scale order, brightest-to-darkest handled by `MODES_BY_BRIGHTNESS`. */
export const MODES: readonly ScaleId[] = MODE_ORDER

/**
 * The modes ordered by how bright they sound, not by which degree they start on.
 *
 * Each step down flattens exactly one more note than the last, which is why the "bright to
 * dark" slider works as a single continuous control rather than as seven unrelated presets.
 */
export const MODES_BY_BRIGHTNESS: readonly ScaleId[] = [
  'lydian',
  'ionian',
  'mixolydian',
  'dorian',
  'aeolian',
  'phrygian',
  'locrian',
]

/** Which mode you get by starting a major scale on its nth degree. 1-based. */
export function modeOnDegree(degree: number): ScaleId {
  return MODE_ORDER[(((degree - 1) % 7) + 7) % 7]!
}
