// Timing maths, kept pure and separate from anything that makes a noise.
//
// Getting this wrong is the most audible failure a music site can have, and the mistake is
// always the same one: driving the sequence from setInterval and triggering sounds "now".
// JavaScript timers are not accurate to better than a few milliseconds and are starved
// outright by layout, garbage collection or a background tab — so the groove wobbles, and it
// wobbles worst exactly when the page is busy drawing the thing the learner is looking at.
//
// The fix is the standard one, and the whole reason this file exists apart from the audio:
// timers decide only WHEN TO LOOK AHEAD, never when a sound happens. Every note is scheduled
// against the audio clock, ahead of time, at a timestamp computed here. The audio thread then
// plays it sample-accurately whatever the main thread is doing.

/** How far ahead of the audio clock notes are scheduled. Long enough to ride out a stalled
 *  main thread, short enough that changing tempo or chord still feels immediate. */
export const LOOKAHEAD_SECONDS = 0.12

/** How often the scheduler wakes to look ahead. Comfortably more often than the lookahead
 *  window, so a late wake-up still catches everything it should have scheduled. */
export const TICK_MS = 20

/** Sixteenth notes. The grid everything on this site is quantised to. */
export const STEPS_PER_BEAT = 4

export const BEATS_PER_BAR = 4

export function secondsPerBeat(bpm: number): number {
  return 60 / bpm
}

export function secondsPerStep(bpm: number, stepsPerBeat = STEPS_PER_BEAT): number {
  return 60 / bpm / stepsPerBeat
}

export function secondsPerBar(bpm: number, beatsPerBar = BEATS_PER_BAR): number {
  return (60 / bpm) * beatsPerBar
}

/**
 * How late a step lands, in seconds, because of swing.
 *
 * Swing delays the off-beat sixteenths and leaves the on-beats exactly where they were, which
 * is what turns a machine-straight pattern into something with a shuffle. 0 is dead straight;
 * about 0.67 lands the off-beat on a triplet, the classic shuffle; higher gets progressively
 * more lopsided.
 *
 * Clamped so it can never push an off-beat past the step that follows it. Without the clamp a
 * swing over 1 reorders the sixteenths and the pattern plays back scrambled — which sounds
 * like a bug in the sequencer rather than like a lot of swing.
 */
export function swingDelay(step: number, swing: number, stepSeconds: number): number {
  const odd = ((step % 2) + 2) % 2 === 1
  if (!odd) return 0
  return Math.max(0, Math.min(1, swing)) * 0.5 * stepSeconds
}

/**
 * When a step happens on the audio clock, given that step 0 happened at `origin`.
 *
 * Steps count on without wrapping, so this stays exact over a long run instead of drifting by
 * repeatedly adding a step duration to a running total — which accumulates float error and,
 * over a few minutes, is audible as the loop slowly losing sync with itself.
 */
export function stepTime(
  origin: number,
  step: number,
  bpm: number,
  swing = 0,
  stepsPerBeat = STEPS_PER_BEAT,
): number {
  const stepSeconds = secondsPerStep(bpm, stepsPerBeat)
  return origin + step * stepSeconds + swingDelay(step, swing, stepSeconds)
}

/**
 * The same, on a triplet grid.
 *
 * A shuffle blues is genuinely in twelve-eight — three even subdivisions per beat — and it is
 * NOT sixteenths with the swing turned up, however close the two get. Chapter 9 puts them
 * side by side and asks the learner to hear the difference, so both have to exist and be
 * honest rather than one being a fudge of the other.
 */
export function tripletStepTime(origin: number, step: number, bpm: number): number {
  return origin + (step * secondsPerBeat(bpm)) / 3
}

/**
 * A small, deterministic timing offset, in seconds.
 *
 * Deterministic from `seed` rather than random, for two reasons: a test can assert on it, and
 * a loop that humanises differently on every repeat sounds unstable rather than human — a
 * player's timing quirks are consistent within a groove.
 */
export function humanise(step: number, amount: number, stepSeconds: number, seed = 1): number {
  // Short-circuit rather than multiplying by zero: a negative unit times zero is -0, which
  // compares unequal to 0 under Object.is and would make "humanise off means no offset" a
  // surprisingly hard thing to assert.
  if (amount === 0) return 0

  // xorshift on the step and seed. Cheap, and good enough for a few milliseconds of drift.
  let x = (step + 1) * 2654435761 + seed * 40503
  x ^= x << 13
  x ^= x >>> 17
  x ^= x << 5
  const unit = ((x >>> 0) / 0xffffffff) * 2 - 1
  return unit * amount * stepSeconds * 0.1
}

/** Which bar a step falls in, and where in that bar it sits. */
export function positionOf(
  step: number,
  stepsPerBeat = STEPS_PER_BEAT,
  beatsPerBar = BEATS_PER_BAR,
): { bar: number; index: number; beat: number } {
  const stepsPerBar = stepsPerBeat * beatsPerBar
  const bar = Math.floor(step / stepsPerBar)
  const index = ((step % stepsPerBar) + stepsPerBar) % stepsPerBar
  return { bar, index, beat: Math.floor(index / stepsPerBeat) }
}

/** Beats per minute, from the gaps between taps. What the tap-tempo control reads. */
export function tempoFromTaps(times: number[]): number | null {
  if (times.length < 2) return null
  const gaps: number[] = []
  for (let index = 1; index < times.length; index++) {
    gaps.push(times[index]! - times[index - 1]!)
  }
  const mean = gaps.reduce((total, gap) => total + gap, 0) / gaps.length
  if (mean <= 0) return null
  const bpm = 60 / mean
  // Outside this range the learner has either stopped tapping or is double-timing, and
  // showing 12bpm or 900bpm reads as the control being broken.
  if (bpm < 30 || bpm > 300) return null
  return bpm
}
