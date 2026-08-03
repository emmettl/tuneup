// Voicing: which octave each note of a chord actually gets played in.
//
// This is the difference between a website playing chords and a musician playing chords, and
// it is entirely invisible in the theory. C major to F major, both in root position from the
// same octave, jumps every finger upwards and then the next chord jumps back — it sounds
// like a machine reading a list, because that is what it is.
//
// A player keeps the notes that are shared and moves the rest as little as possible. C E G to
// F A C keeps the C exactly where it was and shifts the other two up by one and two
// semitones. Same chords, same order, and it suddenly sounds intentional.
//
// Everything here is pure arithmetic on MIDI numbers, so it is all testable without making a
// sound — which matters, because "does this sound musical" is otherwise the sort of claim
// that only gets checked by ear once, badly.

import { type ChordSpec, chordSemitones } from './chord.js'
import { midiOf } from './pitch.js'

/** Where chords sit by default: the octave above middle C, which is where a keyboard player's
 *  right hand lands and where these synth voices are clearest. */
export const DEFAULT_CENTRE = 64

/** The lowest and highest a voiced chord may reach. Wide enough for a spread ninth, narrow
 *  enough that nothing disappears into mud or whistle. */
const LOW_LIMIT = 36
const HIGH_LIMIT = 88

function rootMidiNear(spec: ChordSpec, centre: number): number {
  const pitchClass = ((midiOf(spec.root) % 12) + 12) % 12
  // The octave whose root sits closest below the centre.
  const base = Math.floor((centre - pitchClass) / 12) * 12 + pitchClass
  return base
}

/**
 * The chord stacked upwards from a root near `centre`, no inversion.
 *
 * The plain reading of the chord, and the right answer when there is no previous chord to
 * lead from — the first chord of a progression, or a chord played on its own to be examined.
 */
export function closeVoicing(spec: ChordSpec, centre = DEFAULT_CENTRE): number[] {
  const root = rootMidiNear(spec, centre)
  const pitches = chordSemitones(spec.quality).map((semitones) => root + semitones)

  const inversion = spec.inversion ?? 0
  const rotated = [...pitches]
  for (let moved = 0; moved < inversion % pitches.length; moved++) {
    rotated.push(rotated.shift()! + 12)
  }
  return rotated
}

/** Root, third and seventh only — no fifth. What a jazz pianist's left hand plays, and the
 *  clearest way to hear what makes a seventh chord that seventh chord. */
export function shell(spec: ChordSpec, centre = DEFAULT_CENTRE): number[] {
  const full = closeVoicing(spec, centre)
  const semitones = chordSemitones(spec.quality)
  // Index 2 is the fifth in every formula that has four or more notes. Dropping it from a
  // plain triad would leave two notes and no chord, so triads are returned intact.
  if (semitones.length < 4) return full
  return full.filter((_, index) => index !== 2)
}

/** The chord opened out across a wider range, root left in the bass. Used for pads. */
export function spread(spec: ChordSpec, centre = DEFAULT_CENTRE): number[] {
  const close = closeVoicing(spec, centre)
  const [root, ...rest] = close
  if (root === undefined) return close
  return [root - 12, ...rest]
}

/**
 * The candidate octave placements for each note of a chord, near a centre.
 *
 * Three octaves per note is enough: any placement further out than that is worse than some
 * placement inside it for every chord this site plays, and the search cost is exponential in
 * the window.
 */
function candidatesFor(spec: ChordSpec, centre: number): number[][] {
  const root = rootMidiNear(spec, centre)
  return chordSemitones(spec.quality).map((semitones) => {
    const base = root + semitones
    return [base - 12, base, base + 12].filter(
      (midi) => midi >= LOW_LIMIT && midi <= HIGH_LIMIT,
    )
  })
}

/** Total distance from each note of a voicing to whichever previous note is nearest. Zero for
 *  a note that did not have to move at all, which is what "keeps the common tones" means. */
function movementFrom(voicing: number[], previous: number[]): number {
  return voicing.reduce((total, midi) => {
    const nearest = previous.reduce(
      (best, other) => Math.min(best, Math.abs(midi - other)),
      Infinity,
    )
    return total + nearest
  }, 0)
}

/**
 * Voice `spec` so it moves as little as possible from `previous`.
 *
 * Searches every combination of octave placements and scores each by total movement, with a
 * light penalty on width so that two equally smooth answers resolve towards the more compact
 * one — otherwise the search happily returns a chord spread over three octaves because
 * nothing in the movement score objects to it.
 *
 * With no previous chord this is just `closeVoicing`: there is nothing to lead from, and
 * inventing a lead-in from silence produces a first chord in a strange register.
 */
export function voiceLead(
  spec: ChordSpec,
  previous: number[] | null,
  centre = DEFAULT_CENTRE,
): number[] {
  if (!previous || previous.length === 0) return closeVoicing(spec, centre)

  const candidates = candidatesFor(spec, centre)
  let best: number[] | null = null
  let bestScore = Infinity

  const walk = (index: number, chosen: number[]) => {
    if (index === candidates.length) {
      const voicing = [...chosen].sort((a, b) => a - b)
      // Two notes of one chord in the same place is one note, and it makes the chord sound
      // thinner than the one before it for no reason the learner can see.
      if (new Set(voicing).size !== voicing.length) return
      const width = voicing[voicing.length - 1]! - voicing[0]!
      const score = movementFrom(voicing, previous) + width * 0.05
      if (score < bestScore) {
        bestScore = score
        best = voicing
      }
      return
    }
    for (const midi of candidates[index]!) walk(index + 1, [...chosen, midi])
  }
  walk(0, [])

  return best ?? closeVoicing(spec, centre)
}

/**
 * Voice a whole progression, each chord led from the one before.
 *
 * The first chord anchors near `centre` and everything after follows it, so a progression
 * stays in one register instead of drifting up the keyboard — which is what happens if each
 * chord is voiced independently near the centre and the drift is very audible over eight bars.
 */
export function voiceProgression(chords: ChordSpec[], centre = DEFAULT_CENTRE): number[][] {
  const voicings: number[][] = []
  let previous: number[] | null = null
  for (const spec of chords) {
    const voicing = voiceLead(spec, previous, centre)
    voicings.push(voicing)
    previous = voicing
  }
  return voicings
}

/**
 * Per-note time offsets for a strum, in seconds.
 *
 * A chord whose notes all start at exactly the same instant sounds synthetic — no physical
 * instrument can do it. A handful of milliseconds between them is below the threshold where
 * anyone hears separate notes and above the one where it stops sounding like a machine.
 */
export function strumOffsets(count: number, spreadSeconds = 0.012): number[] {
  if (count <= 1) return [0]
  return Array.from({ length: count }, (_, index) => (index * spreadSeconds) / (count - 1))
}

/** How far the voicing moved in total. Exposed so the inversions lesson can SHOW the
 *  difference between block chords and smooth ones as a number, not just claim it. */
export function totalMovement(voicings: number[][]): number {
  let total = 0
  for (let index = 1; index < voicings.length; index++) {
    total += movementFrom(voicings[index]!, voicings[index - 1]!)
  }
  return total
}
