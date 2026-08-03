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
function applyEnvelope(param: AudioParam, amp: AdsrSpec, peak: number, at: number): number {
  const attackEnd = at + amp.attack
  param.cancelScheduledValues(at)
  param.setValueAtTime(SILENCE, at)
  param.exponentialRampToValueAtTime(Math.max(SILENCE, peak), attackEnd)

  if (amp.sustain > 0) {
    if (amp.decay > 0) {
      param.exponentialRampToValueAtTime(
        Math.max(SILENCE, peak * amp.sustain),
        attackEnd + amp.decay,
      )
    }
    // Held indefinitely; `release` schedules the tail.
    return Infinity
  }

  // Sustain of zero: the note decays away whether or not the key is held. A piano, not an
  // organ. The voice frees itself when the decay finishes.
  const decayEnd = attackEnd + Math.max(amp.decay, 0.01)
  param.exponentialRampToValueAtTime(SILENCE, decayEnd)
  param.setValueAtTime(0, decayEnd)
  return decayEnd
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
    const end = applyEnvelope(gain.gain, operator.amp, operator.gain, at)
    if (Number.isFinite(end)) silentAt = Math.max(silentAt, end)
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
    const end = applyEnvelope(gain.gain, plan.noise.amp, plan.noise.gain, at)
    if (Number.isFinite(end)) silentAt = Math.max(silentAt, end)
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
    for (const gain of gains) {
      gain.gain.cancelScheduledValues(when)
      // From wherever the envelope actually is right now, so releasing a note mid-attack
      // fades from that level rather than jumping to full and then fading.
      gain.gain.setValueAtTime(Math.max(SILENCE, gain.gain.value), when)
      gain.gain.exponentialRampToValueAtTime(SILENCE, end)
      gain.gain.setValueAtTime(0, end)
    }
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
