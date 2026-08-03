// Named chord progressions, written as roman numerals so they work in any key.
//
// A note on how these are described. Several of them are, genuinely, the backbone of an
// enormous amount of recorded music, and the obvious way to write the blurb is to list the
// songs. This site does not do that, for two reasons and only one of them is legal:
//
//   1. Naming a song sets an expectation that pressing play produces that song. It cannot —
//      everything here is synthesised from scratch and no recording or melody is reproduced.
//      A learner who presses play expecting a tune they know and gets four chords will read
//      it as a bug, not as a lesson.
//   2. Progressions themselves are not practically protectable, but melodies are, and the
//      distance between "here is the four-chord loop" and "here is that song" is one careless
//      example away.
//
// So the blurbs describe FUNCTION AND FEEL. "The four chords behind a great many pop
// choruses" is more useful to a beginner than a list of titles anyway, because it says what
// the progression does rather than where they have heard it.

import { type ChordSpec } from './chord.js'
import { type Key } from './key.js'
import { roman, romanToChord } from './roman.js'

export type Feel = 'straight' | 'shuffle' | 'four-floor' | 'ballad'
export type Genre = 'foundational' | 'pop' | 'blues' | 'rock' | 'jazz' | 'electronica'

export interface Progression {
  id: string
  name: string
  /** One sentence, for a caption. Function and feel, never song titles. */
  blurb: string
  numerals: string[]
  /** Bars per chord. Defaults to one each — given explicitly only where it differs, which
   *  is what makes the twelve-bar forms readable as data. */
  bars?: number[]
  feel: Feel
  tags: Genre[]
}

/**
 * The twelve-bar blues, in its three commonest shapes.
 *
 * A form rather than a progression: twelve bars of I, IV and V in a fixed pattern, which is
 * public-domain idiom many decades older than recorded music. The variants are what chapter
 * 9 lets the learner discover by dragging chords into empty bars — the app names which shape
 * they have landed on rather than marking them right or wrong.
 */
export function twelveBar(variant: 'basic' | 'quick-change' | 'turnaround' = 'quick-change') {
  switch (variant) {
    case 'basic':
      return ['I7', 'I7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'IV7', 'I7', 'I7']
    case 'quick-change':
      // The IV arrives early, in bar two. Far and away the commonest shape.
      return ['I7', 'IV7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'IV7', 'I7', 'I7']
    case 'turnaround':
      // The last bar goes to V instead of resting on I, so the form pulls round into itself
      // rather than stopping. This is what makes twelve bars loop instead of end.
      return ['I7', 'IV7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'IV7', 'I7', 'V7']
  }
}

export const PROGRESSIONS: readonly Progression[] = [
  {
    id: 'one-four-five',
    name: 'I–IV–V',
    blurb: 'The three chords every key hands you first. Home, away, and the pull back.',
    numerals: ['I', 'IV', 'V', 'I'],
    feel: 'straight',
    tags: ['foundational'],
  },
  {
    id: 'two-five-one',
    name: 'ii–V–I',
    blurb: 'The strongest way home there is. Jazz is largely this, over and over, in every key.',
    numerals: ['ii7', 'V7', 'Imaj7'],
    feel: 'straight',
    tags: ['foundational', 'jazz'],
  },
  {
    id: 'pop-four',
    name: 'I–V–vi–IV',
    blurb: 'The four chords behind a great many pop choruses. Bright, and it never quite settles.',
    numerals: ['I', 'V', 'vi', 'IV'],
    feel: 'straight',
    tags: ['pop'],
  },
  {
    id: 'pop-four-minor-start',
    name: 'vi–IV–I–V',
    blurb: 'The same four chords started on the sad one. Same notes, completely different mood.',
    numerals: ['vi', 'IV', 'I', 'V'],
    feel: 'straight',
    tags: ['pop'],
  },
  {
    id: 'fifties',
    name: 'I–vi–IV–V',
    blurb: 'Doo-wop. Gentle, circular, and impossible to hear as anything but nostalgic.',
    numerals: ['I', 'vi', 'IV', 'V'],
    feel: 'ballad',
    tags: ['pop'],
  },
  {
    id: 'twelve-bar',
    name: '12-bar blues',
    blurb: 'Twelve bars of three chords, all of them sevenths. The form the blues is made of.',
    numerals: twelveBar('quick-change'),
    feel: 'shuffle',
    tags: ['blues'],
  },
  {
    id: 'twelve-bar-basic',
    name: '12-bar blues, plain',
    blurb: 'The same twelve bars without the early move to IV. Slower to leave home.',
    numerals: twelveBar('basic'),
    feel: 'shuffle',
    tags: ['blues'],
  },
  {
    id: 'twelve-bar-turnaround',
    name: '12-bar blues with a turnaround',
    blurb: 'The last bar goes to V, so the form pulls round into itself instead of stopping.',
    numerals: twelveBar('turnaround'),
    feel: 'shuffle',
    tags: ['blues'],
  },
  {
    id: 'minor-blues',
    name: 'Minor blues',
    blurb: 'The same twelve-bar shape in minor. Darker, and it leans harder on the V.',
    numerals: ['i7', 'i7', 'i7', 'i7', 'iv7', 'iv7', 'i7', 'i7', 'V7', 'iv7', 'i7', 'V7'],
    feel: 'shuffle',
    tags: ['blues'],
  },
  {
    id: 'mixolydian-rock',
    name: 'I–♭VII–IV',
    blurb: 'One note borrowed from outside the key, and the whole thing stops sounding polite.',
    numerals: ['I', 'bVII', 'IV', 'I'],
    feel: 'straight',
    tags: ['rock'],
  },
  {
    id: 'andalusian',
    name: 'i–♭VII–♭VI–V',
    blurb: 'A bass line walking downwards, four chords at a time. Dark, and unmistakably Spanish.',
    numerals: ['i', 'bVII', 'bVI', 'V'],
    feel: 'straight',
    tags: ['rock'],
  },
  {
    id: 'minor-loop',
    name: 'i–♭VI–♭VII',
    blurb: 'Three minor-key chords that never resolve. Loop it and it drives forwards forever.',
    numerals: ['i', 'bVI', 'bVII'],
    feel: 'four-floor',
    tags: ['rock', 'electronica'],
  },
  {
    id: 'house-pads',
    name: 'i9–♭VImaj7–♭IIImaj7–♭VII',
    blurb: 'Four rich minor-key pads, held long. Most of deep house lives in this shape.',
    numerals: ['i9', 'bVImaj7', 'bIIImaj7', 'bVII'],
    bars: [2, 2, 2, 2],
    feel: 'four-floor',
    tags: ['electronica'],
  },
  {
    id: 'dorian-vamp',
    name: 'i7–IV7',
    blurb: 'Two chords, forever. The raised sixth is what stops it sounding sad.',
    numerals: ['i7', 'IV7'],
    bars: [2, 2],
    feel: 'four-floor',
    tags: ['electronica'],
  },
  {
    id: 'perfect-cadence',
    name: 'V–I',
    blurb: 'The door closing. The most final-sounding two chords in the language.',
    numerals: ['V', 'I'],
    feel: 'straight',
    tags: ['foundational'],
  },
  {
    id: 'plagal-cadence',
    name: 'IV–I',
    blurb: 'Home by the side door. Settles softly rather than slamming shut.',
    numerals: ['IV', 'I'],
    feel: 'ballad',
    tags: ['foundational'],
  },
  {
    id: 'interrupted-cadence',
    name: 'V–vi',
    blurb: 'Everything set up to land on home, and then it lands somewhere sadder.',
    numerals: ['V', 'vi'],
    feel: 'straight',
    tags: ['foundational'],
  },
  {
    id: 'half-cadence',
    name: 'I–V',
    blurb: 'Stopping on the away chord. Leaves the sentence unfinished on purpose.',
    numerals: ['I', 'V'],
    feel: 'straight',
    tags: ['foundational'],
  },
]

export function progressionById(id: string): Progression | undefined {
  return PROGRESSIONS.find((p) => p.id === id)
}

export function progressionsTagged(tag: Genre): Progression[] {
  return PROGRESSIONS.filter((p) => p.tags.includes(tag))
}

/** The chords of a progression in a key, one entry per numeral. */
export function progressionChords(p: Progression, k: Key): ChordSpec[] {
  return p.numerals.map((numeral) => romanToChord(roman(numeral), k))
}

export interface ProgressionBar {
  chord: ChordSpec
  numeral: string
  /** How many bars this chord is held for. */
  bars: number
  /** Which bar of the whole form this chord starts on, counting from zero. */
  at: number
}

/**
 * The progression laid out in bars, which is what a player and a bar-counter both need.
 *
 * `bars` defaults to one per chord. Given explicitly only where it differs, so the twelve-bar
 * forms stay readable as a list of twelve numerals rather than as three numerals and a
 * separate table of durations to keep in sync with them.
 */
export function progressionBars(p: Progression, k: Key): ProgressionBar[] {
  let at = 0
  return p.numerals.map((numeral, index) => {
    const bars = p.bars?.[index] ?? 1
    const bar: ProgressionBar = { chord: romanToChord(roman(numeral), k), numeral, bars, at }
    at += bars
    return bar
  })
}

/** Total length in bars. */
export function progressionLength(p: Progression): number {
  return p.numerals.reduce((total, _, index) => total + (p.bars?.[index] ?? 1), 0)
}

/** Which chord is sounding in a given bar, wrapping so a loop can ask for any bar number. */
export function chordAtBar(p: Progression, k: Key, bar: number): ProgressionBar {
  const laid = progressionBars(p, k)
  const length = progressionLength(p)
  const wrapped = ((bar % length) + length) % length
  // `at` is ascending, so the last entry that starts at or before the target is the one
  // sounding. Searching from the end avoids an off-by-one at the boundaries.
  for (let index = laid.length - 1; index >= 0; index--) {
    if (laid[index]!.at <= wrapped) return laid[index]!
  }
  return laid[0]!
}

/** Which twelve-bar variant a list of numerals matches, if any. Chapter 9 uses this to tell
 *  the learner what they have built rather than whether it is right. */
export function identifyTwelveBar(numerals: string[]): 'basic' | 'quick-change' | 'turnaround' | null {
  const normalise = (list: string[]) => list.map((n) => n.trim()).join(' ')
  const target = normalise(numerals)
  for (const variant of ['quick-change', 'basic', 'turnaround'] as const) {
    if (normalise(twelveBar(variant)) === target) return variant
  }
  return null
}
