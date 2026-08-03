// What the learner has done, in localStorage.
//
// Hand-rolled rather than zustand's persist middleware: forty lines, an explicit version, and
// a pure `migrate` that a test can call. The middleware's convenience is not worth giving up
// a migration path on the one piece of state a learner would actually be upset to lose — and
// it makes it far too easy to accidentally serialise something live, like an AudioContext.
//
// The rule this file exists to encode: PROGRESS IS ADVISORY. It marks the curriculum list and
// offers a "continue" link. It never gates a lesson, never scores anything, and never tells
// anyone they failed. Someone arriving at the blues from a shared link must be able to play it.

export const PROGRESS_KEY = 'tuneup.progress.v1'

export interface LessonProgress {
  visited: boolean
  /** True once the learner has actually touched a <Try>, rather than scrolled past it. */
  explored: boolean
  /** Check id → answered correctly at least once. */
  checks: Record<string, boolean>
}

export interface Progress {
  version: 1
  lessons: Record<string, LessonProgress>
  /** Slug of the last lesson opened, for "pick up where you left off". */
  last?: string
}

export function emptyProgress(): Progress {
  return { version: 1, lessons: {} }
}

export function emptyLesson(): LessonProgress {
  return { visited: false, explored: false, checks: {} }
}

/**
 * Coerce whatever is in storage into something usable.
 *
 * Pure, and total: it never throws and always returns a valid Progress. Storage can contain
 * anything — a half-written value from a killed tab, something from a future version of the
 * app after the learner used a newer browser profile, or hand-edited nonsense. Throwing here
 * would take out the whole app on load, over data nobody would miss.
 */
export function migrate(raw: unknown): Progress {
  if (!raw || typeof raw !== 'object') return emptyProgress()
  const source = raw as Partial<Progress>
  if (source.version !== 1) return emptyProgress()

  const lessons: Record<string, LessonProgress> = {}
  const entries = source.lessons && typeof source.lessons === 'object' ? source.lessons : {}
  for (const [slug, value] of Object.entries(entries)) {
    if (!value || typeof value !== 'object') continue
    const lesson = value as Partial<LessonProgress>
    const checks: Record<string, boolean> = {}
    if (lesson.checks && typeof lesson.checks === 'object') {
      for (const [id, done] of Object.entries(lesson.checks)) checks[id] = done === true
    }
    lessons[slug] = {
      visited: lesson.visited === true,
      explored: lesson.explored === true,
      checks,
    }
  }

  return {
    version: 1,
    lessons,
    last: typeof source.last === 'string' ? source.last : undefined,
  }
}

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    return migrate(raw ? JSON.parse(raw) : null)
  } catch {
    // Private browsing, a disabled storage setting, or malformed JSON. Losing progress is a
    // minor annoyance; failing to load the site over it is not acceptable.
    return emptyProgress()
  }
}

export function saveProgress(progress: Progress): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
  } catch {
    // Quota or a blocked store. Nothing useful to do, and nothing worth interrupting for.
  }
}

/** Update one lesson's record, returning a new Progress. Pure, so the store can use it. */
export function withLesson(
  progress: Progress,
  slug: string,
  change: (lesson: LessonProgress) => LessonProgress,
): Progress {
  const current = progress.lessons[slug] ?? emptyLesson()
  return { ...progress, lessons: { ...progress.lessons, [slug]: change(current) } }
}

export function markVisited(progress: Progress, slug: string): Progress {
  return { ...withLesson(progress, slug, (l) => ({ ...l, visited: true })), last: slug }
}

export function markExplored(progress: Progress, slug: string): Progress {
  return withLesson(progress, slug, (l) => ({ ...l, explored: true }))
}

export function markCheck(
  progress: Progress,
  slug: string,
  id: string,
  correct: boolean,
): Progress {
  return withLesson(progress, slug, (lesson) => ({
    ...lesson,
    // Once right, stays right. A learner who gets it, then idly clicks a wrong answer to see
    // what it says, has not un-learned it.
    checks: { ...lesson.checks, [id]: correct || lesson.checks[id] === true },
  }))
}

export type LessonStatus = 'untouched' | 'visited' | 'explored' | 'complete'

/**
 * How far through a lesson someone is.
 *
 * `checkIds` comes from the rendered lesson rather than from the registry, because only the
 * component knows what questions it asks. A lesson with no questions is complete once it has
 * been played with — the interaction IS the lesson, and inventing a quiz to gate completion
 * would be exactly the homework feeling this project avoids.
 */
export function statusOf(
  progress: Progress,
  slug: string,
  checkIds: readonly string[] = [],
): LessonStatus {
  const lesson = progress.lessons[slug]
  if (!lesson?.visited) return 'untouched'
  if (!lesson.explored) return 'visited'
  const answered = checkIds.every((id) => lesson.checks[id] === true)
  return answered ? 'complete' : 'explored'
}

/** 0..1 across a set of lessons, for a unit's progress bar. */
export function completion(progress: Progress, slugs: readonly string[]): number {
  if (slugs.length === 0) return 0
  const done = slugs.filter((slug) => {
    const lesson = progress.lessons[slug]
    return lesson?.explored === true
  }).length
  return done / slugs.length
}

export function clearProgress(): void {
  try {
    localStorage.removeItem(PROGRESS_KEY)
  } catch {
    // As above.
  }
}
