import { useCallback, useEffect, useRef, useState } from 'react'
import { player, type DrumId } from '../audio/index.js'
import { hitsAt, isEmpty, toggleStep, type Pattern } from './step-grid.js'
import './StepGrid.css'

// The step sequencer.
//
// The pattern lives in a ref as well as in state, for the same reason ChordPlayer's bars do:
// the running scheduler must see an edit immediately, and a closure captured when the loop
// started never would. State drives what you see; the ref drives what you hear.
//
// The playhead is read from the AUDIO CLOCK rather than from the scheduler's own counter —
// the scheduler runs up to a lookahead window ahead of the sound, so following it would put
// the light ahead of the beat. Very visible at the slow tempos the rhythm chapter uses.

export interface StepGridProps {
  pattern: Pattern
  onPatternChange?: (pattern: Pattern) => void
  bpm?: number
  swing?: number
  /** Lanes the learner may edit. Omitted means all of them. */
  editable?: boolean
  /** Show only the first N steps. The subdivision lesson uses this to go from quarters to
   *  sixteenths without changing the underlying pattern. */
  visibleSteps?: number
}

export default function StepGrid({
  pattern,
  onPatternChange,
  bpm = 104,
  swing = 0,
  editable = true,
  visibleSteps,
}: StepGridProps) {
  const [running, setRunning] = useState(false)
  const [step, setStep] = useState(-1)
  const live = useRef(pattern)
  live.current = pattern

  const stop = useCallback(() => {
    player().stop()
    setRunning(false)
    setStep(-1)
  }, [])

  useEffect(() => stop, [stop])

  const start = () => {
    if (running) return stop()
    if (isEmpty(pattern)) return
    player().bpm = bpm
    player().swing = swing
    setRunning(true)
    player().start((event) => {
      for (const hit of hitsAt(live.current, event.index)) {
        player().drum(hit.id as DrumId, { at: event.time, velocity: hit.velocity })
      }
    })
  }

  // Follow the sound, once a frame, and only re-render when the step actually changes —
  // sixteen renders a bar rather than sixty a second.
  useEffect(() => {
    if (!running) return
    let frame = 0
    let last = -1
    const poll = () => {
      frame = requestAnimationFrame(poll)
      const index = player().position.index
      if (index !== last) {
        last = index
        setStep(index)
      }
    }
    frame = requestAnimationFrame(poll)
    return () => cancelAnimationFrame(frame)
  }, [running])

  const total = pattern[0]?.steps.length ?? 16
  const shown = visibleSteps ?? total

  return (
    <div className="step-grid">
      <div className="step-grid-lanes">
        {pattern.map((lane) => (
          <div key={lane.id} className="step-lane" role="group" aria-label={lane.label}>
            <span className="step-lane-label mono">{lane.label}</span>
            <div className="step-lane-cells">
              {lane.steps.slice(0, shown).map((on, index) => (
                <button
                  key={index}
                  type="button"
                  className={`step-cell ${on ? 'is-on' : ''} ${step === index ? 'is-live' : ''} ${
                    index % 4 === 0 ? 'is-downbeat' : ''
                  }`}
                  disabled={!editable}
                  aria-pressed={on}
                  aria-label={`${lane.label}, step ${index + 1}${index % 4 === 0 ? ', on the beat' : ''}`}
                  onPointerDown={() => {
                    if (!editable) return
                    const next = toggleStep(live.current, lane.id, index)
                    live.current = next
                    onPatternChange?.(next)
                    // Sound it immediately so editing is playing, not typing.
                    if (!on) player().drum(lane.id as DrumId, { velocity: lane.velocity?.[index] ?? 1 })
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="step-grid-transport">
        <button type="button" className="control is-on" onPointerDown={start}>
          {running ? 'Stop' : 'Play'}
        </button>
        <span className="step-grid-hint mono">
          {bpm} bpm{swing > 0 ? ` · swing ${Math.round(swing * 100)}%` : ' · straight'}
        </span>
      </div>
    </div>
  )
}
