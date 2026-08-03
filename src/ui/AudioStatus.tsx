import { useCallback, useEffect, useState } from 'react'
import {
  audioContext,
  contextState,
  mayBeSilencedByHardwareSwitch,
  onStateChange,
  unlock,
} from '../audio/context.js'
import { player } from '../audio/player.js'

// "I can't hear anything" is the single least diagnosable failure a browser instrument has,
// because almost every cause is invisible from inside the page: the tab is muted, the OS
// output moved to a disconnected device, an iPhone's ringer switch is off, or the context
// never got a gesture. The app reports "running" through all of them.
//
// So rather than hide the audio state, this shows it — and offers three tests that bisect the
// signal path, which is the fastest way to turn "no sound" into an actionable answer:
//
//   RAW      one oscillator straight to the destination. Bypasses everything this project
//            wrote. If this is silent, nothing in tuneup is at fault.
//   MASTER   an oscillator through the bus, compressor and master gain. If RAW works and this
//            does not, the master chain is at fault.
//   VOICE    an actual instrument note. If MASTER works and this does not, synthesis is.

type Result = 'untested' | 'running' | 'done'

export default function AudioStatus() {
  const [state, setState] = useState<AudioContextState | 'none'>(() => contextState())
  const [detail, setDetail] = useState<string>('')
  const [result, setResult] = useState<Result>('untested')

  useEffect(() => onStateChange(setState), [])

  const describe = useCallback(() => {
    const ctx = audioContext()
    setDetail(
      [
        `state ${ctx.state}`,
        `sampleRate ${ctx.sampleRate}`,
        `baseLatency ${(ctx.baseLatency ?? 0).toFixed(4)}s`,
        `outputLatency ${((ctx as AudioContext).outputLatency ?? 0).toFixed(4)}s`,
        `destination channels ${ctx.destination.channelCount}`,
        `maxChannelCount ${ctx.destination.maxChannelCount}`,
      ].join('  ·  '),
    )
  }, [])

  /** A bare oscillator, straight to the destination. Nothing of ours in the path. */
  const testRaw = () => {
    void unlock()
    const ctx = audioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 440
    gain.gain.value = 0.0001
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.85)
    describe()
    setResult('running')
    setTimeout(() => setResult('done'), 900)
  }

  /** The same oscillator, but through our bus, compressor and master gain. */
  const testMaster = () => {
    void unlock()
    player().prepare()
    const ctx = audioContext()
    const bus = player().bus
    if (!bus) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 660
    gain.gain.value = 0.0001
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8)
    osc.connect(gain)
    gain.connect(bus)
    osc.start()
    osc.stop(ctx.currentTime + 0.85)
    describe()
  }

  const testVoice = () => {
    void unlock()
    player().play(69, { velocity: 1 })
    describe()
  }

  const suspended = state === 'suspended' || state === 'none'

  return (
    <div className="audio-status">
      <div className="audio-status-row">
        <span className={`audio-dot is-${state}`} aria-hidden="true" />
        <span className="mono">audio: {state}</span>
        {suspended && (
          <button type="button" className="audio-status-button" onPointerDown={() => void unlock()}>
            Enable sound
          </button>
        )}
      </div>

      <div className="audio-status-row">
        <button type="button" className="audio-status-button" onPointerDown={testRaw}>
          1. Raw tone (bypasses tuneup)
        </button>
        <button type="button" className="audio-status-button" onPointerDown={testMaster}>
          2. Through the master chain
        </button>
        <button type="button" className="audio-status-button" onPointerDown={testVoice}>
          3. A real instrument note
        </button>
      </div>

      {result !== 'untested' && (
        <p className="audio-status-note">
          If test 1 is silent, the problem is outside this app: check the tab is not muted
          (a speaker icon on the tab), the system output device, and the volume.
          {mayBeSilencedByHardwareSwitch() &&
            ' On an iPhone or iPad the hardware ringer switch silences web audio entirely, with no way for a page to detect it.'}
        </p>
      )}

      {detail && <p className="audio-status-detail mono">{detail}</p>}
    </div>
  )
}
