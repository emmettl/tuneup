import { useEffect, useRef, useState } from 'react'
import { player } from '../audio/player.js'
import { soundingDiff } from './sounding-diff.js'

// Reading "what is sounding right now" from React, without paying for it every frame.
//
// One rAF loop drives every subscriber. Five widgets each calling requestAnimationFrame is
// five wake-ups a frame to read one number, and on the widget where a dropped frame is most
// visible — the keyboard, mid-glissando — that competes with the audio scheduler for the main
// thread.

type Subscriber = () => void

const subscribers = new Set<Subscriber>()
let frame = 0

function tick() {
  frame = requestAnimationFrame(tick)
  // `sample` reports whether the set changed, so a held chord costs nothing after the first
  // frame. See sounding.ts for why the registry works on the audio clock rather than on
  // when notes were scheduled.
  if (player().sounding.sample(player().now())) {
    for (const notify of subscribers) notify()
  }
}

function subscribe(notify: Subscriber): () => void {
  subscribers.add(notify)
  if (subscribers.size === 1) frame = requestAnimationFrame(tick)
  return () => {
    subscribers.delete(notify)
    if (subscribers.size === 0) cancelAnimationFrame(frame)
  }
}

/**
 * The set of sounding MIDI notes, re-rendering only when it changes.
 *
 * For widgets whose highlight changes a handful of times a bar — a progression's current
 * chord, a circle-of-fifths marker, a scale strip. For the keyboard and the fretboard, where
 * dozens of elements change several times a bar, use `useSoundingDom` instead.
 */
export function useSounding(): ReadonlySet<number> {
  const [notes, setNotes] = useState<ReadonlySet<number>>(() => new Set())
  useEffect(() => subscribe(() => setNotes(new Set(player().sounding.activeMidi()))), [])
  return notes
}

/**
 * The hot path: stamps `data-sounding` onto the DOM directly, with no React render at all.
 *
 * The elements are found once by their `data-midi` attribute and cached, so a frame costs a
 * couple of attribute writes rather than a reconciliation of eighty-odd keys. CSS does the
 * rest, which also means the highlight survives `prefers-reduced-motion` handling without
 * any JavaScript knowing about it.
 */
export function useSoundingDom(ref: React.RefObject<HTMLElement | null>): void {
  const lit = useRef(new Set<number>())

  useEffect(() => {
    const root = ref.current
    if (!root) return

    const cache = new Map<number, HTMLElement>()
    for (const element of root.querySelectorAll<HTMLElement>('[data-midi]')) {
      cache.set(Number(element.dataset.midi), element)
    }

    const paint = () => {
      const active = player().sounding.activeMidi()
      const { add, remove } = soundingDiff(active, lit.current)
      for (const midi of remove) cache.get(midi)?.removeAttribute('data-sounding')
      for (const midi of add) cache.get(midi)?.setAttribute('data-sounding', '')
      lit.current = new Set(active)
    }

    paint()
    const unsubscribe = subscribe(paint)
    return () => {
      unsubscribe()
      // Leaving a key lit after the widget unmounts is a stuck highlight that nothing will
      // ever clear, because the element outlives the subscription during a route change.
      for (const midi of lit.current) cache.get(midi)?.removeAttribute('data-sounding')
      lit.current = new Set()
    }
  }, [ref])
}
