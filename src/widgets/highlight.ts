// What colour a note is drawn in, and why.
//
// Kept out of the component for two reasons. It is shared — the fretboard, the pitch clock and
// the scale strip all colour notes by the same rules, and they must agree or the whole point
// is lost. And a component file that also exports helpers breaks fast refresh, which oxlint's
// `react/only-export-components` rule catches.
//
// The colour grammar itself is fixed site-wide in styles.css: amber is always the root, pink
// always the third, mint always the fifth, violet always the seventh, cyan always a note
// borrowed from outside the key, grey always outside the scale. It is absolute on purpose — a
// learner who picks it up in the chords chapter can read a fretboard six chapters later
// without being told, which is teaching through the design system rather than through prose.

import { type Spelled, pitchClassOf } from '../theory/index.js'

export type ToneRole = 'root' | 'third' | 'fifth' | 'seventh' | 'blue' | 'scale' | 'outside'

export interface Highlight {
  /**
   * Every octave of this pitch class lights.
   *
   * What a scale or chord highlight almost always wants: the learner should see the shape
   * repeat up the keyboard, because that repetition IS the lesson in chapter 1.
   */
  pitchClass?: number
  /** Or one specific note, for the rare case where the octave matters. */
  midi?: number
  tone: ToneRole
  label?: string
}

/** The roles of a triad and a seventh chord, in order. */
export const CHORD_ROLES: readonly ToneRole[] = ['root', 'third', 'fifth', 'seventh']

/**
 * Highlights for a chord's notes, coloured by their position in the stack.
 *
 * Anything past the seventh — ninths, thirteenths — falls back to the plain scale colour
 * rather than inventing a hue, because the fixed grammar has no meaning for those and making
 * one up per widget is how a design system stops being one.
 */
export function chordHighlights(notes: Spelled[]): Highlight[] {
  return notes.map((note, index) => ({
    pitchClass: pitchClassOf(note),
    tone: CHORD_ROLES[index] ?? 'scale',
  }))
}

/** Highlights for an arbitrary set of notes, all in one colour. */
export function notesAs(notes: Spelled[], tone: ToneRole): Highlight[] {
  return notes.map((note) => ({ pitchClass: pitchClassOf(note), tone }))
}

/** One note called out on top of whatever else is showing — the blue note, a leading note,
 *  the one that changed. */
export function callOut(note: Spelled, tone: ToneRole): Highlight {
  return { pitchClass: pitchClassOf(note), tone }
}
