// The scheduler. See timing.ts for why this shape rather than the obvious one.

import { LOOKAHEAD_SECONDS, STEPS_PER_BEAT, TICK_MS, secondsPerStep, stepTime } from './timing.js'

export interface StepEvent {
  /** Steps since the transport started, never wrapping. */
  absolute: number
  /** Position within the current bar. */
  index: number
  /** Bars since the transport started. */
  bar: number
  /** When this step sounds, on the audio clock. Always in the future. */
  time: number
  /** How long one step lasts at the current tempo, so a caller can work out its own
   *  offsets without having to know the tempo. */
  stepSeconds: number
}

export interface Ticker {
  start: (ms: number) => void
  stop: () => void
}

export interface TransportOptions {
  /** The audio clock. Injected rather than reached for, which is what lets the whole
   *  scheduler be tested in Node against a number that a test moves by hand. */
  clock: () => number
  bpm: () => number
  swing?: () => number
  /** Read fresh at each bar boundary, and read for THAT bar — so a form whose sections are
   *  different lengths plays each at its own length rather than all of them at the first
   *  one's. */
  stepsPerBar?: (bar: number) => number
  /**
   * Called at a bar boundary BEFORE `stepsPerBar` is read for the incoming bar.
   *
   * This ordering is what makes bar-quantised swapping work: a queued chord, mode or swing
   * change is committed here, and the incoming bar then reflects it. Every A/B comparison in
   * the curriculum depends on the swap being seamless, so it has to happen at a boundary
   * rather than whenever the learner's finger landed.
   */
  onBar?: (bar: number) => void
  onStep: (event: StepEvent) => void
  /** Injectable for tests. Defaults to the worker ticker below. */
  ticker?: (onTick: () => void) => Ticker
}

// The scheduler's heartbeat, run inside a Worker.
//
// A background tab clamps setInterval to roughly once a second, which is many times longer
// than the lookahead window — so tabbing away would starve the scheduler and the audio would
// drop out in chunks until you came back. Worker timers are not clamped the same way, so the
// beat survives losing focus. The audio thread was never the problem; the thing telling it
// what to play next was.
const TICKER_SOURCE = `
  let id
  onmessage = (e) => {
    if (e.data.start !== undefined) { clearInterval(id); id = setInterval(() => postMessage(0), e.data.start) }
    else { clearInterval(id); id = undefined }
  }
`

export function workerTicker(onTick: () => void): Ticker {
  try {
    const url = URL.createObjectURL(new Blob([TICKER_SOURCE], { type: 'application/javascript' }))
    const worker = new Worker(url)
    URL.revokeObjectURL(url)
    worker.onmessage = onTick
    return {
      start: (ms) => worker.postMessage({ start: ms }),
      stop: () => worker.postMessage({ stop: true }),
    }
  } catch {
    // No Worker, or a policy that blocks blob workers. Foreground playback is identical;
    // only the background robustness is lost, which is the right thing to degrade.
    let id: ReturnType<typeof setInterval> | undefined
    return {
      start: (ms) => {
        clearInterval(id)
        id = setInterval(onTick, ms)
      },
      stop: () => clearInterval(id),
    }
  }
}

export class Transport {
  private readonly options: TransportOptions
  private readonly ticker: Ticker
  private origin = 0
  /** The next step that has NOT yet been scheduled. */
  private nextStep = 0
  private barOfNextStep = 0
  private stepsThisBar = 16
  private stepsIntoBar = 0
  private active = false

  constructor(options: TransportOptions) {
    this.options = options
    this.ticker = (options.ticker ?? workerTicker)(() => this.tick())
  }

  get running(): boolean {
    return this.active
  }

  /**
   * Where the transport is NOW, on the audio clock.
   *
   * Deliberately not "the last step scheduled". The scheduler runs up to a lookahead window
   * ahead of the sound, so highlighting the most recently scheduled step would run the
   * lights ahead of the music by up to 120ms — very visible at slow tempos, and it makes the
   * app feel like it is guessing.
   */
  get position(): { bar: number; index: number; step: number } {
    if (!this.active) return { bar: 0, index: 0, step: 0 }
    const elapsed = this.options.clock() - this.origin
    const step = Math.max(0, Math.floor(elapsed / secondsPerStep(this.options.bpm())))
    const stepsPerBar = this.stepsThisBar || 16
    return { bar: Math.floor(step / stepsPerBar), index: step % stepsPerBar, step }
  }

  start(): void {
    if (this.active) return
    this.active = true
    this.origin = this.options.clock()
    this.nextStep = 0
    this.barOfNextStep = 0
    this.stepsIntoBar = 0
    this.stepsThisBar = this.options.stepsPerBar?.(0) ?? STEPS_PER_BEAT * 4
    this.tick()
    this.ticker.start(TICK_MS)
  }

  stop(): void {
    if (!this.active) return
    this.active = false
    this.ticker.stop()
  }

  dispose(): void {
    this.stop()
  }

  /** Schedule everything that falls inside the lookahead window. Public so a test can drive
   *  it without a timer. */
  tick(): void {
    if (!this.active) return
    const horizon = this.options.clock() + LOOKAHEAD_SECONDS
    const bpm = this.options.bpm()
    const swing = this.options.swing?.() ?? 0

    // Bounded, so a clock that jumps forwards — a resumed context, a machine waking from
    // sleep — cannot spin here scheduling tens of thousands of steps into the past.
    let guard = 0
    while (guard++ < 512) {
      const time = stepTime(this.origin, this.nextStep, bpm, swing)
      if (time >= horizon) break

      if (this.stepsIntoBar === 0) {
        this.options.onBar?.(this.barOfNextStep)
        // Read AFTER onBar, so a change committed at the boundary applies to this bar.
        this.stepsThisBar = this.options.stepsPerBar?.(this.barOfNextStep) ?? this.stepsThisBar
      }

      this.options.onStep({
        absolute: this.nextStep,
        index: this.stepsIntoBar,
        bar: this.barOfNextStep,
        time,
        stepSeconds: secondsPerStep(bpm),
      })

      this.nextStep++
      this.stepsIntoBar++
      if (this.stepsIntoBar >= this.stepsThisBar) {
        this.stepsIntoBar = 0
        this.barOfNextStep++
      }
    }
  }
}
