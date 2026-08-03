// Intervals: the distance between two notes, measured the way musicians measure it.
//
// An interval has two independent parts, and conflating them is the classic bug:
//
//   NUMBER   how many LETTERS it spans, counted inclusively. C to G is a fifth because
//            C-D-E-F-G is five letters. Alterations do not affect it at all.
//   QUALITY  how the semitones compare to the plain diatonic version of that number.
//
// Deriving the number from semitones instead cannot work, because it cannot tell an
// augmented fourth from a diminished fifth — both are six semitones, both are the tritone,
// and they are different intervals that resolve in opposite directions. The blues chapter
// depends on that distinction being real.

import { LETTERS, type Spelled, diatonicIndex, letterIndex, midiOf } from './pitch.js'

export type Quality = 'P' | 'M' | 'm' | 'A' | 'd'

export interface Interval {
  /** Inclusive diatonic size: 1 unison, 3 third, 5 fifth, 8 octave, 9 ninth. */
  number: number
  quality: Quality
  /** 2 for doubly augmented or doubly diminished. Defaults to 1. */
  degree?: number
}

/**
 * Which numbers are "perfect" — unison, fourth, fifth, octave — as opposed to the ones that
 * come in major and minor.
 *
 * This is not an arbitrary convention to memorise: it falls out of the major scale. From the
 * tonic, the 4th and 5th are the only degrees whose interval is the same in the major and
 * the minor scale. Everything else changes, so everything else needs a major/minor label.
 */
export function isPerfectNumber(number: number): boolean {
  const simple = ((number - 1) % 7) + 1
  return simple === 1 || simple === 4 || simple === 5
}

/** Semitones in the plain diatonic version of an interval number: the size it has in a major
 *  scale built on the lower note. */
function baseSemitones(number: number): number {
  const octaves = Math.floor((number - 1) / 7)
  const simple = ((number - 1) % 7) + 1
  const withinOctave = [0, 2, 4, 5, 7, 9, 11][simple - 1]!
  return withinOctave + 12 * octaves
}

/** How far a quality shifts an interval from its diatonic size. */
function qualityOffset(quality: Quality, number: number, degree: number): number {
  switch (quality) {
    case 'P':
    case 'M':
      return 0
    // A minor interval is a major one made a semitone smaller. There is no minor fourth,
    // which is why `interval()` rejects one rather than quietly producing a diminished.
    case 'm':
      return -1
    case 'A':
      return degree
    case 'd':
      // A diminished perfect interval is one semitone below perfect; a diminished major one
      // is TWO below major, because it goes through minor on the way. Getting this wrong
      // makes every diminished seventh chord a semitone too wide.
      return isPerfectNumber(number) ? -degree : -degree - 1
  }
}

export function semitonesOf(i: Interval): number {
  return baseSemitones(i.number) + qualityOffset(i.quality, i.number, i.degree ?? 1)
}

export function isValidInterval(i: Interval): boolean {
  if (!Number.isInteger(i.number) || i.number < 1) return false
  if ((i.degree ?? 1) < 1) return false
  // Perfect numbers have no major or minor; imperfect ones have no perfect.
  if (isPerfectNumber(i.number)) return i.quality !== 'M' && i.quality !== 'm'
  return i.quality !== 'P'
}

const INTERVAL_PATTERN = /^([PMmAd])(\d+)$/

/**
 * Parse shorthand: 'P5', 'm3', 'M7', 'A4', 'd5', 'AA4'.
 *
 * Repeated A or d means doubly augmented / doubly diminished, which is how they are written
 * in analysis and how they turn up in harmonic minor.
 */
export function parseInterval(text: string): Interval | null {
  const trimmed = text.trim()
  const repeated = /^(A+|d+)(\d+)$/.exec(trimmed)
  if (repeated) {
    const [, marks = '', digits = ''] = repeated
    const candidate: Interval = {
      number: Number(digits),
      quality: marks[0] as Quality,
      degree: marks.length,
    }
    return isValidInterval(candidate) ? candidate : null
  }

  const match = INTERVAL_PATTERN.exec(trimmed)
  if (!match) return null
  const [, quality = '', digits = ''] = match
  const candidate: Interval = { number: Number(digits), quality: quality as Quality }
  return isValidInterval(candidate) ? candidate : null
}

/** Like `parseInterval` but throws. For literals written in this codebase. */
export function interval(text: string): Interval {
  const parsed = parseInterval(text)
  if (!parsed) throw new Error(`not an interval: ${text}`)
  return parsed
}

export function intervalShorthand(i: Interval): string {
  const degree = i.degree ?? 1
  const marks = i.quality === 'A' || i.quality === 'd' ? i.quality.repeat(degree) : i.quality
  return `${marks}${i.number}`
}

const ORDINALS = [
  'unison',
  'second',
  'third',
  'fourth',
  'fifth',
  'sixth',
  'seventh',
  'octave',
  'ninth',
  'tenth',
  'eleventh',
  'twelfth',
  'thirteenth',
]

const QUALITY_WORDS: Record<Quality, string> = {
  P: 'perfect',
  M: 'major',
  m: 'minor',
  A: 'augmented',
  d: 'diminished',
}

export function intervalName(i: Interval): string {
  const degree = i.degree ?? 1
  const prefix = degree > 1 ? 'doubly ' : ''
  const ordinal = ORDINALS[i.number - 1] ?? `${i.number}th`
  return `${prefix}${QUALITY_WORDS[i.quality]} ${ordinal}`
}

/**
 * The interval from `a` up to `b`.
 *
 * Both parts are derived independently: the number from the letters, the quality from
 * whatever semitones are left once the number has claimed its share.
 */
export function between(a: Spelled, b: Spelled): Interval {
  const letterSpan = diatonicIndex(b) - diatonicIndex(a)
  const semitoneSpan = midiOf(b) - midiOf(a)

  // Descending intervals are named by their ascending mirror; direction is the caller's to
  // track. `transpose(n, i, true)` is the other half of that.
  const number = Math.abs(letterSpan) + 1
  const size = Math.abs(letterSpan) === letterSpan ? semitoneSpan : -semitoneSpan
  const difference = size - baseSemitones(number)

  if (difference === 0) return { number, quality: isPerfectNumber(number) ? 'P' : 'M' }
  if (difference === -1 && !isPerfectNumber(number)) return { number, quality: 'm' }
  if (difference > 0) return { number, quality: 'A', degree: difference }
  const shortfall = isPerfectNumber(number) ? -difference : -difference - 1
  return { number, quality: 'd', degree: shortfall }
}

/**
 * Move a note by an interval, keeping the spelling honest.
 *
 * The letter moves by the interval's number and the alteration absorbs the difference, so
 * transposing C up a minor third gives E flat rather than D sharp — which is the whole
 * reason this is not `midi + semitones`.
 */
export function transpose(n: Spelled, i: Interval, down = false): Spelled {
  const steps = i.number - 1
  const letterMove = down ? -steps : steps
  const targetLetterIndex = letterIndex(n) + letterMove
  const letter = LETTERS[((targetLetterIndex % 7) + 7) % 7]!
  const octave = n.octave + Math.floor(targetLetterIndex / 7)

  // Whatever the letter move did not account for is the alteration.
  const semitones = down ? -semitonesOf(i) : semitonesOf(i)
  const natural = midiOf({ letter, alter: 0, octave })
  const alter = midiOf(n) + semitones - natural
  return { letter, alter, octave }
}

/**
 * The interval's inversion: what is left of the octave.
 *
 * Numbers sum to 9, and the qualities swap — major with minor, augmented with diminished,
 * perfect with itself. This is why a perfect fourth and a perfect fifth are the same
 * relationship read from opposite ends.
 */
export function invert(i: Interval): Interval {
  const simple = simplify(i)
  const number = 9 - simple.number
  const swapped: Record<Quality, Quality> = { P: 'P', M: 'm', m: 'M', A: 'd', d: 'A' }
  return { number, quality: swapped[simple.quality], degree: simple.degree }
}

/** Reduce a compound interval to within an octave: a major ninth becomes a major second. */
export function simplify(i: Interval): Interval {
  if (i.number <= 8) return i
  const simple = ((i.number - 1) % 7) + 1
  return { ...i, number: simple }
}

/** Whether the two notes are the same sound, regardless of how they are written. */
export function isEnharmonicUnison(i: Interval): boolean {
  return semitonesOf(i) % 12 === 0
}

/**
 * The intervals a beginner meets, in order, with the word lessons use for them.
 *
 * Chapter 2 sorts these by feel rather than by name, so the description is the pedagogical
 * payload and the shorthand is just the key.
 */
export const COMMON_INTERVALS: readonly { shorthand: string; blurb: string }[] = [
  { shorthand: 'P1', blurb: 'The same note twice. Nothing to hear but thickness.' },
  { shorthand: 'm2', blurb: 'The tightest gap there is. Restless, and used for tension.' },
  { shorthand: 'M2', blurb: 'One step. How most melodies move.' },
  { shorthand: 'm3', blurb: 'The sad third. Half the reason minor sounds minor.' },
  { shorthand: 'M3', blurb: 'The bright third. Half the reason major sounds major.' },
  { shorthand: 'P4', blurb: 'Open and slightly unsettled — it wants to go somewhere.' },
  { shorthand: 'A4', blurb: 'The tritone. Awkward on purpose, and the blues loves it.' },
  { shorthand: 'P5', blurb: 'Hollow and stable. Take the third away and this is left.' },
  { shorthand: 'm6', blurb: 'Yearning. A minor third turned upside down.' },
  { shorthand: 'M6', blurb: 'Warm and open.' },
  { shorthand: 'm7', blurb: 'The gap that makes a chord sound like it is going somewhere.' },
  { shorthand: 'M7', blurb: 'A semitone short of home. Dreamy, and a little tense.' },
  { shorthand: 'P8', blurb: 'The same note, bigger. Double the frequency.' },
]
