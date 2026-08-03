// Which notes are audible right now.
//
// This is the bridge between a scheduler that runs ahead of the sound and a UI that has to
// light up exactly in time with it, and the obvious implementation is wrong in two separate
// ways:
//
//   1. Highlighting when a note is SCHEDULED runs the lights up to a full lookahead window
//      ahead of the music. At 120bpm that is most of a sixteenth; at 60bpm it is glaring, and
//      it makes the app feel like it is guessing rather than listening.
//   2. Pushing every note-on into React state re-renders the tree from an audio callback,
//      dozens of times a bar, competing with the scheduler for the main thread — on the exact
//      widget where a dropped frame is most visible.
//
// So: notes are REGISTERED when scheduled, with the times they will sound, and become ACTIVE
// only when the audio clock reaches them. Nothing here touches React or the DOM; `sample()`
// is called once a frame by whoever is drawing, and reports whether anything changed so the
// caller can skip the work when it has not.
//
// Entirely pure with respect to time — `sample` takes the clock as an argument — so all of it
// is testable in Node with fabricated timestamps, which matters because this is the piece
// most likely to be subtly wrong.

export interface ScheduledNote {
  midi: number
  /** When it starts sounding, on the audio clock. */
  from: number
  /** When it stops. */
  to: number
  track?: string
}

/** How long a note stays in the list after it has finished, before being pruned. Long enough
 *  that a slow frame cannot step over a short note entirely and miss it. */
const KEEP_SECONDS = 1

export class SoundingNotes {
  private scheduled: ScheduledNote[] = []
  private activeSet = new Set<number>()
  private activeNotes: ScheduledNote[] = []
  private revision = 0

  /** Bumped whenever the active set changes. A reader can compare this and bail cheaply. */
  get version(): number {
    return this.revision
  }

  /** Register a note that WILL sound. Called from the scheduler, ahead of time. */
  schedule(note: ScheduledNote): void {
    this.scheduled.push(note)
  }

  /**
   * Update the active set to the audio clock's current time.
   *
   * Returns whether the set changed, so a caller can skip re-rendering when it has not — a
   * held chord then costs one render rather than sixty a second.
   */
  sample(now: number): boolean {
    const nextNotes: ScheduledNote[] = []
    const next = new Set<number>()
    let keep = 0

    for (const note of this.scheduled) {
      // Prune in the same pass rather than in a separate filter: this runs every frame, and
      // a note list that only ever grows is a slow leak in a page a learner may leave open.
      if (note.to + KEEP_SECONDS < now) continue
      this.scheduled[keep++] = note
      if (note.from <= now && now < note.to) {
        next.add(note.midi)
        nextNotes.push(note)
      }
    }
    this.scheduled.length = keep

    if (!sameSet(next, this.activeSet)) {
      this.activeSet = next
      this.activeNotes = nextNotes
      this.revision++
      return true
    }
    // The set is unchanged, but the individual notes may not be — a repeated note at the
    // same pitch is a different ScheduledNote. Keep the list fresh without claiming a change.
    this.activeNotes = nextNotes
    return false
  }

  activeMidi(): ReadonlySet<number> {
    return this.activeSet
  }

  active(): readonly ScheduledNote[] {
    return this.activeNotes
  }

  /** Whether a particular note is sounding. What a keyboard key asks. */
  isSounding(midi: number): boolean {
    return this.activeSet.has(midi)
  }

  /** Everything scheduled but not yet sounding. Used by nothing on the hot path; useful for
   *  a test, and for a debug readout. */
  pending(now: number): readonly ScheduledNote[] {
    return this.scheduled.filter((note) => note.from > now)
  }

  /** Forget everything. Called on stop, so a stopped transport leaves no key lit. */
  clear(): void {
    this.scheduled.length = 0
    if (this.activeSet.size > 0) this.revision++
    this.activeSet = new Set()
    this.activeNotes = []
  }
}

function sameSet(a: ReadonlySet<number>, b: ReadonlySet<number>): boolean {
  if (a.size !== b.size) return false
  for (const value of a) if (!b.has(value)) return false
  return true
}
