// A step pattern, as data and pure operations.
//
// Split from the component for the usual reason: this is the half a test can reach. Toggling
// a step is trivial; shifting a pattern round, resizing it without losing what was in it, and
// the euclidean fill are not, and all three are easy to get subtly wrong in ways that only
// show up as a groove that limps.

export interface Lane {
  /** Stable id — a drum name, or a scale degree. */
  id: string
  label: string
  /** Steps that are on. */
  steps: boolean[]
  /** 0..1 per step; undefined means full. Lets a hi-hat pattern breathe. */
  velocity?: number[]
}

export type Pattern = Lane[]

export function emptyLane(id: string, label: string, length: number): Lane {
  return { id, label, steps: new Array(length).fill(false) }
}

export function lengthOf(pattern: Pattern): number {
  return pattern[0]?.steps.length ?? 0
}

/** Toggle one step, returning a new pattern. */
export function toggleStep(pattern: Pattern, laneId: string, index: number): Pattern {
  return pattern.map((lane) => {
    if (lane.id !== laneId) return lane
    const steps = [...lane.steps]
    steps[index] = !steps[index]
    return { ...lane, steps }
  })
}

export function setStep(pattern: Pattern, laneId: string, index: number, on: boolean): Pattern {
  return pattern.map((lane) =>
    lane.id === laneId
      ? { ...lane, steps: lane.steps.map((value, i) => (i === index ? on : value)) }
      : lane,
  )
}

export function clearLane(pattern: Pattern, laneId: string): Pattern {
  return pattern.map((lane) =>
    lane.id === laneId ? { ...lane, steps: lane.steps.map(() => false) } : lane,
  )
}

export function clearAll(pattern: Pattern): Pattern {
  return pattern.map((lane) => ({ ...lane, steps: lane.steps.map(() => false) }))
}

/**
 * Rotate a lane's steps, wrapping.
 *
 * Positive moves later. Wrapping rather than dropping is what makes this a musical operation:
 * shifting a four-on-the-floor kick by one should give you the offbeat, not three kicks and a
 * hole where the fourth used to be.
 */
export function shiftLane(pattern: Pattern, laneId: string, by: number): Pattern {
  return pattern.map((lane) => {
    if (lane.id !== laneId) return lane
    const size = lane.steps.length
    if (size === 0) return lane
    const steps = lane.steps.map((_, index) => {
      const source = ((index - by) % size + size) % size
      return lane.steps[source]!
    })
    return { ...lane, steps }
  })
}

/**
 * Change the resolution of a pattern, keeping what is already in it.
 *
 * Doubling spreads the existing hits out rather than repeating them, and halving keeps the
 * ones that survive — so switching from eighths to sixteenths mid-lesson feels like adding
 * detail rather than being handed a different pattern.
 */
export function resize(pattern: Pattern, length: number): Pattern {
  return pattern.map((lane) => {
    const from = lane.steps.length
    if (from === length || from === 0) return { ...lane, steps: lane.steps.slice(0, length) }
    const steps = new Array(length).fill(false)
    lane.steps.forEach((on, index) => {
      if (!on) return
      const moved = Math.round((index / from) * length)
      if (moved < length) steps[moved] = true
    })
    return { ...lane, steps }
  })
}

/** Which lanes fire on a given step. What the scheduler asks, once per step. */
export function hitsAt(pattern: Pattern, index: number): { id: string; velocity: number }[] {
  const hits: { id: string; velocity: number }[] = []
  for (const lane of pattern) {
    const wrapped = ((index % lane.steps.length) + lane.steps.length) % lane.steps.length
    if (!lane.steps[wrapped]) continue
    hits.push({ id: lane.id, velocity: lane.velocity?.[wrapped] ?? 1 })
  }
  return hits
}

/** Whether anything at all is on. Used to keep a lesson from starting a silent loop. */
export function isEmpty(pattern: Pattern): boolean {
  return pattern.every((lane) => lane.steps.every((on) => !on))
}

export function countHits(pattern: Pattern): number {
  return pattern.reduce((total, lane) => total + lane.steps.filter(Boolean).length, 0)
}

/** Build a lane from step indices — how the grooves below are written. */
export function laneFrom(
  id: string,
  label: string,
  length: number,
  on: number[],
  velocity?: Record<number, number>,
): Lane {
  const steps = new Array(length).fill(false)
  for (const index of on) if (index < length) steps[index] = true
  if (!velocity) return { id, label, steps }
  return {
    id,
    label,
    steps,
    velocity: Array.from({ length }, (_, index) => velocity[index] ?? 1),
  }
}
