import { useMemo, useRef } from 'react'
import { player, type InstrumentId } from '../audio/index.js'
import { capturePointer } from './capture.js'
import {
  DOUBLE_INLAY_FRETS,
  INLAY_FRETS,
  type Tuning,
  TUNINGS,
  fretMidi,
  scaleMarks,
} from '../theory/fretboard.js'
import { type Key, type ScaleId, type Spelled, noteName, spellInKey } from '../theory/index.js'
import './Fretboard.css'

// The neck.
//
// Drawn with the LOWEST string at the bottom, which is how a right-handed player sees it
// looking down — and the opposite of how the array is ordered. Getting that backwards produces
// a diagram that is technically correct and unreadable to anyone holding a guitar.

export interface FretboardProps {
  root: Spelled
  scale: ScaleId
  musicKey?: Key
  tuning?: Tuning
  /** Inclusive fret window. Keep it to five or so; a whole neck is unreadable on a phone. */
  frets?: [number, number]
  labels?: 'note' | 'degree' | 'none'
  instrument?: InstrumentId
  onPlay?: (midi: number) => void
}

export default function Fretboard({
  root,
  scale,
  musicKey,
  tuning = TUNINGS.guitar,
  frets = [0, 12],
  labels = 'degree',
  instrument = 'guitar',
  onPlay,
}: FretboardProps) {
  const surface = useRef<HTMLDivElement>(null)
  const [low, high] = frets
  const count = high - low + 1

  const marks = useMemo(
    () => scaleMarks(tuning, root, scale, frets),
    [tuning, root, scale, frets],
  )
  const lookup = useMemo(() => {
    const map = new Map<string, (typeof marks)[number]>()
    for (const mark of marks) map.set(`${mark.string}:${mark.fret}`, mark)
    return map
  }, [marks])

  const pluck = (string: number, fret: number) => {
    const midi = fretMidi(tuning, string, fret)
    player().play(midi, { instrument, duration: 1.4 })
    onPlay?.(midi)
  }

  return (
    <div
      ref={surface}
      className="fretboard"
      role="group"
      aria-label={`Guitar neck, ${noteName(root)} ${scale.replace(/-/g, ' ')}, frets ${low} to ${high}`}
      onPointerDown={(event) => capturePointer(event.currentTarget, event.pointerId)}
    >
      <div className="fretboard-grid" style={{ gridTemplateColumns: `28px repeat(${count}, 1fr)` }}>
        {/* Strings top to bottom = highest to lowest, matching a player's view. */}
        {[...tuning.strings].map((_, index) => {
          const string = tuning.strings.length - 1 - index
          return (
            <div key={string} className="fretboard-row" style={{ display: 'contents' }}>
              <span className="fretboard-open mono">{noteNameAt(tuning, string, 0, musicKey)}</span>
              {Array.from({ length: count }, (_, offset) => {
                const fret = low + offset
                const mark = lookup.get(`${string}:${fret}`)
                return (
                  <button
                    key={fret}
                    type="button"
                    className={`fretboard-cell ${fret === 0 ? 'is-open' : ''}`}
                    onPointerDown={() => pluck(string, fret)}
                    aria-label={`String ${string + 1}, fret ${fret}${
                      mark ? `, ${mark.root ? 'the root' : `degree ${mark.degree}`}` : ', not in the scale'
                    }`}
                  >
                    {mark && (
                      <span className={`fretboard-dot ${mark.root ? 'is-root' : ''}`}>
                        {labels === 'degree'
                          ? mark.degree
                          : labels === 'note'
                            ? noteNameAt(tuning, string, fret, musicKey)
                            : ''}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })}

        {/* Inlays, along the bottom. Not musical — they are how a player finds their place,
            and a neck diagram without them is much harder to read than one with. */}
        <span />
        {Array.from({ length: count }, (_, offset) => {
          const fret = low + offset
          return (
            <span key={fret} className="fretboard-inlay mono">
              {DOUBLE_INLAY_FRETS.includes(fret) ? '••' : INLAY_FRETS.includes(fret) ? '•' : fret === 0 ? '' : ''}
              <span className="fretboard-fretnum">{fret}</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

function noteNameAt(tuning: Tuning, string: number, fret: number, musicKey?: Key): string {
  const midi = fretMidi(tuning, string, fret)
  if (musicKey) return noteName(spellInKey(midi, musicKey))
  const names = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']
  return names[((midi % 12) + 12) % 12]!
}
