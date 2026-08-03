import { describe, expect, it } from 'vitest'
import {
  QWERTY_OFFSETS,
  capForMidi,
  isBlackKey,
  keyAt,
  layoutKeys,
  midiForCode,
  whiteBounded,
  whiteKeyCount,
} from './keyboard-layout.js'

const octave = (from = 60, to = 72, width = 700, height = 160) =>
  layoutKeys({ from, to, width, height })

describe('which keys are black', () => {
  it('puts them where a piano puts them', () => {
    const pattern = Array.from({ length: 12 }, (_, semitone) => isBlackKey(60 + semitone))
    expect(pattern).toEqual([
      false, true, false, true, false, // C C# D D# E
      false, true, false, true, false, true, false, // F F# G G# A A# B
    ])
  })

  it('leaves the two gaps that make a keyboard legible', () => {
    // E to F and B to C are the only adjacent white pairs. They are how anyone finds middle C
    // without counting, and colouring keys by scale degree instead would move them.
    expect(isBlackKey(64)).toBe(false) // E
    expect(isBlackKey(65)).toBe(false) // F
    expect(isBlackKey(71)).toBe(false) // B
    expect(isBlackKey(72)).toBe(false) // C
  })

  it('repeats every octave', () => {
    for (let midi = 21; midi <= 108 - 12; midi++) {
      expect(isBlackKey(midi), `${midi}`).toBe(isBlackKey(midi + 12))
    }
  })
})

describe('counting white keys', () => {
  it('counts eight from C to C', () => {
    expect(whiteKeyCount(60, 72)).toBe(8)
  })

  it('counts seven in an octave that excludes the top note', () => {
    expect(whiteKeyCount(60, 71)).toBe(7)
  })

  it('counts 52 across a full 88-key piano', () => {
    expect(whiteKeyCount(21, 108)).toBe(52)
  })
})

describe('layout', () => {
  it('returns every key in the range', () => {
    expect(octave()).toHaveLength(13)
  })

  it('tiles the white keys edge to edge across the full width', () => {
    const whites = octave().filter((key) => !key.black).sort((a, b) => a.x - b.x)
    expect(whites[0]!.x).toBe(0)
    expect(whites.at(-1)!.x + whites.at(-1)!.width).toBeCloseTo(700)
    for (let index = 1; index < whites.length; index++) {
      expect(whites[index]!.x).toBeCloseTo(whites[index - 1]!.x + whites[index - 1]!.width)
    }
  })

  it('straddles each black key over the boundary between its neighbours', () => {
    const keys = octave()
    const white = (midi: number) => keys.find((key) => key.midi === midi)!
    const black = (midi: number) => keys.find((key) => key.midi === midi)!
    // C# sits over the join between C and D.
    const boundary = white(60).x + white(60).width
    expect(black(61).x + black(61).width / 2).toBeCloseTo(boundary)
  })

  it('makes black keys narrower and shorter', () => {
    const keys = octave()
    const white = keys.find((key) => !key.black)!
    const blackKey = keys.find((key) => key.black)!
    expect(blackKey.width).toBeLessThan(white.width)
    expect(blackKey.height).toBeLessThan(white.height)
  })

  it('returns the black keys last, so drawing in order puts them on top', () => {
    // Saves a z-index, and more importantly makes the paint order match the hit-test order.
    const keys = octave()
    const firstBlack = keys.findIndex((key) => key.black)
    const lastWhite = keys.map((key) => key.black).lastIndexOf(false)
    expect(firstBlack).toBeGreaterThan(lastWhite)
  })

  it('handles an empty range without dividing by zero', () => {
    expect(layoutKeys({ from: 61, to: 61, width: 100, height: 100 })).toEqual([])
  })
})

describe('hit testing', () => {
  const keys = octave()
  const box = (midi: number) => keys.find((key) => key.midi === midi)!

  it('finds the key under a point', () => {
    const c = box(60)
    expect(keyAt(c.x + c.width / 2, 150, keys)).toBe(60)
  })

  it('gives the overlap to the black key, as a real keyboard does', () => {
    // A point high up where a black key overlaps a white one belongs to the black key,
    // because that is what is physically under the finger.
    //
    // Sampled a quarter of the way across C sharp rather than at its centre: the centre sits
    // exactly on the C/D boundary, and a boundary belongs to the key on its right. Correct,
    // but it makes for a test that asserts a coin-flip.
    const cSharp = box(61)
    const overC = cSharp.x + cSharp.width * 0.25
    const overD = cSharp.x + cSharp.width * 0.75
    expect(keyAt(overC, 10, keys)).toBe(61)
    expect(keyAt(overD, 10, keys)).toBe(61)
    // Below the black key's bottom edge, the same two points are the white keys either side.
    expect(keyAt(overC, cSharp.height + 5, keys)).toBe(60)
    expect(keyAt(overD, cSharp.height + 5, keys)).toBe(62)
  })

  it('returns null outside the keyboard', () => {
    expect(keyAt(-5, 50, keys)).toBeNull()
    expect(keyAt(9999, 50, keys)).toBeNull()
    expect(keyAt(10, -1, keys)).toBeNull()
    expect(keyAt(10, 500, keys)).toBeNull()
  })

  it('covers the whole surface, with no dead gaps between keys', () => {
    // A dead pixel between two keys makes a glissando stutter, and it is invisible until
    // someone drags slowly across the join.
    for (let x = 0; x < 700; x += 1) {
      expect(keyAt(x + 0.5, 150, keys), `x=${x}`).not.toBeNull()
    }
  })

  it('walks up in pitch as the point moves right', () => {
    let previous = -Infinity
    for (let x = 0; x < 700; x += 3) {
      const midi = keyAt(x + 0.5, 150, keys)
      if (midi === null) continue
      expect(midi).toBeGreaterThanOrEqual(previous)
      previous = midi
    }
  })
})

describe('white-bounded ranges', () => {
  it('widens a range that starts or ends on a black key', () => {
    // A keyboard starting on a black key has it hanging off the edge with nothing under it,
    // which reads as a rendering bug rather than a choice.
    expect(whiteBounded(61, 70)).toEqual([60, 71])
    expect(whiteBounded(60, 72)).toEqual([60, 72])
  })
})

describe('the computer keyboard mapping', () => {
  it('spells a major scale along the home row', () => {
    const homeRow = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK']
    expect(homeRow.map((code) => midiForCode(code, 60))).toEqual([60, 62, 64, 65, 67, 69, 71, 72])
  })

  it('puts the black keys on the row above, with the gaps in the right places', () => {
    // No key between E and F, and none between B and C. The upper row's gaps have to line up
    // with the keyboard's, or the mapping is arbitrary rather than learnable.
    const upper = ['KeyW', 'KeyE', 'KeyT', 'KeyY', 'KeyU', 'KeyO', 'KeyP']
    expect(upper.map((code) => midiForCode(code, 60))).toEqual([61, 63, 66, 68, 70, 73, 75])
    expect(midiForCode('KeyR', 60)).toBeNull() // between E and F — deliberately unmapped
  })

  it('transposes with the base note', () => {
    expect(midiForCode('KeyA', 48)).toBe(48)
    expect(midiForCode('KeyA', 72)).toBe(72)
  })

  it('ignores keys it does not map', () => {
    expect(midiForCode('KeyZ', 60)).toBeNull()
    expect(midiForCode('Space', 60)).toBeNull()
  })

  it('maps every offset to a distinct note, so no two caps play the same key', () => {
    const semitones = QWERTY_OFFSETS.map((entry) => entry.semitone)
    expect(new Set(semitones).size).toBe(semitones.length)
  })

  it('names the cap for a note, for the labels', () => {
    expect(capForMidi(60, 60)).toBe('a')
    expect(capForMidi(61, 60)).toBe('w')
    expect(capForMidi(76, 60)).toBe(';')
    expect(capForMidi(90, 60)).toBeNull()
  })
})
