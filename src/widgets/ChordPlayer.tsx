import { useCallback, useEffect, useRef, useState } from 'react'
import { player } from '../audio/index.js'
import {
  type ChordSpec,
  type Key,
  chordSymbol,
  diatonicNumerals,
  roman,
  romanText,
  romanToChord,
  voiceLead,
} from '../theory/index.js'
import './ChordPlayer.css'

// The progression player.
//
// The load-bearing behaviour is the SWAP: changing a chord while the loop is running takes
// effect at the next bar, and the loop never stops or clicks. Most of the harmony chapter is
// built on A/B comparison — swap the last chord and hear the ending change, swap the mode and
// hear the mood change — and a comparison only works if the reference is still playing. Stop
// and restart and the learner is comparing a memory instead.
//
// So the pattern here: the loop reads `bars` through a ref that is updated immediately, and
// the audio scheduler picks it up when it next crosses a bar boundary. React state drives the
// display; the ref drives what is heard.

export interface ChordPlayerProps {
  musicKey: Key
  /** Roman numerals, one per bar. */
  bars: string[]
  onBarsChange?: (bars: string[]) => void
  /** Which bars the learner may change. Omitted means none — a demonstration rather than a
   *  sandbox. */
  editable?: number[]
  /** Numerals offered when editing. Defaults to the seven the key gives you. */
  palette?: string[]
  bpm?: number
  /** Play a bass note under each chord. */
  bass?: boolean
  drums?: boolean
}

const BEATS_PER_BAR = 4

export default function ChordPlayer({
  musicKey,
  bars,
  onBarsChange,
  editable,
  palette,
  bpm = 96,
  bass = true,
  drums = false,
}: ChordPlayerProps) {
  const [running, setRunning] = useState(false)
  const [bar, setBar] = useState(0)
  const [editing, setEditing] = useState<number | null>(null)

  // What the SCHEDULER reads. Updated synchronously on every edit so a swap lands on the next
  // bar rather than one render later — a frame's delay is inaudible, but going through state
  // would mean the running loop kept a stale closure and never picked the change up at all.
  const live = useRef(bars)
  live.current = bars
  const keyRef = useRef(musicKey)
  keyRef.current = musicKey
  const voicing = useRef<number[] | null>(null)

  const options = palette ?? diatonicNumerals(musicKey).map((rn) => romanText(rn))

  const chordFor = useCallback((numeral: string): ChordSpec => {
    return romanToChord(roman(numeral), keyRef.current)
  }, [])

  const stop = useCallback(() => {
    player().stop()
    voicing.current = null
    setRunning(false)
    setBar(0)
  }, [])

  useEffect(() => stop, [stop])

  const start = () => {
    if (running) return stop()
    player().bpm = bpm
    setRunning(true)

    player().start(
      (event) => {
        const index = event.bar % live.current.length
        const numeral = live.current[index]!

        if (event.index === 0) {
          // Voice-led from the previous chord, so the progression stays in one register and
          // keeps its common tones instead of jumping about. This is what makes four chords
          // sound like a player rather than a list.
          const spec = chordFor(numeral)
          const next = voiceLead(spec, voicing.current, 64)
          voicing.current = next
          player().chord(next, {
            at: event.time,
            duration: (60 / bpm) * BEATS_PER_BAR * 0.94,
            instrument: 'pad',
            strum: 0.02,
          })
          if (bass) {
            player().play(Math.min(...next) - 24, {
              at: event.time,
              duration: (60 / bpm) * BEATS_PER_BAR * 0.9,
              instrument: 'bass',
            })
          }
        }

        if (drums) {
          const beat = event.index / 4
          if (Number.isInteger(beat)) player().drum('kick', { at: event.time })
          if (beat === 1 || beat === 3) player().drum('snare', { at: event.time, velocity: 0.8 })
          if (event.index % 2 === 1) {
            player().drum('hat', { at: event.time, velocity: 0.4 })
          }
        }
      },
      undefined,
      (nextBar) => setBar(nextBar % live.current.length),
    )
  }

  const setBarNumeral = (index: number, numeral: string) => {
    const next = [...bars]
    next[index] = numeral
    onBarsChange?.(next)
    setEditing(null)
  }

  return (
    <div className="chord-player">
      <div className="chord-player-bars" role="list">
        {bars.map((numeral, index) => {
          const spec = chordFor(numeral)
          const canEdit = editable?.includes(index) ?? false
          const live = running && bar === index
          return (
            <div key={index} role="listitem" className="chord-player-slot">
              <button
                type="button"
                className={`chord-card ${live ? 'is-live' : ''} ${canEdit ? 'is-editable' : ''}`}
                onPointerDown={() => (canEdit ? setEditing(editing === index ? null : index) : undefined)}
                aria-label={`Bar ${index + 1}: ${romanText(roman(numeral))}, ${chordSymbol(spec)}${
                  canEdit ? '. Change it' : ''
                }${live ? '. Playing now' : ''}`}
                aria-expanded={canEdit ? editing === index : undefined}
                disabled={!canEdit}
              >
                <span className="chord-card-numeral">{romanText(roman(numeral))}</span>
                <span className="chord-card-name mono">{chordSymbol(spec)}</span>
              </button>

              {editing === index && (
                <div className="chord-picker" role="group" aria-label={`Chord for bar ${index + 1}`}>
                  {options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`chord-picker-option ${option === numeral ? 'is-on' : ''}`}
                      onPointerDown={() => setBarNumeral(index, option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="chord-player-transport">
        <button type="button" className="control is-on" onPointerDown={start}>
          {running ? 'Stop' : 'Play'}
        </button>
        <span className="chord-player-hint mono">
          {running
            ? // Said out loud because it is the entire premise of every A/B lesson, and it is
              // not obvious that you are allowed to change things mid-flight.
              'change a chord while it plays — it swaps at the next bar'
            : `${bpm} bpm · ${bars.length} bars`}
        </span>
      </div>
    </div>
  )
}
