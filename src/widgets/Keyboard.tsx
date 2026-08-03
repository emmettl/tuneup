import { useCallback, useEffect, useMemo, useRef } from 'react'
import { player, type InstrumentId } from '../audio/index.js'
import { useSoundingDom } from '../ui/useSounding.js'
import {
  type KeyBox,
  capForMidi,
  keyAt,
  layoutKeys,
  midiForCode,
  whiteBounded,
  whiteKeyCount,
} from './keyboard-layout.js'
import { type Key, type ScaleId, degreeOf, noteName, spellInKey, spellMidi } from '../theory/index.js'
import type { Highlight, ToneRole } from './highlight.js'
import './Keyboard.css'

export interface KeyboardProps {
  /** Inclusive MIDI range. Widened to white-key boundaries so nothing hangs off an edge. */
  range?: [number, number]
  highlight?: Highlight[]
  /** Colour every note of a scale by its role, without listing them by hand. */
  scale?: { key: Key; id: ScaleId }
  labels?: 'none' | 'note' | 'degree' | 'keycap'
  instrument?: InstrumentId
  /**
   * Enable the computer keyboard. Off by default: two keyboards on one page would both
   * respond to the same keypress, and every lesson that shows two at once would be broken by
   * a default nobody chose.
   */
  keys?: boolean
  /** Called with every note played, however it was triggered. Lessons use this for progress
   *  and for their own "you found it" logic. */
  onPlay?: (midi: number) => void
  /** Render and highlight, but make no sound. For a diagram that another widget drives. */
  silent?: boolean
  height?: number
  ariaLabel?: string
}

const ROLE_BY_DEGREE: Record<number, ToneRole> = { 1: 'root', 3: 'third', 5: 'fifth', 7: 'seventh' }

/**
 * A playable piano keyboard.
 *
 * Multi-touch, glissando, and the computer keyboard all go through the same path: work out a
 * note, then hold or release it. Pointer capture per `pointerId` is what makes two fingers
 * two notes rather than the second one stealing the first.
 */
export default function Keyboard({
  range = [60, 84],
  highlight,
  scale,
  labels = 'none',
  instrument,
  keys = false,
  onPlay,
  silent = false,
  height = 150,
  ariaLabel,
}: KeyboardProps) {
  const surface = useRef<HTMLDivElement>(null)
  const [from, to] = whiteBounded(range[0], range[1])

  // Laid out in a 1000-unit space and scaled by CSS, so the geometry is resolution
  // independent and the hit test never has to know the element's pixel width.
  const boxes = useMemo(
    () => layoutKeys({ from, to, width: 1000, height: 1000 }),
    [from, to],
  )
  const whites = whiteKeyCount(from, to)

  const roles = useMemo(() => resolveRoles(from, to, highlight, scale), [from, to, highlight, scale])
  const held = useRef(new Map<number, number>())

  useSoundingDom(surface)

  useEffect(() => {
    if (!silent) player().prepare()
  }, [silent])

  const start = useCallback(
    (midi: number) => {
      if (!silent) player().hold(midi, { instrument })
      onPlay?.(midi)
    },
    [instrument, onPlay, silent],
  )

  const stop = useCallback(
    (midi: number) => {
      if (!silent) player().release(midi, instrument)
    },
    [instrument, silent],
  )

  const noteAtEvent = (event: React.PointerEvent): number | null => {
    const rect = surface.current?.getBoundingClientRect()
    if (!rect) return null
    const x = ((event.clientX - rect.left) / rect.width) * 1000
    const y = ((event.clientY - rect.top) / rect.height) * 1000
    return keyAt(x, y, boxes)
  }

  const onPointerDown = (event: React.PointerEvent) => {
    const midi = noteAtEvent(event)
    if (midi === null) return
    // Capture, so a drag that leaves the element still reports moves here — otherwise a
    // glissando off the edge leaves the last note droning with no event to release it.
    event.currentTarget.setPointerCapture(event.pointerId)
    held.current.set(event.pointerId, midi)
    start(midi)
  }

  const onPointerMove = (event: React.PointerEvent) => {
    if (!held.current.has(event.pointerId)) return
    const midi = noteAtEvent(event)
    const previous = held.current.get(event.pointerId)!
    if (midi === previous) return
    stop(previous)
    if (midi === null) held.current.delete(event.pointerId)
    else {
      held.current.set(event.pointerId, midi)
      start(midi)
    }
  }

  // pointercancel and lostpointercapture both have to release. A missed release leaves a note
  // droning with nothing to stop it, which is the most reported bug in any browser instrument.
  const endPointer = (event: React.PointerEvent) => {
    const midi = held.current.get(event.pointerId)
    if (midi === undefined) return
    held.current.delete(event.pointerId)
    stop(midi)
  }

  useEffect(() => {
    if (!keys) return
    const down = new Set<string>()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
      const midi = midiForCode(event.code, from)
      if (midi === null || midi > to) return
      if (down.has(event.code)) return
      down.add(event.code)
      event.preventDefault()
      start(midi)
    }
    const onKeyUp = (event: KeyboardEvent) => {
      const midi = midiForCode(event.code, from)
      if (midi === null || !down.delete(event.code)) return
      stop(midi)
    }
    // Losing focus mid-keypress never fires keyup, so the note would hang.
    const onBlur = () => {
      for (const code of down) {
        const midi = midiForCode(code, from)
        if (midi !== null) stop(midi)
      }
      down.clear()
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      onBlur()
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [keys, from, to, start, stop])

  return (
    <div
      ref={surface}
      className="keyboard"
      style={{ height, ['--keyboard-whites' as string]: whites }}
      role="group"
      aria-label={ariaLabel ?? `Piano keyboard, ${noteName(spellMidi(from), { octave: true })} to ${noteName(spellMidi(to), { octave: true })}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onLostPointerCapture={endPointer}
    >
      {boxes.map((box) => (
        <KeyCap
          key={box.midi}
          box={box}
          role={roles.get(box.midi)}
          label={labelFor(box.midi, labels, from, scale)}
          onActivate={() => {
            // Keyboard activation of a single key: a discrete note rather than a hold,
            // because there is no key-up to pair it with from a click.
            if (!silent) player().play(box.midi, { instrument, duration: 0.9 })
            onPlay?.(box.midi)
          }}
        />
      ))}
    </div>
  )
}

function KeyCap({
  box,
  role,
  label,
  onActivate,
}: {
  box: KeyBox
  role?: ToneRole
  label?: string
  onActivate: () => void
}) {
  return (
    <button
      type="button"
      data-midi={box.midi}
      data-role={role}
      className={box.black ? 'keyboard-key is-black' : 'keyboard-key is-white'}
      style={{
        left: `${box.x / 10}%`,
        width: `${box.width / 10}%`,
        height: `${box.height / 10}%`,
      }}
      // The pointer path owns playing; this only exists so the key is reachable and
      // operable without a mouse. Pointer events must not fire it twice.
      onClick={(event) => {
        if (event.detail !== 0) return
        onActivate()
      }}
      aria-label={ariaLabelFor(box.midi, role)}
      tabIndex={-1}
    >
      {label && <span className="keyboard-label">{label}</span>}
    </button>
  )
}

function ariaLabelFor(midi: number, role?: ToneRole): string {
  const name = noteName(spellMidi(midi), { octave: true, unicode: false })
  // The musical meaning, not just the name — this is the channel a learner who cannot hear
  // the difference relies on, and "E4" alone does not teach anything.
  return role && role !== 'outside' && role !== 'scale' ? `${name}, the ${role}` : name
}

function labelFor(
  midi: number,
  labels: KeyboardProps['labels'],
  from: number,
  scale?: { key: Key; id: ScaleId },
): string | undefined {
  switch (labels) {
    case 'note':
      return noteName(scale ? spellInKey(midi, scale.key) : spellMidi(midi))
    case 'degree': {
      if (!scale) return undefined
      const degree = degreeOf(scale.key.tonic, scale.id, spellMidi(midi))
      return degree ? String(degree) : undefined
    }
    case 'keycap':
      return capForMidi(midi, from) ?? undefined
    default:
      return undefined
  }
}

/**
 * Work out what colour each key should be.
 *
 * Explicit highlights win over the scale, so a lesson can say "this one note is the blue
 * note" on top of a scale that already colours it as an ordinary degree.
 */
function resolveRoles(
  from: number,
  to: number,
  highlight?: Highlight[],
  scale?: { key: Key; id: ScaleId },
): Map<number, ToneRole> {
  const roles = new Map<number, ToneRole>()

  if (scale) {
    for (let midi = from; midi <= to; midi++) {
      const degree = degreeOf(scale.key.tonic, scale.id, spellMidi(midi))
      if (degree === null) continue
      roles.set(midi, ROLE_BY_DEGREE[degree] ?? 'scale')
    }
  }

  for (const entry of highlight ?? []) {
    if (entry.midi !== undefined) {
      roles.set(entry.midi, entry.tone)
      continue
    }
    if (entry.pitchClass === undefined) continue
    for (let midi = from; midi <= to; midi++) {
      if (((midi % 12) + 12) % 12 === entry.pitchClass) roles.set(midi, entry.tone)
    }
  }

  return roles
}

