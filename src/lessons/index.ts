// The curriculum, as data.
//
// Data only — no components in this file. Exporting both from one module breaks React fast
// refresh (oxlint's `react/only-export-components` catches it), and it is the reason every
// registry in this project is a separate file from the things it registers.
//
// Lesson components are lazy imports so each becomes its own chunk. The home page needs none
// of them, and without that the first load is fifty lessons plus every widget they use.

import type { LessonMeta, Unit, UnitId } from './types.js'

export type { LessonMeta, Unit, UnitId }

export const UNITS: Unit[] = [
  { id: 'first', title: 'Start here', blurb: 'One instruction, no theory.' },
  { id: 'pitch', title: 'Pitch and the keyboard', blurb: 'What the notes are and where they live.' },
  { id: 'intervals', title: 'Intervals', blurb: 'The distance between two notes, and how each one feels.' },
  { id: 'major', title: 'The major scale and keys', blurb: 'Seven notes from twelve, and moving the shape.' },
  { id: 'minor-modes', title: 'Minor and modes', blurb: 'Same notes, different home.' },
  { id: 'chords', title: 'Chords', blurb: 'Stacking notes, and what decides the mood.' },
  { id: 'harmony', title: 'Harmony in a key', blurb: 'The chords a key gives you, and what they do.' },
  { id: 'rhythm', title: 'Rhythm', blurb: 'Pulse, subdivision and swing.' },
  { id: 'pentatonic', title: 'Pentatonic', blurb: 'Five notes and no wrong answers.' },
  { id: 'blues', title: 'Blues', blurb: 'Twelve bars, and one note that changes everything.' },
  { id: 'rock', title: 'Blues into rock', blurb: 'Where the third goes, and why.' },
  { id: 'electronica', title: 'Electronica', blurb: 'Loops, timbre and tension.' },
  { id: 'extras', title: 'Extras', blurb: 'Other places these ideas turn up.' },
]

export const LESSONS: LessonMeta[] = [
  {
    slug: 'twelve-doors',
    title: 'Twelve doors',
    summary: 'There are only twelve notes. Everything after this is which ones you pick.',
    unit: 'pitch',
    minutes: 4,
    load: () => import('./pitch/TwelveDoors.tsx'),
  },
  {
    slug: 'the-third-decides',
    title: 'The third decides',
    summary: 'Major or minor is one note moving by one semitone. That is the whole difference.',
    unit: 'chords',
    minutes: 5,
    after: ['twelve-doors'],
    load: () => import('./chords/TheThirdDecides.tsx'),
  },
  {
    slug: 'the-blue-note',
    title: 'The blue note',
    summary: 'One extra note turns five safe ones into the blues.',
    unit: 'blues',
    minutes: 6,
    after: ['twelve-doors'],
    load: () => import('./blues/TheBlueNote.tsx'),
  },
]

export function lessonBySlug(slug: string): LessonMeta | undefined {
  return LESSONS.find((lesson) => lesson.slug === slug)
}

export function lessonsInUnit(unit: UnitId): LessonMeta[] {
  return LESSONS.filter((lesson) => lesson.unit === unit)
}

/** Units that actually have lessons, in curriculum order. What the nav renders — an empty
 *  chapter heading is a promise the site is not yet keeping. */
export function populatedUnits(): Unit[] {
  return UNITS.filter((unit) => lessonsInUnit(unit.id).length > 0)
}

/** Curriculum order: by unit, then by the order lessons are declared within it. */
export function orderedLessons(): LessonMeta[] {
  return UNITS.flatMap((unit) => lessonsInUnit(unit.id))
}

export function nextLesson(slug: string): LessonMeta | undefined {
  const all = orderedLessons()
  const index = all.findIndex((lesson) => lesson.slug === slug)
  return index === -1 ? undefined : all[index + 1]
}

export function previousLesson(slug: string): LessonMeta | undefined {
  const all = orderedLessons()
  const index = all.findIndex((lesson) => lesson.slug === slug)
  return index <= 0 ? undefined : all[index - 1]
}

export function unitById(id: UnitId): Unit | undefined {
  return UNITS.find((unit) => unit.id === id)
}
