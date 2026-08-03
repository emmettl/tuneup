import { useMemo } from 'react'
import { type Clef, bestClef, layoutNotes, signatureSteps } from './staff.js'
import { type Key, keyName } from '../theory/key.js'
import { type Spelled, noteName } from '../theory/pitch.js'
import './Staff.css'

// The stave, drawn.
//
// A thin renderer over staff.ts, which has already decided every position. Nothing here does
// music theory; if a note is in the wrong place the bug is next door, and that separation is
// what makes the hard part testable without a DOM.

const SPACE = 9
const HEIGHT = SPACE * 8
const TOP = 26
const LEFT = 8

export interface StaffProps {
  notes: Spelled[]
  musicKey: Key
  clef?: Clef
  /** Draw the notes stacked as a chord rather than left to right. */
  chord?: boolean
  label?: string
}

/** Staff step to a y coordinate. Step 0 is the bottom line. */
const yFor = (step: number) => TOP + HEIGHT - (step * SPACE) / 2

export default function Staff({ notes, musicKey, clef, chord = false, label }: StaffProps) {
  const useClef = clef ?? bestClef(notes)
  const laid = useMemo(() => layoutNotes(notes, musicKey, useClef), [notes, musicKey, useClef])
  const signature = signatureSteps(musicKey, useClef)

  const signatureWidth = signature.length * 9
  const firstNote = LEFT + 34 + signatureWidth + 14
  const spacing = chord ? 0 : 26
  const width = firstNote + Math.max(spacing * laid.length, 40) + 16

  return (
    <svg
      className="staff"
      viewBox={`0 0 ${width} ${HEIGHT + TOP + 30}`}
      style={{ maxWidth: width }}
      role="img"
      // The alternative to reading it. A stave is an image to a screen reader and to anyone
      // who cannot read notation, so the notes are named in the label — which is also the
      // reason this toggle can be optional without excluding anyone.
      aria-label={`${label ? `${label}. ` : ''}${keyName(musicKey)}, ${useClef} clef: ${notes
        .map((n) => noteName(n, { octave: true, unicode: false }))
        .join(', ')}`}
    >
      {[0, 2, 4, 6, 8].map((step) => (
        <line
          key={step}
          x1={LEFT}
          x2={width - 8}
          y1={yFor(step)}
          y2={yFor(step)}
          className="staff-line"
        />
      ))}

      <text x={LEFT + 4} y={yFor(useClef === 'treble' ? 2 : 6)} className="staff-clef">
        {useClef === 'treble' ? '\u{1D11E}' : '\u{1D122}'}
      </text>

      {signature.map((mark, index) => (
        <text
          key={`${mark.letter}${index}`}
          x={LEFT + 36 + index * 9}
          y={yFor(mark.step) + 4}
          className="staff-accidental"
        >
          {mark.sharp ? '♯' : '♭'}
        </text>
      ))}

      {laid.map((entry, index) => {
        const x = firstNote + index * spacing
        const y = yFor(entry.step)
        return (
          <g key={index} className="staff-note">
            {entry.ledger.map((line) => (
              <line
                key={line}
                x1={x - 9}
                x2={x + 9}
                y1={yFor(line)}
                y2={yFor(line)}
                className="staff-line"
              />
            ))}
            {entry.accidental && (
              <text x={x - 15} y={y + 4} className="staff-accidental">
                {entry.accidental.natural ? '♮' : entry.accidental.alter > 0 ? '♯' : '♭'}
              </text>
            )}
            <ellipse cx={x} cy={y} rx={5.4} ry={4} className="staff-head" />
            <line
              x1={entry.stem === 'up' ? x + 5 : x - 5}
              x2={entry.stem === 'up' ? x + 5 : x - 5}
              y1={y}
              y2={entry.stem === 'up' ? y - 26 : y + 26}
              className="staff-stem"
            />
          </g>
        )
      })}
    </svg>
  )
}
