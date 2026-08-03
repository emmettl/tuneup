// The guitar neck, as arithmetic.
//
// A fretboard is the same twelve notes as a keyboard laid out on a grid instead of a line,
// and that difference is the whole reason guitarists think about music the way they do. On a
// keyboard a scale is a pattern of gaps that changes shape in every key; on a neck it is a
// SHAPE, and moving it up two frets transposes it with no rethinking at all.
//
// Nothing here is guitar-specific beyond the tunings — it is scale.ts read through a grid.

import { type ScaleId, pitchClassSet } from './scale.js'
import { type Spelled, pitchClassOf } from './pitch.js'

export interface Tuning {
  id: string
  name: string
  /** Open-string notes as MIDI, LOW string first — the order they sit on the neck when you
   *  look down at it, which is how every diagram is drawn. */
  strings: number[]
}

export const TUNINGS: Record<'guitar' | 'drop-d' | 'bass' | 'ukulele', Tuning> = {
  // E2 A2 D3 G3 B3 E4. The irregular gap between the third and second strings — a major third
  // where every other pair is a fourth — is why guitar shapes break across that boundary, and
  // it is the single most confusing thing about the instrument.
  guitar: { id: 'guitar', name: 'Standard', strings: [40, 45, 50, 55, 59, 64] },
  'drop-d': { id: 'drop-d', name: 'Drop D', strings: [38, 45, 50, 55, 59, 64] },
  bass: { id: 'bass', name: 'Bass', strings: [28, 33, 38, 43] },
  ukulele: { id: 'ukulele', name: 'Ukulele', strings: [67, 60, 64, 69] },
}

/** The note at a string and fret. String 0 is the lowest. */
export function fretMidi(tuning: Tuning, string: number, fret: number): number {
  return (tuning.strings[string] ?? 0) + fret
}

export interface FretPosition {
  string: number
  fret: number
  midi: number
}

/** Everywhere a given note can be played. Guitars have several of each, which is exactly the
 *  thing a keyboard does not have and the thing that makes shapes possible. */
export function positionsOf(tuning: Tuning, midi: number, maxFret = 15): FretPosition[] {
  const found: FretPosition[] = []
  tuning.strings.forEach((open, string) => {
    const fret = midi - open
    if (fret >= 0 && fret <= maxFret) found.push({ string, fret, midi })
  })
  return found
}

export interface FretMark extends FretPosition {
  /** 1-based degree within the scale, or null if the note is outside it. */
  degree: number | null
  root: boolean
}

/**
 * Every position of a scale within a fret range.
 *
 * Returned as a flat list rather than a per-string structure, because that is what a renderer
 * wants and because the interesting relationships on a neck are diagonal.
 */
export function scaleMarks(
  tuning: Tuning,
  root: Spelled,
  scale: ScaleId,
  frets: [number, number],
): FretMark[] {
  const set = pitchClassSet(root, scale)
  const rootClass = pitchClassOf(root)
  const marks: FretMark[] = []

  tuning.strings.forEach((open, string) => {
    for (let fret = frets[0]; fret <= frets[1]; fret++) {
      const midi = open + fret
      const pitchClass = ((midi % 12) + 12) % 12
      if (!set.has(pitchClass)) continue
      marks.push({
        string,
        fret,
        midi,
        degree: degreeIn(set, rootClass, pitchClass),
        root: pitchClass === rootClass,
      })
    }
  })
  return marks
}

function degreeIn(set: ReadonlySet<number>, rootClass: number, pitchClass: number): number | null {
  const ordered = [...set].sort(
    (a, b) => (((a - rootClass) % 12) + 12) % 12 - ((((b - rootClass) % 12) + 12) % 12),
  )
  const index = ordered.indexOf(pitchClass)
  return index === -1 ? null : index + 1
}

/**
 * The fret span of the first pentatonic "box" from a root on the lowest string.
 *
 * Derived rather than hardcoded as a shape. The boxes guitarists memorise are just the scale
 * filtered to a four-fret window; producing them from the scale means they stay correct for
 * any root, any tuning, and the major pentatonic as well as the minor — where a table of
 * remembered dot positions would only ever be right for the one case someone typed in.
 */
export function boxAt(
  tuning: Tuning,
  root: Spelled,
  scale: ScaleId,
  startFret: number,
  span = 4,
): FretMark[] {
  return scaleMarks(tuning, root, scale, [startFret, startFret + span])
}

/** The lowest fret at which the root appears on the lowest string. Where box one begins. */
export function rootFret(tuning: Tuning, root: Spelled): number {
  const open = tuning.strings[0] ?? 40
  const rootClass = pitchClassOf(root)
  const openClass = ((open % 12) + 12) % 12
  return (((rootClass - openClass) % 12) + 12) % 12
}

/** The dots inlaid on a real neck. Nothing musical — they are how a player finds their place,
 *  and a diagram without them is much harder to read than one with. */
export const INLAY_FRETS = [3, 5, 7, 9, 15, 17, 19, 21]
export const DOUBLE_INLAY_FRETS = [12, 24]
