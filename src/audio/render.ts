// The only file that turns a VoicePlan into Web Audio nodes.
//
// Everything above this line is numbers; everything below is a graph. Keeping the boundary
// here is what lets the synthesis be tested without an audio device — see spec.ts.

import { SILENCE, type AdsrSpec, type FilterSpec, type VoicePlan } from './spec.js'

export interface VoiceHandle {
  /** Begin the release. Returns when the voice will actually be silent. */
  release: (at: number) => number
  /** Tear down immediately, whatever the envelope is doing. */
  kill: () => void
}

/**
 * Apply an ADSR to a gain parameter.
 *
 * Two things here are load-bearing and both are easy to get wrong:
 *
 *   `exponentialRampToValueAtTime(0)` is INVALID and throws. Every ramp to silence targets
 *   SILENCE and then hard-sets to zero afterwards. Exponential is used rather than linear
 *   because loudness is perceived logarithmically — a linear fade sounds like it hangs and
 *   then drops off a cliff.
 *
 *   `setValueAtTime` before every ramp. Without it the ramp starts from whatever the
 *   parameter's value happened to be at the last scheduled point, which for a re-struck note
 *   is the middle of the previous note's decay — audible as a note that starts halfway down.
 */
interface EnvelopeResult {
  /** When it falls silent by itself, or Infinity if it holds until released. */
  end: number
  /**
   * The flat level it settles at, or null if it decays to silence on its own.
   *
   * The release needs this. An exponential ramp interpolates from the LAST SCHEDULED EVENT,
   * and a held envelope's last event is the end of its attack — so releasing a note three
   * seconds later produced a ramp running from 6ms to 3.09s, decaying the note across its
   * entire length. The organ measured 0.33 at 0.1s and 0.003 at 2s on a patch that schedules
   * no decay at all. `cancelAndHoldAtTime` does not anchor it, because there is no automation
   * after the release point for it to hold against.
   *
   * So the release anchors the value explicitly, and this is the value.
   */
  holdLevel: number | null
}

function applyEnvelope(param: AudioParam, amp: AdsrSpec, peak: number, at: number): EnvelopeResult {
  const attackEnd = at + amp.attack
  param.cancelScheduledValues(at)
  // The attack is LINEAR and starts at true zero. An exponential ramp cannot start at zero,
  // so it has to start at SILENCE — and an exponential from 1e-4 to full spends almost all of
  // its time near the bottom and then turns a corner, which is an audible tick at the very
  // start of every note. Linear from silence has no corner and no floor to jump up from.
  //
  // Decay and release stay exponential below, where the curve shape is what makes a fade
  // sound natural rather than like it hangs and then drops off a cliff.
  param.setValueAtTime(0, at)
  param.linearRampToValueAtTime(Math.max(SILENCE, peak), attackEnd)

  if (amp.sustain > 0) {
    const level = Math.max(SILENCE, peak * amp.sustain)
    if (amp.decay > 0) param.exponentialRampToValueAtTime(level, attackEnd + amp.decay)
    // Held indefinitely; `release` schedules the tail, anchored at `level`.
    return { end: Infinity, holdLevel: level }
  }

  // Sustain of zero: the note decays away whether or not the key is held. A piano, not an
  // organ. The voice frees itself when the decay finishes.
  const decayEnd = attackEnd + Math.max(amp.decay, 0.01)
  param.exponentialRampToValueAtTime(SILENCE, decayEnd)
  param.setValueAtTime(0, decayEnd)
  return { end: decayEnd, holdLevel: null }
}

/**
 * Begin a release at a scheduled time, fading from wherever the envelope actually is.
 *
 * `param.value` is the WRONG thing to read here, and reading it was a real bug. It reports the
 * parameter's value *now*, not its value at `when` — so releasing a note a tenth of a second
 * in the future read the level at time zero, which is silence, and then `setValueAtTime` slammed
 * the gain from full to 1e-4 in a single sample. Measured as a 0.28 step discontinuity, heard
 * as a click on every note; in a scale, the click landed exactly where the next note started,
 * so it sounded like each note began with a tick.
 *
 * `cancelAndHoldAtTime` is the API for precisely this: it discards later automation but holds
 * whatever value the curve had reached at that instant, so the fade starts from the real level.
 * The fallback path is only reached on browsers without it, where reading `.value` is still
 * wrong but is the best available — and there it is at least correct for an immediate release,
 * which is what `kill` and a pointer-up actually do.
 */
function startRelease(
  param: AudioParam,
  when: number,
  end: number,
  holdLevel: number | null,
): void {
  const holdable = param as AudioParam & { cancelAndHoldAtTime?: (time: number) => void }
  if (typeof holdable.cancelAndHoldAtTime === 'function') {
    holdable.cancelAndHoldAtTime(when)
  } else {
    param.cancelScheduledValues(when)
    param.setValueAtTime(Math.max(SILENCE, param.value), when)
  }
  // Anchor the level the ramp starts from.
  //
  // For a HELD envelope this is essential and cancelAndHoldAtTime is not enough: with no
  // automation scheduled after `when` there is nothing for it to hold against, so the
  // exponential ramp below interpolates from the last real event — the end of the attack —
  // and decays the note across its whole length instead of only its tail. See EnvelopeResult.
  if (holdLevel !== null) param.setValueAtTime(holdLevel, when)
  param.exponentialRampToValueAtTime(SILENCE, end)
  param.setValueAtTime(0, end)
}

function applyFilterEnvelope(filter: BiquadFilterNode, spec: FilterSpec, at: number): void {
  if (!spec.envelope) return
  const open = Math.min(18000, spec.frequency * Math.pow(2, spec.envelope))
  filter.frequency.cancelScheduledValues(at)
  filter.frequency.setValueAtTime(open, at)
  filter.frequency.exponentialRampToValueAtTime(
    Math.max(20, spec.frequency),
    at + (spec.envelopeDecay ?? 0.2),
  )
}

/** A short burst of white noise, generated rather than loaded. Used for the guitar's pluck
 *  transient and by the drum kit. */
export function noiseBuffer(ctx: BaseAudioContext, seconds = 0.5): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds))
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  // Deterministic, so nothing about the sound changes between runs — which makes a level
  // measurement in the browser pass reproducible rather than approximately reproducible.
  let x = 88675123
  for (let index = 0; index < length; index++) {
    x ^= x << 13
    x ^= x >>> 17
    x ^= x << 5
    data[index] = ((x >>> 0) / 0xffffffff) * 2 - 1
  }
  return buffer
}

export interface RenderTargets {
  /** The dry destination. */
  output: AudioNode
  /** The reverb input, if there is one. */
  send?: AudioNode
  noise: AudioBuffer
}

/**
 * Build and start the nodes for one voice.
 *
 * Returns a handle rather than a node graph: nothing outside this file should have to know
 * how many oscillators an instrument happens to use.
 */
export function renderVoice(
  ctx: BaseAudioContext,
  plan: VoicePlan,
  at: number,
  targets: RenderTargets,
): VoiceHandle {
  const voiceGain = ctx.createGain()
  voiceGain.gain.value = plan.gain

  let sink: AudioNode = voiceGain
  let filter: BiquadFilterNode | undefined
  if (plan.filter) {
    filter = ctx.createBiquadFilter()
    filter.type = plan.filter.type
    filter.frequency.value = plan.filter.frequency
    filter.Q.value = plan.filter.Q ?? 1
    applyFilterEnvelope(filter, plan.filter, at)
    filter.connect(voiceGain)
    sink = filter
  }

  voiceGain.connect(targets.output)
  if (targets.send && plan.reverbSend > 0) {
    // The send gain belongs to the VOICE and is disconnected with it. Creating one per note
    // and leaving it attached to the send bus orphans a node per note — at 140bpm that is
    // thousands an hour, and the page gets slowly heavier for no visible reason.
    const send = ctx.createGain()
    send.gain.value = plan.reverbSend
    voiceGain.connect(send)
    send.connect(targets.send)
  }

  const oscillators: OscillatorNode[] = []
  const gains: GainNode[] = []
  const holdLevels: (number | null)[] = []
  let silentAt = at
  // Whether ANY envelope sustains. Tracked separately from `silentAt` because one short
  // envelope must not be allowed to end the whole voice: the guitar's 30ms noise transient
  // set silentAt to 0.03 and killed a note that should have rung for a second and a half.
  // Measured as an 0.08s tail, which is how it was found.
  let sustaining = false

  // Carriers first, so a modulator has something to point at when it is wired up.
  plan.operators.forEach((operator) => {
    const osc = ctx.createOscillator()
    osc.type = operator.type
    osc.frequency.value = operator.frequency
    osc.detune.value = operator.detune
    const gain = ctx.createGain()
    osc.connect(gain)
    oscillators.push(osc)
    gains.push(gain)
  })

  plan.operators.forEach((operator, index) => {
    const gain = gains[index]!
    const envelope = applyEnvelope(gain.gain, operator.amp, operator.gain, at)
    holdLevels[index] = envelope.holdLevel
    if (Number.isFinite(envelope.end)) silentAt = Math.max(silentAt, envelope.end)
    else sustaining = true

    if (operator.modulates === undefined) {
      gain.connect(sink)
    } else {
      // FM: the modulator's output is added to the target oscillator's frequency, in Hz.
      const target = oscillators[operator.modulates]
      if (target) gain.connect(target.frequency)
    }
  })

  if (plan.noise) {
    const source = ctx.createBufferSource()
    source.buffer = targets.noise
    source.loop = true
    const gain = ctx.createGain()
    const envelope = applyEnvelope(gain.gain, plan.noise.amp, plan.noise.gain, at)
    if (Number.isFinite(envelope.end)) silentAt = Math.max(silentAt, envelope.end)
    else sustaining = true
    if (plan.noise.filter) {
      const band = ctx.createBiquadFilter()
      band.type = plan.noise.filter.type
      band.frequency.value = plan.noise.filter.frequency
      band.Q.value = plan.noise.filter.Q ?? 1
      source.connect(band)
      band.connect(gain)
    } else {
      source.connect(gain)
    }
    gain.connect(sink)
    source.start(at)
    source.stop(at + Math.max(plan.duration, 0.2) + 1)
  }

  for (const osc of oscillators) osc.start(at)

  let stopped = false
  const stopAll = (when: number) => {
    if (stopped) return
    stopped = true
    for (const osc of oscillators) {
      try {
        osc.stop(when)
      } catch {
        // Already stopped. Harmless, and only reachable when a note is released twice — the
        // learner lifting a finger as the decay finishes on its own.
      }
    }
    // Disconnect once the tail is genuinely over, not when the release begins, or the last
    // few milliseconds are cut off with a click.
    const delay = Math.max(0, (when - ctx.currentTime + 0.1) * 1000)
    setTimeout(() => {
      voiceGain.disconnect()
      filter?.disconnect()
      for (const gain of gains) gain.disconnect()
    }, delay)
  }

  const releaseAt = (when: number): number => {
    const release = plan.operators.reduce((most, op) => Math.max(most, op.amp.release), 0.05)
    const end = when + release
    gains.forEach((gain, index) => {
      startRelease(gain.gain, when, end, holdLevels[index] ?? null)
    })
    stopAll(end + 0.02)
    return end
  }

  if (!plan.sustained) {
    // A struck voice frees itself; nothing has to remember to release it.
    //
    // The two cases are genuinely different and conflating them was a real bug. An envelope
    // with sustain ZERO decays to silence on its own and `silentAt` says when. An envelope
    // with a sustain LEVEL never ends by itself — applyEnvelope returns Infinity — so
    // `silentAt` is still the note's start time, and stopping there cut bass, sub, saw and
    // guitar off after fifty milliseconds. Measured as 0.05s tails, which is what found it.
    //
    // The second case needs an explicit release at the patch's natural length instead — and
    // it is decided by whether anything sustains, NOT by whether silentAt moved, because a
    // short transient moves silentAt while leaving the note itself ringing.
    if (sustaining) releaseAt(at + plan.duration)
    else stopAll(silentAt + 0.05)
  }

  return { release: releaseAt, kill: () => stopAll(ctx.currentTime) }
}
