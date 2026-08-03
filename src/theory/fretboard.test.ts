import { describe, expect, it } from 'vitest'
import {
  TUNINGS,
  boxAt,
  fretMidi,
  positionsOf,
  rootFret,
  scaleMarks,
} from './fretboard.js'
import { midiOf, note } from './pitch.js'
import { pitchClassSet } from './scale.js'

const guitar = TUNINGS.guitar

describe('tunings', () => {
  it('puts standard tuning where a guitar actually is', () => {
    expect(guitar.strings).toEqual([40, 45, 50, 55, 59, 64])
    expect(fretMidi(guitar, 0, 0)).toBe(midiOf(note('E2')))
    expect(fretMidi(guitar, 5, 0)).toBe(midiOf(note('E4')))
  })

  it('spaces the strings a fourth apart, except the one that is not', () => {
    // The major third between strings 3 and 4 is why guitar shapes break across that
    // boundary, and it is the single most confusing thing about the instrument.
    const gaps = guitar.strings.slice(1).map((s, i) => s - guitar.strings[i]!)
    expect(gaps).toEqual([5, 5, 5, 4, 5])
  })

  it('drops only the lowest string in drop D', () => {
    expect(TUNINGS['drop-d'].strings[0]).toBe(guitar.strings[0]! - 2)
    expect(TUNINGS['drop-d'].strings.slice(1)).toEqual(guitar.strings.slice(1))
  })
})

describe('positions', () => {
  it('finds every place a note can be played', () => {
    // A keyboard has one middle C; a guitar has several, and that redundancy is what makes
    // shapes possible at all.
    const places = positionsOf(guitar, midiOf(note('E4')))
    expect(places.length).toBeGreaterThan(1)
    for (const place of places) expect(fretMidi(guitar, place.string, place.fret)).toBe(midiOf(note('E4')))
  })

  it('never returns a negative fret', () => {
    for (const place of positionsOf(guitar, midiOf(note('E2')))) {
      expect(place.fret).toBeGreaterThanOrEqual(0)
    }
  })

  it('respects the fret limit', () => {
    for (const place of positionsOf(guitar, midiOf(note('C6')), 12)) {
      expect(place.fret).toBeLessThanOrEqual(12)
    }
  })
})

describe('scale marks', () => {
  it('only marks notes that are in the scale', () => {
    const set = pitchClassSet(note('A'), 'minor-pentatonic')
    for (const mark of scaleMarks(guitar, note('A'), 'minor-pentatonic', [0, 12])) {
      expect(set.has(((mark.midi % 12) + 12) % 12), `${mark.string}:${mark.fret}`).toBe(true)
    }
  })

  it('numbers the degrees from the root', () => {
    const marks = scaleMarks(guitar, note('A'), 'minor-pentatonic', [5, 5])
    const root = marks.find((m) => m.root)
    expect(root?.degree).toBe(1)
    for (const mark of marks) {
      expect(mark.degree).toBeGreaterThanOrEqual(1)
      expect(mark.degree).toBeLessThanOrEqual(5)
    }
  })

  it('marks the root everywhere it appears', () => {
    const marks = scaleMarks(guitar, note('A'), 'minor-pentatonic', [0, 12])
    const roots = marks.filter((m) => m.root)
    expect(roots.length).toBeGreaterThan(3)
    for (const mark of roots) expect(((mark.midi % 12) + 12) % 12).toBe(9)
  })

  it('stays inside the fret range', () => {
    for (const mark of scaleMarks(guitar, note('A'), 'blues', [5, 8])) {
      expect(mark.fret).toBeGreaterThanOrEqual(5)
      expect(mark.fret).toBeLessThanOrEqual(8)
    }
  })
})

describe('boxes', () => {
  it('finds the first box where the root is on the lowest string', () => {
    // A minor pentatonic's box one starts at the fifth fret, because A is five semitones
    // above the open low E. Derived, not remembered.
    expect(rootFret(guitar, note('A'))).toBe(5)
    expect(rootFret(guitar, note('E'))).toBe(0)
    expect(rootFret(guitar, note('G'))).toBe(3)
  })

  it('gives two notes per string in a pentatonic box, which is what makes it playable', () => {
    const box = boxAt(guitar, note('A'), 'minor-pentatonic', 5, 3)
    for (let string = 0; string < guitar.strings.length; string++) {
      const onString = box.filter((m) => m.string === string)
      expect(onString.length, `string ${string}`).toBe(2)
    }
  })

  it('transposes by moving, with the shape intact', () => {
    // The whole reason guitarists think in shapes: the same fingering two frets up is the
    // same scale a tone higher, with nothing to rethink.
    const a = boxAt(guitar, note('A'), 'minor-pentatonic', 5, 3)
    const b = boxAt(guitar, note('B'), 'minor-pentatonic', 7, 3)
    expect(b).toHaveLength(a.length)
    a.forEach((mark, index) => {
      expect(b[index]!.string).toBe(mark.string)
      expect(b[index]!.fret - mark.fret).toBe(2)
      expect(b[index]!.degree).toBe(mark.degree)
    })
  })
})
