// Chords.
//
// A chord is defined by INTERVALS from its root, not by semitone offsets, for the same reason
// notes are spelled rather than numbered: a diminished seventh is a d7 above the root and a
// major sixth is an M6, and they are the same six-plus-three semitones. Written as intervals
// the spelling falls out for free — C dim7 gets its B double-flat, which is what makes it
// read as a seventh chord rather than as a sixth wearing a disguise.

import {
  type Spelled,
  midiOf,
  noteName,
  parseNote,
  pitchClassOf,
  shiftOctave,
} from './pitch.js'
import { between, interval, intervalShorthand, semitonesOf, transpose } from './interval.js'
import { type Key, keyScale } from './key.js'

export type ChordQuality =
  | 'maj'
  | 'min'
  | 'dim'
  | 'aug'
  | 'sus2'
  | 'sus4'
  | 'power'
  | 'maj7'
  | 'min7'
  | 'dom7'
  | 'min7b5'
  | 'dim7'
  | 'minMaj7'
  | 'maj6'
  | 'min6'
  | 'add9'
  | 'dom9'
  | 'maj9'
  | 'min9'
  | 'dom13'
  | 'dom7s9'

export interface ChordFormula {
  /** Interval shorthand from the root, lowest first. */
  intervals: readonly string[]
  /** What goes after the note name: 'm7', '7', 'maj7', '' for a plain major triad. */
  symbol: string
  /**
   * The same symbol without the typographic glyphs, where it needs one.
   *
   * Given explicitly rather than produced by replacing '°' and 'ø' in `symbol`, because that
   * substitution is order-dependent and gets it wrong: 'ø7' with 'ø' replaced by 'm7b5'
   * comes out as 'm7b57'. A second field cannot be got subtly wrong.
   */
  ascii?: string
  name: string
  /** One line for a caption. */
  blurb: string
}

export const CHORD_FORMULAS: Record<ChordQuality, ChordFormula> = {
  maj: {
    intervals: ['P1', 'M3', 'P5'],
    symbol: '',
    name: 'major',
    blurb: 'The bright one. Three notes, and the middle one is doing the work.',
  },
  min: {
    intervals: ['P1', 'm3', 'P5'],
    symbol: 'm',
    name: 'minor',
    blurb: 'The same chord with the middle note a semitone lower. That is the whole difference.',
  },
  dim: {
    intervals: ['P1', 'm3', 'd5'],
    symbol: '°',
    ascii: 'dim',
    name: 'diminished',
    blurb: 'Both upper notes squeezed down. Unstable, and impatient to move.',
  },
  aug: {
    intervals: ['P1', 'M3', 'A5'],
    symbol: '+',
    name: 'augmented',
    blurb: 'The fifth stretched. Floats, because nothing in it wants to settle.',
  },
  sus2: {
    intervals: ['P1', 'M2', 'P5'],
    symbol: 'sus2',
    name: 'suspended second',
    blurb: 'The third replaced by the note below it. Open, and neither happy nor sad.',
  },
  sus4: {
    intervals: ['P1', 'P4', 'P5'],
    symbol: 'sus4',
    name: 'suspended fourth',
    blurb: 'The third replaced by the note above it. Hangs, waiting to drop back.',
  },
  power: {
    intervals: ['P1', 'P5'],
    symbol: '5',
    name: 'power chord',
    blurb: 'No third at all, so it has no mood. The riff supplies that.',
  },
  maj7: {
    intervals: ['P1', 'M3', 'P5', 'M7'],
    symbol: 'maj7',
    name: 'major seventh',
    blurb: 'A major triad with the note just below the octave added. Dreamy.',
  },
  min7: {
    intervals: ['P1', 'm3', 'P5', 'm7'],
    symbol: 'm7',
    name: 'minor seventh',
    blurb: 'Minor, softened. The default chord of soul, house and almost anything smooth.',
  },
  dom7: {
    intervals: ['P1', 'M3', 'P5', 'm7'],
    symbol: '7',
    name: 'dominant seventh',
    blurb: 'Major with a flattened seventh. Restless — and the blues is built entirely on it.',
  },
  min7b5: {
    intervals: ['P1', 'm3', 'd5', 'm7'],
    symbol: 'ø7',
    ascii: 'm7b5',
    name: 'half-diminished seventh',
    blurb: 'Diminished on the bottom, not quite on top. The seventh chord minor keys end up with.',
  },
  dim7: {
    intervals: ['P1', 'm3', 'd5', 'd7'],
    symbol: '°7',
    ascii: 'dim7',
    name: 'diminished seventh',
    blurb: 'Four notes evenly spaced. Maximum tension, and it can resolve almost anywhere.',
  },
  minMaj7: {
    intervals: ['P1', 'm3', 'P5', 'M7'],
    symbol: 'm(maj7)',
    name: 'minor major seventh',
    blurb: 'Minor triad, major seventh. Unsettling in a way film music likes.',
  },
  maj6: {
    intervals: ['P1', 'M3', 'P5', 'M6'],
    symbol: '6',
    name: 'major sixth',
    blurb: 'Major with a sixth instead of a seventh. Warm, and slightly old-fashioned.',
  },
  min6: {
    intervals: ['P1', 'm3', 'P5', 'M6'],
    symbol: 'm6',
    name: 'minor sixth',
    blurb: 'Minor with a raised sixth on top. Wistful.',
  },
  add9: {
    intervals: ['P1', 'M3', 'P5', 'M9'],
    symbol: 'add9',
    name: 'added ninth',
    blurb: 'A major triad with one extra colour and no seventh. Bright and modern.',
  },
  dom9: {
    intervals: ['P1', 'M3', 'P5', 'm7', 'M9'],
    symbol: '9',
    name: 'dominant ninth',
    blurb: 'A dominant seventh with more on top. Funk lives here.',
  },
  maj9: {
    intervals: ['P1', 'M3', 'P5', 'M7', 'M9'],
    symbol: 'maj9',
    name: 'major ninth',
    blurb: 'The lush one. A major seventh with the ninth stacked above it.',
  },
  min9: {
    intervals: ['P1', 'm3', 'P5', 'm7', 'M9'],
    symbol: 'm9',
    name: 'minor ninth',
    blurb: 'The pad chord. Most of deep house is this, held for four bars.',
  },
  dom13: {
    intervals: ['P1', 'M3', 'P5', 'm7', 'M9', 'M13'],
    symbol: '13',
    name: 'dominant thirteenth',
    blurb: 'A dominant seventh with everything on it.',
  },
  dom7s9: {
    intervals: ['P1', 'M3', 'P5', 'm7', 'A9'],
    symbol: '7♯9',
    ascii: '7#9',
    name: 'dominant seventh sharp nine',
    blurb: 'Major and minor third in the same chord. It should not work, and it is the sound of rock.',
  },
}

export const CHORD_QUALITIES = Object.keys(CHORD_FORMULAS) as ChordQuality[]

export interface ChordSpec {
  root: Spelled
  quality: ChordQuality
  /** 0 root position, 1 first inversion, and so on. */
  inversion?: number
  /** A bass note that is not simply an inversion — the slash in C/F. */
  bass?: Spelled
}

export function chordFormula(quality: ChordQuality): ChordFormula {
  return CHORD_FORMULAS[quality]
}

/** The notes of the chord in root position, spelled. */
export function chordNotes(spec: ChordSpec): Spelled[] {
  return CHORD_FORMULAS[spec.quality].intervals.map((shorthand) =>
    transpose(spec.root, interval(shorthand)),
  )
}

/** Semitones above the root, root position. */
export function chordSemitones(quality: ChordQuality): number[] {
  return CHORD_FORMULAS[quality].intervals.map((shorthand) => semitonesOf(interval(shorthand)))
}

/**
 * The chord as MIDI numbers, with any inversion applied.
 *
 * An inversion moves the lowest notes up an octave one at a time, which is what an inversion
 * physically is on a keyboard — not a re-ordering of an abstract list.
 */
export function chordPitches(spec: ChordSpec, octave = 4): number[] {
  const root = { ...spec.root, octave }
  const rootMidi = midiOf(root)
  const pitches = chordSemitones(spec.quality).map((semitones) => rootMidi + semitones)

  const inversion = ((spec.inversion ?? 0) % pitches.length + pitches.length) % pitches.length
  for (let moved = 0; moved < inversion; moved++) {
    const lowest = pitches.shift()!
    pitches.push(lowest + 12)
  }

  if (spec.bass) {
    // A slash bass sits below everything. Dropped octaves until it does, rather than assumed
    // to be one octave down, so C/B does not end up with the bass above the chord.
    let bassMidi = midiOf({ ...spec.bass, octave })
    while (bassMidi >= pitches[0]!) bassMidi -= 12
    pitches.unshift(bassMidi)
  }

  return pitches
}

export function chordSymbol(spec: ChordSpec, options: { unicode?: boolean } = {}): string {
  const unicode = options.unicode ?? true
  const formula = CHORD_FORMULAS[spec.quality]
  const symbol = unicode ? formula.symbol : (formula.ascii ?? formula.symbol)
  let text = `${noteName(spec.root, { unicode })}${symbol}`

  const bass = spec.bass ?? inversionBass(spec)
  if (bass && pitchClassOf(bass) !== pitchClassOf(spec.root)) {
    text += `/${noteName(bass, { unicode })}`
  }
  return text
}

/** Which note an inversion puts in the bass, or undefined in root position. */
export function inversionBass(spec: ChordSpec): Spelled | undefined {
  const inversion = spec.inversion ?? 0
  if (inversion === 0) return undefined
  const notes = chordNotes(spec)
  return notes[inversion % notes.length]
}

export function chordName(spec: ChordSpec): string {
  return `${noteName(spec.root)} ${CHORD_FORMULAS[spec.quality].name}`
}

// Longest first, so 'maj7' is not matched as 'maj' with a stray 7, and 'm7b5' beats 'm7'.
const SYMBOL_LOOKUP: readonly { text: string; quality: ChordQuality }[] = [
  { text: 'm(maj7)', quality: 'minMaj7' },
  { text: 'mmaj7', quality: 'minMaj7' },
  { text: 'maj9', quality: 'maj9' },
  { text: 'maj7', quality: 'maj7' },
  { text: 'add9', quality: 'add9' },
  { text: 'sus2', quality: 'sus2' },
  { text: 'sus4', quality: 'sus4' },
  { text: 'm7b5', quality: 'min7b5' },
  { text: 'ø7', quality: 'min7b5' },
  { text: 'ø', quality: 'min7b5' },
  { text: 'dim7', quality: 'dim7' },
  { text: '°7', quality: 'dim7' },
  { text: 'dim', quality: 'dim' },
  { text: '°', quality: 'dim' },
  { text: 'aug', quality: 'aug' },
  { text: '7#9', quality: 'dom7s9' },
  { text: '7♯9', quality: 'dom7s9' },
  { text: 'm9', quality: 'min9' },
  { text: 'm7', quality: 'min7' },
  { text: 'm6', quality: 'min6' },
  { text: '13', quality: 'dom13' },
  { text: '+', quality: 'aug' },
  { text: 'm', quality: 'min' },
  { text: '9', quality: 'dom9' },
  { text: '7', quality: 'dom7' },
  { text: '6', quality: 'maj6' },
  { text: '5', quality: 'power' },
  { text: '', quality: 'maj' },
]

/**
 * Parse a chord symbol: 'C', 'Am7', 'F#m7b5', 'Cmaj7/E', 'G7'.
 *
 * Returns null rather than throwing, so a typo in lesson data surfaces as a failing registry
 * test rather than as a crash on the page it appears on.
 */
export function parseChord(text: string): ChordSpec | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  const [body = '', bassText] = trimmed.split('/')
  // Deliberately NOT the accidental class parseNote accepts. That one allows 's' as an alias
  // for sharp, which here would swallow the first letter of 'sus4' and leave 'us4' as the
  // quality — so 'Dsus4' parsed as a D sharp of some unknown kind. Chord symbols only ever
  // use the real accidental characters.
  const rootMatch = /^([A-Ga-g](?:#|♯|b|♭|x|♮)*)(.*)$/u.exec(body)
  if (!rootMatch) return null

  const [, rootText = '', rest = ''] = rootMatch
  const root = parseNote(rootText)
  if (!root) return null

  const entry = SYMBOL_LOOKUP.find((candidate) => candidate.text === rest)
  if (!entry) return null

  const spec: ChordSpec = { root, quality: entry.quality }
  if (bassText !== undefined) {
    const bass = parseNote(bassText)
    if (!bass) return null
    // A bass that is one of the chord's own notes is an inversion, not a slash chord. Saying
    // so keeps chordSymbol from writing 'C/E' and 'C/E' for two different internal states.
    const index = chordNotes(spec).findIndex((n) => pitchClassOf(n) === pitchClassOf(bass))
    if (index > 0) spec.inversion = index
    else if (index === -1) spec.bass = bass
  }
  return spec
}

/** Like `parseChord` but throws. For literals written in this codebase. */
export function chord(text: string): ChordSpec {
  const parsed = parseChord(text)
  if (!parsed) throw new Error(`not a chord: ${text}`)
  return parsed
}

/**
 * Stack thirds on each degree of the key's scale.
 *
 * Built from the scale rather than from a hardcoded maj-min-min-maj-maj-min-dim pattern,
 * because that pattern is only true of the major scale — and chapter 4 needs the minor and
 * modal versions to come out right without a second table to keep in sync.
 */
function stackThirds(scale: Spelled[], degree: number, count: number): Spelled[] {
  const notes: Spelled[] = []
  for (let step = 0; step < count; step++) {
    const index = degree + step * 2
    const wrapped = index % scale.length
    const octaves = Math.floor(index / scale.length)
    notes.push(shiftOctave(scale[wrapped]!, octaves))
  }
  return notes
}

/**
 * Which quality a set of notes spells, or null if it is not a chord this file knows.
 *
 * Matched on interval SHORTHAND rather than on semitones, so a diminished seventh is not
 * mistaken for a major sixth chord — they sound identical and are written differently, and
 * the difference is exactly what roman-numeral analysis needs.
 */
export function qualityOf(notes: Spelled[]): ChordQuality | null {
  if (notes.length < 2) return null
  const root = notes[0]!
  const shorthand = notes.map((n) => intervalShorthand(between(root, n)))
  const found = CHORD_QUALITIES.find((quality) => {
    const formula = CHORD_FORMULAS[quality].intervals
    return formula.length === shorthand.length && formula.every((s, i) => s === shorthand[i])
  })
  return found ?? null
}

function chordOnDegree(scale: Spelled[], degree: number, count: number): ChordSpec | null {
  const notes = stackThirds(scale, degree, count)
  const quality = qualityOf(notes)
  return quality ? { root: notes[0]!, quality } : null
}

/** The seven triads a key gives you for free. */
export function diatonicTriads(k: Key): ChordSpec[] {
  const scale = keyScale(k)
  return scale.map((_, degree) => chordOnDegree(scale, degree, 3)).filter(isChord)
}

/** The same seven, with a fourth note stacked on each. */
export function diatonicSevenths(k: Key): ChordSpec[] {
  const scale = keyScale(k)
  return scale.map((_, degree) => chordOnDegree(scale, degree, 4)).filter(isChord)
}

function isChord(spec: ChordSpec | null): spec is ChordSpec {
  return spec !== null
}

/** Whether every note of the chord belongs to the key. */
export function isDiatonic(spec: ChordSpec, k: Key): boolean {
  const inKey = new Set(keyScale(k).map(pitchClassOf))
  return chordNotes(spec).every((n) => inKey.has(pitchClassOf(n)))
}

export interface ChordMatch {
  spec: ChordSpec
  /** True when the chord's own root is the lowest note played. */
  rootPosition: boolean
}

/**
 * Name a set of sounding pitches.
 *
 * Used by the chord-builder lesson, where the learner assembles notes and the app has to say
 * what they have made. Every rotation is tried as a candidate root, because a first-inversion
 * C major is still C major and calling it E-something would be unhelpful — but root-position
 * readings are ranked first, since that is what the learner most likely meant.
 */
export function identifyChords(pitches: number[]): ChordMatch[] {
  const unique = [...new Set(pitches)].sort((a, b) => a - b)
  if (unique.length < 2) return []
  const lowest = unique[0]!
  const classes = [...new Set(unique.map((midi) => ((midi % 12) + 12) % 12))]

  const matches: ChordMatch[] = []
  for (const rootClass of classes) {
    const offsets = new Set(classes.map((pc) => (((pc - rootClass) % 12) + 12) % 12))
    for (const quality of CHORD_QUALITIES) {
      const formula = new Set(chordSemitones(quality).map((s) => ((s % 12) + 12) % 12))
      if (formula.size !== offsets.size) continue
      if (![...formula].every((s) => offsets.has(s))) continue
      // Spell the root the way the chord's own third suggests: a chord containing a major
      // third reads more naturally with a sharp root in sharp contexts. Without a key to
      // consult, sharps are the safer default and the caller can respell.
      const root = spellRoot(rootClass, lowest)
      matches.push({
        spec: { root, quality },
        rootPosition: ((lowest % 12) + 12) % 12 === rootClass,
      })
    }
  }

  return matches.sort((a, b) => {
    if (a.rootPosition !== b.rootPosition) return a.rootPosition ? -1 : 1
    // Simpler names first: a plain triad beats a four-note reading of the same notes.
    return CHORD_FORMULAS[a.spec.quality].intervals.length -
      CHORD_FORMULAS[b.spec.quality].intervals.length
  })
}

function spellRoot(pitchClass: number, near: number): Spelled {
  const octave = Math.floor(near / 12) - 1
  const table: readonly [string, number][] = [
    ['C', 0], ['C', 1], ['D', 0], ['D', 1], ['E', 0], ['F', 0],
    ['F', 1], ['G', 0], ['G', 1], ['A', 0], ['A', 1], ['B', 0],
  ]
  const entry = table[pitchClass]!
  return { letter: entry[0] as Spelled['letter'], alter: entry[1], octave }
}
