// The AudioContext: one for the whole site, and the browser-unlock problem.
//
// Every rule in here is a specific failure that happens if it is broken.

type StateListener = (state: AudioContextState | 'none') => void

let context: AudioContext | undefined
let unlocked = false
const listeners = new Set<StateListener>()

/**
 * The one AudioContext.
 *
 * Lazily created, and NEVER at module scope. Constructing one at import time makes Chrome
 * log a warning on every load, can leave Safari's permanently suspended, and charges every
 * visitor for an audio graph on a page that may never make a sound.
 *
 * One for the whole site, emphatically. A lesson page has four or five widgets on it; four
 * contexts means four master chains, no shared reverb, four times the CPU, and a hard cap on
 * Safari that a phone will reach.
 */
export function audioContext(): AudioContext {
  if (!context) {
    context = new AudioContext({ latencyHint: 'interactive' })
    context.addEventListener('statechange', () => announce())
  }
  return context
}

/** Whether a context exists yet, without creating one. */
export function contextState(): AudioContextState | 'none' {
  return context?.state ?? 'none'
}

/** Whether a context has been built, without building one. Lets a caller warm the graph only
 *  when doing so is free — see `Player.prepare`. */
export function hasContext(): boolean {
  return context !== undefined
}

export function onStateChange(listener: StateListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function announce(): void {
  const state = contextState()
  for (const listener of listeners) listener(state)
}

/**
 * Unlock audio. Call this FIRST inside a pointerdown or keydown handler.
 *
 * "First" is not a style preference. iOS only counts a user gesture if `resume()` is reached
 * synchronously within the handler — `await` anything beforehand and the gesture is spent,
 * the promise resolves, and the context stays suspended with no error to explain why.
 *
 * There is deliberately NO global "click to enable audio" gate anywhere in this app. Every
 * widget calls this in the same handler that plays the note. A gate is one more click between
 * a learner and their first sound, which is the exact opposite of the product; the unlock
 * gesture is the first lesson, which asks them to press a key.
 */
export function unlock(): Promise<void> {
  const ctx = audioContext()
  const resumed = ctx.state === 'suspended' ? ctx.resume() : Promise.resolve()

  if (!unlocked) {
    unlocked = true
    // Older iOS Safari needs a real source STARTED inside the gesture before it truly
    // unlocks — resuming alone leaves a context that reports "running" and plays silence.
    // One sample of nothing is enough.
    try {
      const buffer = ctx.createBuffer(1, 1, ctx.sampleRate)
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ctx.destination)
      source.start(0)
    } catch {
      // Not fatal anywhere it matters; the resume above is what does the work on every
      // browser that does not need this.
    }
  }

  return resumed
}

/**
 * Suspend when the tab is hidden, and only when nothing is playing.
 *
 * Suspending mid-playback corrupts every already-scheduled time: the clock stops, the times
 * do not, and everything queued fires at once on resume. `isPlaying` is asked rather than
 * assumed for that reason.
 */
export function manageVisibility(isPlaying: () => boolean): () => void {
  const onChange = () => {
    const ctx = context
    if (!ctx) return
    if (document.visibilityState === 'hidden') {
      if (!isPlaying() && ctx.state === 'running') void ctx.suspend()
    } else if (ctx.state === 'suspended' && unlocked) {
      void ctx.resume()
    }
  }
  document.addEventListener('visibilitychange', onChange)
  return () => document.removeEventListener('visibilitychange', onChange)
}

/**
 * Whether this is a device where the hardware silent switch mutes Web Audio.
 *
 * On iOS the ringer switch silences the whole page with no signal to the app — the context
 * reports "running", everything is scheduled correctly, and no sound comes out. It is
 * unfixable in JavaScript, and without a visible hint it produces "the site is broken"
 * reports that nobody can diagnose. So the audio-status pill says so, on iOS only, where the
 * advice is actually actionable.
 */
export function mayBeSilencedByHardwareSwitch(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

/** Tear everything down. Only used by tests and by a hard reset. */
export async function closeAudio(): Promise<void> {
  if (!context) return
  const ctx = context
  context = undefined
  unlocked = false
  await ctx.close()
  announce()
}
