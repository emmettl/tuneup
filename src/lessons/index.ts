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
    slug: 'make-a-noise',
    title: 'Make a noise',
    summary: 'Press something. There is no theory in this one at all.',
    unit: 'first',
    minutes: 1,
    load: () => import('./first/MakeANoise.tsx'),
  },
  {
    slug: 'twelve-doors',
    title: 'Twelve doors',
    summary: 'There are only twelve notes. Everything after this is which ones you pick.',
    unit: 'pitch',
    minutes: 4,
    after: ['make-a-noise'],
    load: () => import('./pitch/TwelveDoors.tsx'),
  },
  {
    slug: 'the-same-note-bigger',
    title: 'The same note, bigger',
    summary: 'Why the names run out after twelve and start again.',
    unit: 'pitch',
    minutes: 4,
    after: ['twelve-doors'],
    load: () => import('./pitch/TheSameNoteBigger.tsx'),
  },
  {
    slug: 'sharps-and-flats',
    title: 'Sharps, flats, and two names for one key',
    summary: 'Every black key has at least two names, and which is right depends on context.',
    unit: 'pitch',
    minutes: 4,
    after: ['twelve-doors'],
    load: () => import('./pitch/SharpsAndFlats.tsx'),
  },
  {
    slug: 'counting-steps',
    title: 'Counting steps',
    summary: 'The distance between two notes, measured two different ways on purpose.',
    unit: 'intervals',
    minutes: 5,
    after: ['twelve-doors'],
    load: () => import('./intervals/CountingSteps.tsx'),
  },
  {
    slug: 'flavours',
    title: 'Flavours',
    summary: 'Sort every interval by how it strikes you. There are no wrong answers.',
    unit: 'intervals',
    minutes: 6,
    after: ['counting-steps'],
    load: () => import('./intervals/Flavours.tsx'),
  },
  {
    slug: 'seven-from-twelve',
    title: 'Seven from twelve',
    summary: 'The major scale is a pattern of gaps, not a list of notes.',
    unit: 'major',
    minutes: 5,
    after: ['twelve-doors'],
    load: () => import('./major/SevenFromTwelve.tsx'),
  },
  {
    slug: 'move-the-shape',
    title: 'Move the shape',
    summary: 'Start the same pattern somewhere else and you have changed key.',
    unit: 'major',
    minutes: 5,
    after: ['seven-from-twelve'],
    load: () => import('./major/MoveTheShape.tsx'),
  },
  {
    slug: 'the-dial',
    title: 'The dial',
    summary: 'Twelve keys arranged so each step changes exactly one note.',
    unit: 'major',
    minutes: 6,
    after: ['move-the-shape'],
    load: () => import('./major/TheDial.tsx'),
  },
  {
    slug: 'home',
    title: 'Home',
    summary: 'One note in every key feels like the end. Your ear already knows which.',
    unit: 'major',
    minutes: 5,
    after: ['seven-from-twelve'],
    load: () => import('./major/Home.tsx'),
  },
  {
    slug: 'same-notes-different-home',
    title: 'Same notes, different home',
    summary: 'Move which note counts as home and major becomes minor. Nothing else changes.',
    unit: 'minor-modes',
    minutes: 6,
    after: ['seven-from-twelve'],
    load: () => import('./minor-modes/SameNotesDifferentHome.tsx'),
  },
  {
    slug: 'bright-to-dark',
    title: 'Bright to dark',
    summary: 'The seven modes as one slider, each flattening exactly one more note.',
    unit: 'minor-modes',
    minutes: 6,
    after: ['same-notes-different-home'],
    load: () => import('./minor-modes/BrightToDark.tsx'),
  },
  {
    slug: 'stack-in-thirds',
    title: 'Stack in thirds',
    summary: 'Every other note of the scale. That is where all the chords come from.',
    unit: 'chords',
    minutes: 5,
    after: ['seven-from-twelve'],
    load: () => import('./chords/StackInThirds.tsx'),
  },
  {
    slug: 'the-third-decides',
    title: 'The third decides',
    summary: 'Major or minor is one note moving by one semitone. That is the whole difference.',
    unit: 'chords',
    minutes: 5,
    after: ['stack-in-thirds'],
    load: () => import('./chords/TheThirdDecides.tsx'),
  },
  {
    slug: 'same-chord-different-shape',
    title: 'Same chord, different shape',
    summary: 'Inversions, and why they stop a progression from lurching.',
    unit: 'chords',
    minutes: 5,
    after: ['the-third-decides'],
    load: () => import('./chords/SameChordDifferentShape.tsx'),
  },
  {
    slug: 'add-a-fourth-note',
    title: 'Add a fourth note',
    summary: 'Seventh chords, and the restless one the whole blues is built on.',
    unit: 'chords',
    minutes: 5,
    after: ['the-third-decides'],
    load: () => import('./chords/AddAFourthNote.tsx'),
  },
  {
    slug: 'seven-chords-free',
    title: 'Seven chords, free',
    summary: 'A key hands you seven chords that all work together. Put them in any order.',
    unit: 'harmony',
    minutes: 6,
    after: ['stack-in-thirds'],
    load: () => import('./harmony/SevenChordsFree.tsx'),
  },
  {
    slug: 'roman-numerals',
    title: 'Roman numerals',
    summary: 'Chords by their job rather than their name, so a progression survives changing key.',
    unit: 'harmony',
    minutes: 5,
    after: ['seven-chords-free'],
    load: () => import('./harmony/RomanNumerals.tsx'),
  },
  {
    slug: 'three-jobs',
    title: 'Three jobs',
    summary: 'Seven chords, three families. Swap within a family and it still works.',
    unit: 'harmony',
    minutes: 5,
    after: ['roman-numerals'],
    load: () => import('./harmony/ThreeJobs.tsx'),
  },
  {
    slug: 'landing-and-swerving',
    title: 'Landing, and swerving',
    summary: 'Swap the last chord while it loops and hear the ending change under you.',
    unit: 'harmony',
    minutes: 6,
    after: ['seven-chords-free'],
    load: () => import('./harmony/LandingAndSwerving.tsx'),
  },
  {
    slug: 'pulse',
    title: 'Pulse',
    summary: 'Tap along and the app reads your tempo back to you.',
    unit: 'rhythm',
    minutes: 4,
    after: ['make-a-noise'],
    load: () => import('./rhythm/Pulse.tsx'),
  },
  {
    slug: 'four-on-the-floor',
    title: 'Four on the floor',
    summary: 'Build a dance beat one layer at a time and hear what each one does.',
    unit: 'rhythm',
    minutes: 5,
    after: ['make-a-noise'],
    load: () => import('./rhythm/FourOnTheFloor.tsx'),
  },
  {
    slug: 'splitting-the-beat',
    title: 'Splitting the beat',
    summary: 'Same tempo, finer divisions. Most of what sounds faster is not.',
    unit: 'rhythm',
    minutes: 4,
    after: ['pulse'],
    load: () => import('./rhythm/SplittingTheBeat.tsx'),
  },
  {
    slug: 'off-the-grid',
    title: 'Off the grid',
    summary: 'Push the notes between the beats late and a machine starts to sound like a player.',
    unit: 'rhythm',
    minutes: 5,
    after: ['four-on-the-floor'],
    load: () => import('./rhythm/OffTheGrid.tsx'),
  },
  {
    slug: 'take-two-away',
    title: 'Take two away',
    summary: 'Remove the two awkward notes and you cannot play a wrong one.',
    unit: 'pentatonic',
    minutes: 5,
    after: ['seven-from-twelve'],
    load: () => import('./pentatonic/TakeTwoAway.tsx'),
  },
  {
    slug: 'five-notes-no-wrong-answers',
    title: 'Five notes, no wrong answers',
    summary: 'Improvise over a loop. You genuinely cannot play a wrong note.',
    unit: 'pentatonic',
    minutes: 6,
    after: ['take-two-away'],
    load: () => import('./pentatonic/FiveNotesNoWrongAnswers.tsx'),
  },
  {
    slug: 'the-blue-note',
    title: 'The blue note',
    summary: 'One extra note turns five safe ones into the blues.',
    unit: 'blues',
    minutes: 6,
    after: ['take-two-away'],
    load: () => import('./blues/TheBlueNote.tsx'),
  },
  {
    slug: 'twelve-bars',
    title: 'Twelve bars',
    summary: 'Three chords in a fixed shape that everyone in the room already knows.',
    unit: 'blues',
    minutes: 6,
    after: ['the-blue-note'],
    load: () => import('./blues/TwelveBars.tsx'),
  },
  {
    slug: 'everything-is-a-seventh',
    title: 'Everything is a seventh',
    summary: 'The blues breaks chapter six\u2019s rule on purpose, and it works.',
    unit: 'blues',
    minutes: 5,
    after: ['twelve-bars', 'add-a-fourth-note'],
    load: () => import('./blues/EverythingIsASeventh.tsx'),
  },
  {
    slug: 'shuffle',
    title: 'Shuffle',
    summary: 'The other half of the blues, and it is entirely about where the off-beats land.',
    unit: 'blues',
    minutes: 5,
    after: ['everything-is-a-seventh', 'off-the-grid'],
    load: () => import('./blues/Shuffle.tsx'),
  },
  {
    slug: 'take-the-third-out',
    title: 'Take the third out',
    summary: 'Turn the gain up on a chord, then remove one note and hear rock guitar appear.',
    unit: 'rock',
    minutes: 6,
    after: ['the-third-decides'],
    load: () => import('./rock/TakeTheThirdOut.tsx'),
  },
  {
    slug: 'borrowed-chords',
    title: "Rock's favourite outsider",
    summary: 'One chord from outside the key, and it stops sounding polite.',
    unit: 'rock',
    minutes: 5,
    after: ['take-the-third-out'],
    load: () => import('./rock/BorrowedChords.tsx'),
  },
  {
    slug: 'the-sound-is-the-idea',
    title: 'The sound is the idea',
    summary: 'One note, four instruments. In electronic music the timbre often is the tune.',
    unit: 'electronica',
    minutes: 6,
    after: ['four-on-the-floor'],
    load: () => import('./electronica/TheSoundIsTheIdea.tsx'),
  },
  {
    slug: 'minor-modal-and-four-chords',
    title: 'Minor, modal, and only four chords',
    summary: 'Harmony with no gravity, so the track can circle instead of arriving.',
    unit: 'electronica',
    minutes: 6,
    after: ['the-sound-is-the-idea'],
    load: () => import('./electronica/MinorModalAndFourChords.tsx'),
  },
  {
    slug: 'repetition-is-the-structure',
    title: 'Repetition is the structure',
    summary: 'One bar for five minutes. The layers are what move.',
    unit: 'electronica',
    minutes: 5,
    after: ['four-on-the-floor'],
    load: () => import('./electronica/RepetitionIsTheStructure.tsx'),
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
