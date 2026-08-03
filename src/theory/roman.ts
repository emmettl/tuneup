// Roman numerals: chords described by their JOB in a key rather than by their name.
//
// This is the single most useful abstraction in the whole curriculum, and chapter 6 is built
// on making it click. "C F G" only means something if you already know we are in C. "I IV V"
// means the same thing in every key there is — which is why a learner can transpose a
// progression they built and hear it survive intact.
//
// Case carries the quality, as it does in every textbook: uppercase is major, lowercase is
// minor, a ring is diminished and a plus is augmented.

import {
  CHORD_FORMULAS,
  type ChordQuality,
  type ChordSpec,
  diatonicSevenths,
  diatonicTriads,
} from './chord.js'
import { type Key } from './key.js'
import { scaleNotes } from './scale.js'
import { type Spelled, pitchClassOf } from './pitch.js'
import { interval, transpose } from './interval.js'

export interface RomanNumeral {
  /** Scale degree, 1..7. */
  degree: number
  /** Chromatic alteration of the degree itself: -1 for ♭VII, +1 for ♯iv. */
  alter: number
  quality: ChordQuality
  /** 0 root position, 1 first inversion, and so on. */
  inversion: number
  /** For a secondary dominant: the degree it is the dominant OF. V/V has secondaryOf 5. */
  secondaryOf?: number
}

const UPPER = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']
const LOWER = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii']

/** Whether a quality is written with a capital numeral. */
function isUpperCase(quality: ChordQuality): boolean {
  return !(
    quality === 'min' ||
    quality === 'min7' ||
    quality === 'dim' ||
    quality === 'dim7' ||
    quality === 'min7b5' ||
    quality === 'min6' ||
    quality === 'min9' ||
    quality === 'minMaj7'
  )
}

/** The suffix that goes after the numeral, once case has already said major or minor. */
function qualitySuffix(quality: ChordQuality): string {
  switch (quality) {
    case 'maj':
    case 'min':
      return ''
    case 'dim':
      return '°'
    case 'aug':
      return '+'
    case 'dom7':
      return '7'
    case 'maj7':
      return 'maj7'
    case 'min7':
      return '7'
    case 'min7b5':
      return 'ø7'
    case 'dim7':
      return '°7'
    case 'minMaj7':
      return 'maj7'
    case 'maj6':
    case 'min6':
      return '6'
    case 'sus2':
      return 'sus2'
    case 'sus4':
      return 'sus4'
    case 'power':
      return '5'
    case 'add9':
      return 'add9'
    case 'dom9':
    case 'min9':
      return '9'
    case 'maj9':
      return 'maj9'
    case 'dom13':
      return '13'
    case 'dom7s9':
      return '7♯9'
  }
}

// Figured-bass shorthand. '6' is a first-inversion triad and '64' a second — a convention
// worth carrying because it is what every printed analysis uses, even though this site mostly
// shows inversions as slashes elsewhere.
const TRIAD_INVERSIONS = ['', '6', '64']
const SEVENTH_INVERSIONS = ['', '65', '43', '42']

export function romanText(rn: RomanNumeral, options: { unicode?: boolean } = {}): string {
  const unicode = options.unicode ?? true
  const table = isUpperCase(rn.quality) ? UPPER : LOWER
  const numeral = table[rn.degree - 1] ?? String(rn.degree)
  const accidental = rn.alter === 0 ? '' : rn.alter < 0 ? '♭'.repeat(-rn.alter) : '♯'.repeat(rn.alter)

  let suffix = qualitySuffix(rn.quality)
  if (!unicode) suffix = suffix.replace('°', 'dim').replace('ø', 'm7b5').replace('♯', '#')

  const size = CHORD_FORMULAS[rn.quality].intervals.length
  const inversions = size >= 4 ? SEVENTH_INVERSIONS : TRIAD_INVERSIONS
  const figure = inversions[rn.inversion] ?? ''

  const secondary = rn.secondaryOf ? `/${UPPER[rn.secondaryOf - 1] ?? rn.secondaryOf}` : ''
  return `${accidental}${numeral}${suffix}${figure}${secondary}`
}

const NUMERAL_PATTERN =
  /^([b♭#♯]*)(iii|ii|iv|vii|vi|i|v|III|II|IV|VII|VI|I|V)(.*?)(?:\/([iv]+|[IV]+))?$/

const SUFFIX_QUALITY: readonly { text: string; upper: ChordQuality; lower: ChordQuality }[] = [
  { text: 'maj7', upper: 'maj7', lower: 'minMaj7' },
  { text: 'maj9', upper: 'maj9', lower: 'min9' },
  { text: 'add9', upper: 'add9', lower: 'add9' },
  { text: 'sus2', upper: 'sus2', lower: 'sus2' },
  { text: 'sus4', upper: 'sus4', lower: 'sus4' },
  { text: 'm7b5', upper: 'min7b5', lower: 'min7b5' },
  { text: 'ø7', upper: 'min7b5', lower: 'min7b5' },
  { text: 'ø', upper: 'min7b5', lower: 'min7b5' },
  { text: '°7', upper: 'dim7', lower: 'dim7' },
  { text: 'dim7', upper: 'dim7', lower: 'dim7' },
  { text: '°', upper: 'dim', lower: 'dim' },
  { text: 'dim', upper: 'dim', lower: 'dim' },
  { text: '+', upper: 'aug', lower: 'aug' },
  { text: '13', upper: 'dom13', lower: 'dom13' },
  { text: '9', upper: 'dom9', lower: 'min9' },
  { text: '7', upper: 'dom7', lower: 'min7' },
  { text: '6', upper: 'maj6', lower: 'min6' },
  { text: '5', upper: 'power', lower: 'power' },
  { text: '', upper: 'maj', lower: 'min' },
]

const ROMAN_VALUE: Record<string, number> = {
  i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7,
}

/**
 * Parse a roman numeral: 'I', 'ii', 'V7', 'vii°', '♭VII', 'IV6', 'V/V'.
 *
 * Accepts ASCII 'b' and '#' as well as the real glyphs, because lesson data is written by
 * hand and nobody should have to reach for a flat sign to type ♭VII.
 */
export function parseRoman(text: string): RomanNumeral | null {
  const match = NUMERAL_PATTERN.exec(text.trim())
  if (!match) return null
  const [, accidentals = '', numeral = '', rest = '', secondaryText] = match

  const degree = ROMAN_VALUE[numeral.toLowerCase()]
  if (degree === undefined) return null

  let alter = 0
  for (const glyph of accidentals) alter += glyph === 'b' || glyph === '♭' ? -1 : 1

  // The figure, if any, comes off the end before the quality is read — '6' means first
  // inversion after a triad but IS the quality in 'I6'... which is genuinely ambiguous in
  // printed analysis. Resolved here in favour of the inversion reading only when a longer
  // quality has already claimed the rest, because that is the commoner intent in a chord
  // chart, and lesson data can always write the chord out in full instead.
  const upper = numeral === numeral.toUpperCase()
  let suffix = rest
  let inversion = 0
  for (const figure of ['65', '43', '42', '64']) {
    if (suffix.endsWith(figure)) {
      inversion = SEVENTH_INVERSIONS.indexOf(figure)
      if (inversion === -1) inversion = TRIAD_INVERSIONS.indexOf(figure)
      suffix = suffix.slice(0, -figure.length)
      break
    }
  }

  const entry = SUFFIX_QUALITY.find((candidate) => candidate.text === suffix)
  if (!entry) return null

  const rn: RomanNumeral = {
    degree,
    alter,
    quality: upper ? entry.upper : entry.lower,
    inversion,
  }

  if (secondaryText) {
    const of = ROMAN_VALUE[secondaryText.toLowerCase()]
    if (of === undefined) return null
    rn.secondaryOf = of
  }

  return rn
}

/** Like `parseRoman` but throws. For literals written in this codebase. */
export function roman(text: string): RomanNumeral {
  const parsed = parseRoman(text)
  if (!parsed) throw new Error(`not a roman numeral: ${text}`)
  return parsed
}

/**
 * The root a numeral points at, before any chromatic alteration.
 *
 * Reckoned against the MAJOR scale on the tonic, in both modes. This is the convention pop
 * and rock analysis uses, and it is the one that makes ♭VII mean the same pitch whatever the
 * mode: a whole tone below the tonic, always.
 *
 * The alternative — reckoning against the key's own scale — reads ♭VII in A minor as a
 * flattened G, because the natural minor's seventh is already G. That gives G♭, and the
 * Andalusian progression comes out as Am–G♭–F♭–E instead of Am–G–F–E. It was caught by the
 * test for exactly that progression.
 *
 * The cost is that a minor key's own chords carry explicit flats — A minor is
 * i ii° ♭III iv v ♭VI ♭VII — which is both standard notation and more honest: those chords
 * ARE flattened relative to the parallel major, and chapter 4 says so out loud.
 */
function degreeRoot(k: Key, degree: number): Spelled {
  const scale = scaleNotes(k.tonic, 'major')
  return scale[(degree - 1) % scale.length]!
}

/** Turn a numeral into an actual chord in a key. */
export function romanToChord(rn: RomanNumeral, k: Key): ChordSpec {
  let root = degreeRoot(k, rn.degree)

  if (rn.alter !== 0) {
    // ♭VII in C is B flat: the seventh degree lowered, spelled on the same letter. Using a
    // chromatic semitone (A1) rather than a minor second is what keeps the letter.
    const steps = Math.abs(rn.alter)
    for (let step = 0; step < steps; step++) {
      root = transpose(root, interval('A1'), rn.alter < 0)
    }
  }

  if (rn.secondaryOf !== undefined) {
    // V/V is the dominant of the fifth degree: go to that degree, then up a fifth.
    const target = degreeRoot(k, rn.secondaryOf)
    root = transpose(target, interval('P5'))
  }

  return { root, quality: rn.quality, inversion: rn.inversion || undefined }
}

/** Analyse a chord within a key, or null if it is not a degree of that key. */
export function chordToRoman(spec: ChordSpec, k: Key): RomanNumeral | null {
  // Against the major scale on the tonic, matching `degreeRoot`. See the note there.
  const scale = scaleNotes(k.tonic, 'major')
  const rootClass = pitchClassOf(spec.root)

  const exact = scale.findIndex((n) => pitchClassOf(n) === rootClass)
  if (exact !== -1) {
    return { degree: exact + 1, alter: 0, quality: spec.quality, inversion: spec.inversion ?? 0 }
  }

  // Not a scale degree. Try it as an altered one — ♭VII, ♭VI and ♯iv are the borrowed chords
  // the rock and blues chapters need to name.
  for (const alter of [-1, 1]) {
    const found = scale.findIndex(
      (n) => (((pitchClassOf(n) + alter) % 12) + 12) % 12 === rootClass,
    )
    if (found !== -1) {
      return { degree: found + 1, alter, quality: spec.quality, inversion: spec.inversion ?? 0 }
    }
  }
  return null
}

export type HarmonicFunction = 'tonic' | 'subdominant' | 'dominant'

/**
 * The job a degree does.
 *
 * Three families: home, away, and the pull back home. Chapter 6 colour-codes the chord pads
 * by this and shows that swapping a chord for another in the same family leaves the
 * progression working — which is the point of the abstraction.
 */
export function functionOf(degree: number): HarmonicFunction {
  switch (((degree - 1) % 7) + 1) {
    case 1:
    case 3:
    case 6:
      return 'tonic'
    case 2:
    case 4:
      return 'subdominant'
    default:
      return 'dominant'
  }
}

/**
 * The seven chords of a key, as numerals. What the chord-pad row in chapter 6 renders.
 *
 * Derived by analysing the actual diatonic chords rather than by assuming degree n is
 * numeral n — which is only true in major. In minor, degree 3 is ♭III.
 */
export function diatonicNumerals(k: Key, sevenths = false): RomanNumeral[] {
  const chords = sevenths ? diatonicSevenths(k) : diatonicTriads(k)
  return chords.map((spec, index) => {
    const analysed = chordToRoman(spec, k)
    return analysed ?? { degree: index + 1, alter: 0, quality: spec.quality, inversion: 0 }
  })
}

/** Analyse a sequence of chords in a key. Unrecognised chords come back as null rather than
 *  being forced into a numeral that would be a lie. */
export function analyse(chords: ChordSpec[], k: Key): (RomanNumeral | null)[] {
  return chords.map((spec) => chordToRoman(spec, k))
}
