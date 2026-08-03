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
import {
  type Key,
  type ScaleId,
  type Spelled,
  degreeOf,
  noteName,
  pitchClassOf,
  spellInKey,
  spellMidi,
} from '../theory/index.js'
import type { Highlight, ToneRole } from './highlight.js'
import './Keyboard.css'

export interface KeyboardProps {
  /** Inclusive MIDI range. Widened to white-key boundaries so nothing hangs off an edge. */
  range?: [number, number]
  highlight?: Highlight[]
  /** Colour every note of a scale by its role, without listing them by hand. */
  scale?: { key: Key; id: ScaleId }
  /**
   * Spell notes as this key would.
   *
   * Without it labels default to sharps, so a lesson that calls a note E♭ in its prose showed
   * "D♯" on the key and announced "D sharp 4" to a screen reader. Two names for one key is
   * exactly the confusion chapter 1 works to clear up; the widget must not reintroduce it.
   */
  spellIn?: Key
  /**
   * Spell these exact notes this exact way, whatever the key would say.
   *
   * `spellIn` alone is not enough for a scale that reaches outside its key. The blue note in A
   * is a flattened fifth — E♭ — but it is not in A minor, so spelling by key falls through to
   * the chromatic default and calls it D♯. The lesson's prose says E♭ and the key said D♯,
   * which is precisely the two-names-for-one-key confusion chapter 1 exists to clear up.
   */
  spellNotes?: Spelled[]
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
  spellIn,
  spellNotes,
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
  // Pitch class → the spelling this lesson wants for it.
  const spellings = useMemo(() => {
    const map = new Map<number, Spelled>()
    for (const note of spellNotes ?? []) map.set(pitchClassOf(note), note)
    return map
  }, [spellNotes])
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
          spellIn={spellIn ?? scale?.key}
          spelled={spellings.get(((box.midi % 12) + 12) % 12)}
          label={labelFor(box.midi, labels, from, spellings, spellIn ?? scale?.key, scale)}
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
  spellIn,
  spelled,
  onActivate,
}: {
  box: KeyBox
  role?: ToneRole
  label?: string
  spellIn?: Key
  /** This key's spelling, already resolved by the parent. */
  spelled?: Spelled
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
      aria-label={ariaLabelFor(box.midi, role, spellIn, spelled)}
      tabIndex={-1}
    >
      {label && <span className="keyboard-label">{label}</span>}
    </button>
  )
}

/** How each role is said out loud. Written out rather than interpolated, because "the blue"
 *  is not what anyone calls that note and "the seventh" needs no article games. */
const ROLE_PHRASE: Partial<Record<ToneRole, string>> = {
  root: 'the root',
  third: 'the third',
  fifth: 'the fifth',
  seventh: 'the seventh',
  blue: 'the blue note',
}

function ariaLabelFor(midi: number, role?: ToneRole, spellIn?: Key, given?: Spelled): string {
  // Spelled the way the surrounding music spells it, and read as words rather than glyphs —
  // a screen reader says nothing useful for '♯'.
  const base = given ?? (spellIn ? spellInKey(midi, spellIn) : spellMidi(midi))
  const octave = Math.floor(midi / 12) - 1
  const spelled = given ? { ...base, octave } : base
  const name = `${spelled.letter}${accidentalWord(spelled.alter)} ${spelled.octave}`
  const phrase = role ? ROLE_PHRASE[role] : undefined
  // The musical meaning, not just the name — this is the channel a learner who cannot hear
  // the difference relies on, and "E flat 4" alone does not teach anything.
  return phrase ? `${name}, ${phrase}` : name
}

function accidentalWord(alter: number): string {
  if (alter === 0) return ''
  const word = alter > 0 ? ' sharp' : ' flat'
  return Math.abs(alter) === 2 ? `${word} ${word.trim()}` : word
}

function labelFor(
  midi: number,
  labels: KeyboardProps['labels'],
  from: number,
  spellings: Map<number, Spelled>,
  spellIn?: Key,
  scale?: { key: Key; id: ScaleId },
): string | undefined {
  switch (labels) {
    case 'note': {
      // An explicit spelling wins over the key's, so a scale that reaches outside its key
      // still names its own notes. See `spellNotes` on KeyboardProps.
      const given = spellings.get(((midi % 12) + 12) % 12)
      return noteName(given ?? (spellIn ? spellInKey(midi, spellIn) : spellMidi(midi)))
    }
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

