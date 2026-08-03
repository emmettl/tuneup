import { useMemo, useRef, useState } from 'react'
import { SEGMENTS, angleAtPoint, layoutRing, pitchClassAtAngle, radiusAtPoint } from './clock-layout.js'
import { capturePointer, releasePointer } from './capture.js'
import { player } from '../audio/index.js'
import {
  type Key,
  chordPitches,
  circleOfFifths,
  diatonicTriads,
  fifthsOf,
  keyName,
  keySignature,
  noteName,
} from '../theory/index.js'
import './CircleOfFifths.css'

// The circle of fifths.
//
// Deliberately a SEPARATE widget from the pitch clock, though they share the ring geometry,
// because they are ordered differently and answer different questions. The pitch clock is
// chromatic and shows the SHAPE of a scale; this is ordered by fifths and shows how KEYS
// relate. Neither ordering can do the other's job, and merging them would produce something
// that does both badly.
//
// The thing it exists to make visible: each step round the circle changes exactly one note.
// That is a fact about the notes, not a mnemonic, and it is invisible in any other layout.

const VIEW = 260
const CENTRE = VIEW / 2

export interface CircleOfFifthsProps {
  musicKey: Key
  onKeyChange?: (key: Key) => void
  /** Show the relative minors on an inner ring. */
  minors?: boolean
  size?: number
}

export default function CircleOfFifths({
  musicKey,
  onKeyChange,
  minors = true,
  size = 260,
}: CircleOfFifthsProps) {
  const svg = useRef<SVGSVGElement>(null)
  const [dragging, setDragging] = useState(false)
  const positions = useMemo(() => circleOfFifths(), [])
  const outer = useMemo(() => layoutRing(CENTRE, CENTRE, 78, 122), [])
  const inner = useMemo(() => layoutRing(CENTRE, CENTRE, 44, 76), [])

  const currentIndex = ((fifthsOf(musicKey) % SEGMENTS) + SEGMENTS) % SEGMENTS

  const select = (index: number) => {
    const position = positions[index % SEGMENTS]!
    const next = musicKey.mode === 'minor' ? position.minor : position.major
    if (keyName(next) === keyName(musicKey)) return
    onKeyChange?.(next)
    // The key's own I chord, so a spin round the circle is a sequence of keys you can hear
    // rather than a diagram you look at.
    player().chord(chordPitches(diatonicTriads(next)[0]!, 4), { duration: 1.1, instrument: 'pad' })
  }

  const indexAt = (event: React.PointerEvent): number | null => {
    const rect = svg.current?.getBoundingClientRect()
    if (!rect) return null
    const x = ((event.clientX - rect.left) / rect.width) * VIEW
    const y = ((event.clientY - rect.top) / rect.height) * VIEW
    if (radiusAtPoint(x, y, CENTRE, CENTRE) < 40) return null
    return pitchClassAtAngle(angleAtPoint(x, y, CENTRE, CENTRE))
  }

  const signature = keySignature(musicKey)

  return (
    <svg
      ref={svg}
      className="circle-fifths"
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      style={{ width: size, height: size }}
      role="group"
      aria-label={`Circle of fifths. Current key ${keyName(musicKey)}, ${
        signature.kind === 'none' ? 'no sharps or flats' : `${signature.letters.length} ${signature.kind}s`
      }`}
      onPointerDown={(event) => {
        const index = indexAt(event)
        if (index === null) return
        capturePointer(event.currentTarget, event.pointerId)
        setDragging(true)
        select(index)
      }}
      onPointerMove={(event) => {
        if (!dragging) return
        const index = indexAt(event)
        if (index !== null) select(index)
      }}
      onPointerUp={(event) => {
        releasePointer(event.currentTarget, event.pointerId)
        setDragging(false)
      }}
      onPointerCancel={(event) => {
        releasePointer(event.currentTarget, event.pointerId)
        setDragging(false)
      }}
    >
      {outer.map((segment, index) => {
        const position = positions[index]!
        const active = index === currentIndex
        return (
          <g key={`major-${index}`}>
            <path d={segment.path} className="circle-segment" data-active={active || undefined} />
            <text x={segment.labelX} y={segment.labelY} className="circle-label" data-active={active || undefined}>
              {noteName(position.major.tonic)}
            </text>
          </g>
        )
      })}

      {minors &&
        inner.map((segment, index) => {
          const position = positions[index]!
          const active = index === currentIndex
          return (
            <g key={`minor-${index}`}>
              <path d={segment.path} className="circle-segment is-minor" data-active={active || undefined} />
              <text
                x={segment.labelX}
                y={segment.labelY}
                className="circle-label is-minor"
                data-active={active || undefined}
              >
                {noteName(position.minor.tonic).toLowerCase()}
              </text>
            </g>
          )
        })}

      <text x={CENTRE} y={CENTRE - 4} className="circle-centre">
        {noteName(musicKey.tonic)}
      </text>
      <text x={CENTRE} y={CENTRE + 15} className="circle-centre-sub">
        {signature.kind === 'none'
          ? 'no sharps or flats'
          : `${signature.letters.length} ${signature.kind}${signature.letters.length === 1 ? '' : 's'}`}
      </text>
    </svg>
  )
}
