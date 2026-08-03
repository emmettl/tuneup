import type { ComponentType } from 'react'

export type UnitId =
  | 'first'
  | 'pitch'
  | 'intervals'
  | 'major'
  | 'minor-modes'
  | 'chords'
  | 'harmony'
  | 'rhythm'
  | 'pentatonic'
  | 'blues'
  | 'rock'
  | 'electronica'
  | 'extras'

export interface Unit {
  id: UnitId
  title: string
  /** One line for the curriculum list. */
  blurb: string
}

export interface LessonMeta {
  /**
   * URL segment, and the key progress is stored under.
   *
   * Stable forever once shipped. Renaming one breaks every link anyone has shared and
   * silently resets that lesson for everyone who had finished it.
   */
  slug: string
  title: string
  /** One line: what the learner will be able to do. Kept short — it is a list item. */
  summary: string
  unit: UnitId
  minutes: number
  /**
   * Lessons this builds on.
   *
   * Advisory, always. Shown as a chip with a link, never as a lock. Someone arriving at the
   * blues from a shared link must be able to play it — gating is the fastest way to make a
   * learning site feel like homework.
   */
  after?: string[]
  /**
   * Loaded on demand, so each lesson is its own chunk.
   *
   * Without this the initial download is fifty lessons plus every widget any of them uses,
   * to render a home page that needs none of them.
   */
  load: () => Promise<{ default: ComponentType }>
}
