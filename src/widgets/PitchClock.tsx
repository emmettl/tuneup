import { useCallback, useMemo, useRef, useState } from 'react'
import {
  SEGMENTS,
  angleAtPoint,
  layoutRing,
  pitchClassAtAngle,
  radiusAtPoint,
} from './clock-layout.js'
import { player } from '../audio/index.js'
import { capturePointer, releasePointer } from './capture.js'
import {
  type Key,
  type ScaleId,
  noteName,
  pitchClassOf,
  scaleNotes,
  spellInKey,
} from '../theory/index.js'
import type { ToneRole } from './highlight.js'
import './PitchClock.css'

// The pitch clock.
//
// Twelve chromatic segments, a lit subset for the scale, and a marker for home. Three
// gestures, and each one is a different lesson:
//
//   ROTATE THE MASK   the same shape starting somewhere else — transposition
//   MOVE HOME         the same notes with a different one as home — modes, and the relative
//                     minor
//   TAP A SEGMENT     hear that note
//
// Keeping rotate and move-home as separate gestures is deliberate. They look similar and are
// the two ideas beginners most often collapse into one; the widget only teaches the
// difference if it makes you do two different things.

const VIEW = 240
const CENTRE = VIEW / 2
const INNER = 66
const OUTER = 112

export interface PitchClockProps {
  /** Which pitch classes are lit. */
  scale: { key: Key; id: ScaleId }
  /** Let the learner drag the whole lit shape round the ring. */
  rotatable?: boolean
  /** Let the learner move the home marker without moving the shape. */
  movableHome?: boolean
  onRootChange?: (pitchClass: number) => void
  /** Extra colouring on top of the scale — the blue note, the one that changed. */
  emphasis?: { pitchClass: number; tone: ToneRole }[]
  /** Sound a note when a segment is tapped. */
  audible?: boolean
  labels?: 'note' | 'degree' | 'none'
  size?: number
}

export default function PitchClock({
  scale,
  rotatable = false,
  movableHome = false,
  onRootChange,
  emphasis,
  audible = true,
  labels = 'note',
  size = 240,
}: PitchClockProps) {
  const svg = useRef<SVGSVGElement>(null)
  const [offset, setOffset] = useState(0)
  const dragging = useRef<'ring' | 'home' | null>(null)
  const dragFrom = useRef(0)

  const ring = useMemo(() => layoutRing(CENTRE, CENTRE, INNER, OUTER), [])

  const tonicClass = (pitchClassOf(scale.key.tonic) + offset) % SEGMENTS
  const spelled = useMemo(() => scaleNotes(scale.key.tonic, scale.id), [scale])

  const lit = useMemo(() => {
    const set = new Map<number, ToneRole>()
    spelled.forEach((note, degree) => {
      const pitchClass = (pitchClassOf(note) + offset + SEGMENTS) % SEGMENTS
      set.set(pitchClass, degree === 0 ? 'root' : 'scale')
    })
    for (const mark of emphasis ?? []) {
      set.set((mark.pitchClass + offset + SEGMENTS) % SEGMENTS, mark.tone)
    }
    return set
  }, [spelled, offset, emphasis])

  const pointAt = useCallback((event: React.PointerEvent): { pitchClass: number; inRing: boolean } => {
    const rect = svg.current!.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * VIEW
    const y = ((event.clientY - rect.top) / rect.height) * VIEW
    const radius = radiusAtPoint(x, y, CENTRE, CENTRE)
    return {
      pitchClass: pitchClassAtAngle(angleAtPoint(x, y, CENTRE, CENTRE)),
      inRing: radius >= INNER - 10 && radius <= OUTER + 10,
    }
  }, [])

  const sound = (pitchClass: number) => {
    if (!audible) return
    // Sounded in the octave above middle C, which is where these voices are clearest and
    // where a scale played round the ring stays in one register.
    player().play(60 + pitchClass, { duration: 0.9 })
  }

  const onPointerDown = (event: React.PointerEvent) => {
    const { pitchClass, inRing } = pointAt(event)
    if (!inRing) return
    capturePointer(event.currentTarget, event.pointerId)
    dragFrom.current = pitchClass

    if (movableHome && pitchClass === tonicClass) dragging.current = 'home'
    else if (rotatable) dragging.current = 'ring'
    else dragging.current = null

    sound(pitchClass)
    if (movableHome && dragging.current !== 'ring' && pitchClass !== tonicClass) {
      onRootChange?.(pitchClass)
    }
  }

  const onPointerMove = (event: React.PointerEvent) => {
    if (!dragging.current) return
    const { pitchClass } = pointAt(event)
    if (pitchClass === dragFrom.current) return

    if (dragging.current === 'ring') {
      // The whole shape moves with the finger. Every note keeps its relationship to every
      // other, which is exactly what makes this transposition rather than editing.
      setOffset((current) => (current + pitchClass - dragFrom.current + SEGMENTS) % SEGMENTS)
    } else {
      onRootChange?.(pitchClass)
    }
    dragFrom.current = pitchClass
  }

  const endDrag = (event: React.PointerEvent) => {
    releasePointer(event.currentTarget, event.pointerId)
    dragging.current = null
  }

  const labelFor = (pitchClass: number): string => {
    if (labels === 'none') return ''
    const original = (pitchClass - offset + SEGMENTS * 2) % SEGMENTS
    if (labels === 'degree') {
      const degree = spelled.findIndex((note) => pitchClassOf(note) === original)
      return degree === -1 ? '' : String(degree + 1)
    }
    const inScale = spelled.find((note) => pitchClassOf(note) === original)
    return noteName(inScale ?? spellInKey(60 + pitchClass, scale.key))
  }

  return (
    <svg
      ref={svg}
      className="pitch-clock"
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      style={{ width: size, height: size }}
      role="group"
      aria-label={`Pitch ring, ${noteName(scale.key.tonic)} ${scale.id}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {ring.map((segment) => {
        const role = lit.get(segment.pitchClass)
        return (
          <g key={segment.pitchClass}>
            <path
              d={segment.path}
              className="pitch-clock-segment"
              data-role={role ?? 'outside'}
              data-pitch={segment.pitchClass}
            />
            {labels !== 'none' && (
              <text
                x={segment.labelX}
                y={segment.labelY}
                className="pitch-clock-label"
                data-role={role ?? 'outside'}
                dominantBaseline="middle"
                textAnchor="middle"
              >
                {labelFor(segment.pitchClass)}
              </text>
            )}
          </g>
        )
      })}

      {/* Home. A triangle rather than a colour change, because "which note is home" is the
          single most important thing the ring says and it must survive being unable to see
          the amber — or being unable to see colour at all. */}
      <HomeMarker pitchClass={tonicClass} draggable={movableHome} />

      <text x={CENTRE} y={CENTRE - 6} className="pitch-clock-centre" textAnchor="middle">
        {noteName(scale.key.tonic)}
      </text>
      <text x={CENTRE} y={CENTRE + 14} className="pitch-clock-centre-sub" textAnchor="middle">
        {scale.id.replace(/-/g, ' ')}
      </text>
    </svg>
  )
}

function HomeMarker({ pitchClass, draggable }: { pitchClass: number; draggable: boolean }) {
  const angle = (pitchClass / SEGMENTS) * Math.PI * 2
  // Just inside the ring's outer edge rather than beyond it, so the marker overlaps the
  // segment it belongs to. Floating outside, it read as decoration rather than as the handle
  // the lesson asks you to drag.
  const x = CENTRE + (OUTER - 9) * Math.sin(angle)
  const y = CENTRE - (OUTER - 9) * Math.cos(angle)
  const rotation = (pitchClass / SEGMENTS) * 360
  return (
    <g
      transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${rotation})`}
      className={draggable ? 'pitch-clock-home-group is-draggable' : 'pitch-clock-home-group'}
    >
      <circle r="11" className="pitch-clock-home-halo" />
      <path d="M 0 7 L -7 -5 L 7 -5 Z" className="pitch-clock-home" />
    </g>
  )
}
