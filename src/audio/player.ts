// The one thing every widget talks to.
//
// A singleton, emphatically. Widgets call `player()` rather than taking an engine prop:
// prop-drilling audio through lesson content would make every lesson author think about the
// audio graph, and a lesson page with five widgets would end up with five of everything.

import { audioContext, hasContext, unlock } from './context.js'
import { createMaster, type Master } from './master.js'
import { renderVoice, type VoiceHandle } from './render.js'
import { buildVoice } from './spec.js'
import { SoundingNotes } from './sounding.js'
import { Transport, type StepEvent } from './transport.js'
import { PATCHES, type InstrumentId } from './instruments/keys.js'
import { DrumKit, type DrumId } from './instruments/kit.js'
import { strumOffsets } from '../theory/voicing.js'

export interface PlayOptions {
  instrument?: InstrumentId
  velocity?: number
  /** Seconds. Omitted means the voice decays on its own — right for a struck instrument,
   *  and wrong for a sustained one, which will hold until released. */
  duration?: number
  /** When to play, on the audio clock. Defaults to now. */
  at?: number
}

export interface ChordOptions extends PlayOptions {
  /** Seconds between the lowest and highest note. A chord whose notes all begin at exactly
   *  the same instant is something no physical instrument can do, and it sounds like it. */
  strum?: number
}

type HeldKey = string

export class Player {
  private master: Master | null = null
  private kit: DrumKit | null = null
  private held = new Map<HeldKey, VoiceHandle>()
  private transport: Transport | null = null

  readonly sounding = new SoundingNotes()

  bpm = 100
  swing = 0
  /** The default instrument for anything that does not name one. */
  instrument: InstrumentId = 'rhodes'

  private ensure(): { ctx: AudioContext; master: Master } {
    const ctx = audioContext()
    if (!this.master) {
      this.master = createMaster(ctx)
      this.kit = new DrumKit(ctx, {
        output: this.master.bus,
        send: this.master.send,
        noise: this.master.noise,
      })
    }
    return { ctx, master: this.master }
  }

  get analyser(): AnalyserNode | null {
    return this.master?.analyser ?? null
  }

  /** The dry bus, exposed so the audio-status panel can inject a test tone through the real
   *  master chain. Nothing in the app should route audio by hand — use `play` and friends. */
  get busForTesting(): AudioNode | null {
    return this.master?.bus ?? null
  }

  /**
   * The audio clock.
   *
   * Exposed so a caller can lay out a sequence of chords relative to a single origin. Asking
   * for `currentTime` afresh per chord looks equivalent and is not: each read happens a
   * fraction later, so the gaps drift, and anything scheduled without an explicit `at` plays
   * immediately — which stacks a four-chord progression into one simultaneous crash.
   */
  now(): number {
    return this.ensure().ctx.currentTime
  }

  get running(): boolean {
    return this.transport?.running ?? false
  }

  setVolume(value: number): void {
    this.ensure().master.setVolume(value)
  }

  /**
   * Warm the graph, but only when that is free.
   *
   * A keypress has to sound in well under the ~30ms where a delay stops feeling like an
   * instrument and starts feeling like a website, and building the master chain plus the
   * reverb impulse on the first note costs more than that. So widgets call this on mount.
   *
   * The catch, and the reason for the guard: mounting a widget is NOT a user gesture.
   * Building the context here on a cold page creates a suspended AudioContext for every
   * visitor of every lesson, including the ones who never play a note — which is exactly
   * what context.ts says not to do, and which browsers rightly complain about.
   *
   * So this is a no-op until something has genuinely unlocked audio. The first pointerdown
   * pays the construction cost once; from then on — every later lesson, every remount across
   * a route change — the graph already exists and this warms it for free, which is when the
   * latency actually matters.
   */
  prepare(): void {
    if (!hasContext()) return
    this.ensure()
  }

  /** Play a note. The gesture-unlock call is synchronous and first — see context.ts. */
  play(midi: number, options: PlayOptions = {}): void {
    void unlock()
    const { ctx, master } = this.ensure()
    const at = options.at ?? ctx.currentTime
    const patch = PATCHES[options.instrument ?? this.instrument]
    const plan = buildVoice(patch, midi, options.velocity)

    const handle = renderVoice(ctx, plan, at, {
      output: master.bus,
      send: master.send,
      noise: master.noise,
    })

    const duration = options.duration ?? (plan.sustained ? 0.6 : plan.duration)
    if (plan.sustained || options.duration !== undefined) handle.release(at + duration)

    this.sounding.schedule({ midi, from: at, to: at + duration })
  }

  chord(pitches: number[], options: ChordOptions = {}): void {
    void unlock()
    const { ctx } = this.ensure()
    const at = options.at ?? ctx.currentTime
    const offsets = strumOffsets(pitches.length, options.strum ?? 0.012)
    pitches.forEach((midi, index) => {
      this.play(midi, { ...options, at: at + offsets[index]! })
    })
  }

  /** Play a run of notes in time. Used by every "hear this scale" button. */
  sequence(pitches: number[], options: PlayOptions & { noteSeconds?: number } = {}): void {
    void unlock()
    const { ctx } = this.ensure()
    const at = options.at ?? ctx.currentTime
    const gap = options.noteSeconds ?? 60 / this.bpm / 2
    pitches.forEach((midi, index) => {
      this.play(midi, { ...options, at: at + index * gap, duration: gap * 0.95 })
    })
  }

  /** Start a note and hold it until `release`. What a pressed key does. */
  hold(midi: number, options: PlayOptions = {}): void {
    void unlock()
    const { ctx, master } = this.ensure()
    const instrument = options.instrument ?? this.instrument
    const key = `${instrument}:${midi}`
    if (this.held.has(key)) return

    const at = ctx.currentTime
    const plan = buildVoice(PATCHES[instrument], midi, options.velocity)
    const handle = renderVoice(ctx, plan, at, {
      output: master.bus,
      send: master.send,
      noise: master.noise,
    })
    this.held.set(key, handle)
    // A held note has no known end yet. Registered with a far end and corrected on release,
    // so the key lights immediately rather than after the learner lets go.
    this.sounding.schedule({ midi, from: at, to: at + 3600 })
  }

  release(midi: number, instrument?: InstrumentId): void {
    const key = `${instrument ?? this.instrument}:${midi}`
    const handle = this.held.get(key)
    if (!handle) return
    this.held.delete(key)
    const ctx = audioContext()
    const end = handle.release(ctx.currentTime)
    // Re-register with the real end so the key goes out with the sound rather than an hour
    // later. The registry keys on the pitch, so this supersedes the placeholder.
    this.sounding.schedule({ midi, from: ctx.currentTime, to: end })
    this.trimHeld(midi, end)
  }

  private trimHeld(midi: number, end: number): void {
    // The placeholder note registered by `hold` runs to +3600s. Without trimming it, the key
    // would stay lit for the rest of the session — the set only ever grows.
    for (const note of this.sounding.active()) {
      if (note.midi === midi && note.to > end) note.to = end
    }
  }

  drum(drum: DrumId, options: { at?: number; velocity?: number } = {}): void {
    void unlock()
    const { ctx } = this.ensure()
    this.kit?.hit(drum, options.at ?? ctx.currentTime, options.velocity)
  }

  /**
   * Start the transport.
   *
   * `onStep` is where a caller schedules whatever it wants to hear. Every event arrives with
   * a time in the future, so the caller passes it straight to `play` — nothing on this path
   * ever triggers a sound "now".
   */
  start(onStep: (event: StepEvent) => void, stepsPerBar?: (bar: number) => number,
        onBar?: (bar: number) => void): void {
    void unlock()
    const { ctx } = this.ensure()
    this.stop()
    this.transport = new Transport({
      clock: () => ctx.currentTime,
      bpm: () => this.bpm,
      swing: () => this.swing,
      stepsPerBar,
      onBar,
      onStep,
    })
    this.transport.start()
  }

  stop(): void {
    this.transport?.dispose()
    this.transport = null
    this.sounding.clear()
    this.kit?.allOff()
  }

  /** Every held note off, immediately. Bound to a visible panic control, because a missed
   *  pointer release leaves a note droning and that is the most reported bug in any browser
   *  instrument. */
  allOff(): void {
    for (const [, handle] of this.held) handle.kill()
    this.held.clear()
    this.sounding.clear()
  }

  get position() {
    return this.transport?.position ?? { bar: 0, index: 0, step: 0 }
  }
}

let instance: Player | undefined

/** The one player for the page. Lazily constructed; creates no AudioContext until something
 *  actually asks for a sound. */
export function player(): Player {
  if (!instance) {
    instance = new Player()
    // A handle on the real singleton, in dev only.
    //
    // Not a convenience: importing this module from a console gives a DIFFERENT instance,
    // because Vite serves hot-updated modules under a `?t=` URL and a fresh import resolves
    // to its own copy. Debugging audio through that copy is worse than useless — it reports
    // a healthy context and a silent app, and both are true of different objects.
    if (import.meta.env.DEV) {
      ;(globalThis as { __tuneup?: Player }).__tuneup = instance
    }
  }
  return instance
}
