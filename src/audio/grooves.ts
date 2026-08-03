// Grooves, as data.
//
// Not emulations of any particular record — these exist so a lesson can put a harmonic idea
// over a beat that suits it, and so the rhythm chapter has something concrete to take apart.
// Sixteen steps to a bar throughout, so the sequencer's grid and the transport agree without
// anyone converting between them.

import { laneFrom, type Pattern } from '../widgets/step-grid.js'

export type GrooveId = 'four-floor' | 'rock' | 'shuffle' | 'boom-bap' | 'ballad' | 'none'

export interface Groove {
  id: GrooveId
  name: string
  blurb: string
  bpm: number
  /** 0 is dead straight; about 0.67 puts the off-beats on triplets — the shuffle. */
  swing: number
  pattern: Pattern
}

const S = 16

export const GROOVES: Record<GrooveId, Groove> = {
  none: {
    id: 'none',
    name: 'No drums',
    blurb: 'Just the chords.',
    bpm: 92,
    swing: 0,
    pattern: [],
  },
  'four-floor': {
    id: 'four-floor',
    name: 'Four on the floor',
    blurb: 'A kick on every beat and hats between them. The engine of dance music.',
    bpm: 124,
    swing: 0,
    pattern: [
      laneFrom('kick', 'Kick', S, [0, 4, 8, 12]),
      laneFrom('clap', 'Clap', S, [4, 12]),
      // Offbeat open hats — the thing that makes house breathe rather than march.
      laneFrom('openhat', 'Open hat', S, [2, 6, 10, 14]),
    ],
  },
  rock: {
    id: 'rock',
    name: 'Straight rock',
    blurb: 'Kick, snare, and eighths on the hat. The default beat of most of the last century.',
    bpm: 104,
    swing: 0,
    pattern: [
      laneFrom('kick', 'Kick', S, [0, 6, 8, 14]),
      laneFrom('snare', 'Snare', S, [4, 12]),
      laneFrom('hat', 'Hi-hat', S, [0, 2, 4, 6, 8, 10, 12, 14], { 0: 0.8, 4: 0.8, 8: 0.8, 12: 0.8 }),
    ],
  },
  shuffle: {
    id: 'shuffle',
    name: 'Blues shuffle',
    blurb: 'The same beat with the off-beats pushed late. Half of what makes it the blues.',
    bpm: 88,
    swing: 0.66,
    pattern: [
      laneFrom('kick', 'Kick', S, [0, 8]),
      laneFrom('snare', 'Snare', S, [4, 12]),
      laneFrom('ride', 'Ride', S, [0, 3, 4, 7, 8, 11, 12, 15], { 3: 0.5, 7: 0.5, 11: 0.5, 15: 0.5 }),
    ],
  },
  'boom-bap': {
    id: 'boom-bap',
    name: 'Boom bap',
    blurb: 'Sparse and behind the beat. Space is the instrument.',
    bpm: 86,
    swing: 0.3,
    pattern: [
      laneFrom('kick', 'Kick', S, [0, 7, 10]),
      laneFrom('snare', 'Snare', S, [4, 12]),
      laneFrom('hat', 'Hi-hat', S, [2, 6, 10, 14], { 2: 0.5, 6: 0.5, 10: 0.5, 14: 0.5 }),
    ],
  },
  ballad: {
    id: 'ballad',
    name: 'Ballad',
    blurb: 'Slow, with the rim instead of a snare. Stays out of the way.',
    bpm: 72,
    swing: 0,
    pattern: [
      laneFrom('kick', 'Kick', S, [0, 8]),
      laneFrom('rim', 'Rim', S, [4, 12]),
      laneFrom('hat', 'Hi-hat', S, [0, 4, 8, 12], { 0: 0.4, 4: 0.4, 8: 0.4, 12: 0.4 }),
    ],
  },
}

export const GROOVE_IDS = Object.keys(GROOVES) as GrooveId[]
