import { describe, expect, it } from 'vitest'
import { midiOf, note, noteName } from './pitch.js'
import {
  COMMON_INTERVALS,
  between,
  interval,
  intervalName,
  intervalShorthand,
  invert,
  isPerfectNumber,
  parseInterval,
  semitonesOf,
  simplify,
  transpose,
} from './interval.js'

describe('semitone sizes', () => {
  it('measures the intervals of the major scale', () => {
    const sizes = ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'M7', 'P8'].map((s) =>
      semitonesOf(interval(s)),
    )
    expect(sizes).toEqual([0, 2, 4, 5, 7, 9, 11, 12])
  })

  it('makes minor one semitone smaller than major', () => {
    for (const number of [2, 3, 6, 7]) {
      const major = semitonesOf({ number, quality: 'M' })
      const minor = semitonesOf({ number, quality: 'm' })
      expect(minor).toBe(major - 1)
    }
  })

  it('diminishes a major interval by two, and a perfect one by one', () => {
    // A diminished seventh is a semitone below MINOR, not below major — it passes through
    // minor on the way. Get this wrong and every diminished seventh chord is a semitone
    // too wide, which is audible and wrong in exactly the lesson about instability.
    expect(semitonesOf(interval('d7'))).toBe(semitonesOf(interval('m7')) - 1)
    expect(semitonesOf(interval('d5'))).toBe(semitonesOf(interval('P5')) - 1)
  })

  it('handles doubles', () => {
    expect(semitonesOf(interval('AA4'))).toBe(semitonesOf(interval('A4')) + 1)
    expect(semitonesOf(interval('dd5'))).toBe(semitonesOf(interval('d5')) - 1)
  })

  it('keeps compound intervals an octave above their simple form', () => {
    expect(semitonesOf(interval('M9'))).toBe(semitonesOf(interval('M2')) + 12)
    expect(semitonesOf(interval('M13'))).toBe(semitonesOf(interval('M6')) + 12)
  })
})

describe('which numbers are perfect', () => {
  it('is the unison, fourth, fifth and octave', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].filter(isPerfectNumber)).toEqual([1, 4, 5, 8])
  })

  it('carries into the compound intervals', () => {
    expect(isPerfectNumber(11)).toBe(true) // an eleventh is a compound fourth
    expect(isPerfectNumber(9)).toBe(false)
  })
})

describe('parsing', () => {
  it('reads shorthand', () => {
    expect(parseInterval('P5')).toEqual({ number: 5, quality: 'P' })
    expect(parseInterval('m3')).toEqual({ number: 3, quality: 'm' })
    expect(parseInterval('AA4')).toEqual({ number: 4, quality: 'A', degree: 2 })
  })

  it('rejects qualities that do not exist for that number', () => {
    // There is no minor fourth and no perfect third. Accepting them would let a lesson
    // silently ask for a chord that cannot be spelled.
    for (const bad of ['m4', 'M5', 'P3', 'P6', 'm1', 'X4', '5', '']) {
      expect(parseInterval(bad), bad).toBeNull()
    }
  })

  it('round-trips through its own shorthand', () => {
    for (const text of ['P1', 'm2', 'M3', 'P4', 'A4', 'd5', 'P5', 'm7', 'M13', 'AA2', 'dd7']) {
      expect(intervalShorthand(interval(text))).toBe(text)
    }
  })
})

describe('naming', () => {
  it('reads as a musician would say it', () => {
    expect(intervalName(interval('P5'))).toBe('perfect fifth')
    expect(intervalName(interval('m3'))).toBe('minor third')
    expect(intervalName(interval('A4'))).toBe('augmented fourth')
    expect(intervalName(interval('dd7'))).toBe('doubly diminished seventh')
  })
})

describe('measuring between two notes', () => {
  it('counts letters for the number and semitones for the quality', () => {
    expect(intervalShorthand(between(note('C4'), note('G4')))).toBe('P5')
    expect(intervalShorthand(between(note('C4'), note('Eb4')))).toBe('m3')
    expect(intervalShorthand(between(note('C4'), note('E4')))).toBe('M3')
  })

  it('tells the tritone apart from its enharmonic twin', () => {
    // Both are six semitones. They are different intervals: the augmented fourth spans four
    // letters and the diminished fifth spans five, and they resolve in opposite directions.
    // This is the assertion that justifies spelling notes at all.
    const augmented = between(note('C4'), note('F#4'))
    const diminished = between(note('C4'), note('Gb4'))
    expect(semitonesOf(augmented)).toBe(semitonesOf(diminished))
    expect(intervalShorthand(augmented)).toBe('A4')
    expect(intervalShorthand(diminished)).toBe('d5')
  })

  it('works across an octave boundary', () => {
    expect(intervalShorthand(between(note('B3'), note('C4')))).toBe('m2')
    expect(intervalShorthand(between(note('C4'), note('C5')))).toBe('P8')
    expect(intervalShorthand(between(note('C4'), note('D5')))).toBe('M9')
  })

  it('inverts as its own mirror', () => {
    expect(intervalShorthand(between(note('G4'), note('C4')))).toBe('P5')
  })
})

describe('transposing', () => {
  it('spells the result from the letter, not from the semitones', () => {
    // C up a minor third is E flat, never D sharp. `midi + 3` cannot tell you which.
    expect(noteName(transpose(note('C4'), interval('m3')))).toBe('E♭')
    expect(noteName(transpose(note('C4'), interval('A2')))).toBe('D♯')
  })

  it('carries the octave', () => {
    expect(noteName(transpose(note('A4'), interval('m3')), { octave: true })).toBe('C5')
    expect(noteName(transpose(note('C4'), interval('M9')), { octave: true })).toBe('D5')
  })

  it('goes down as well as up', () => {
    expect(noteName(transpose(note('C4'), interval('P5'), true), { octave: true })).toBe('F3')
    expect(noteName(transpose(note('E4'), interval('M3'), true))).toBe('C')
  })

  it('produces double accidentals where the music genuinely calls for one', () => {
    // G sharp up a major third is B sharp, not C. In G sharp major that is the correct
    // spelling and softening it to C would break the key signature.
    expect(noteName(transpose(note('G#4'), interval('M3')))).toBe('B♯')
    expect(noteName(transpose(note('F#4'), interval('A2')))).toBe('G' + '\u{1D12A}')
  })

  it('round-trips against `between` for every letter and every interval', () => {
    const intervals = ['P1', 'm2', 'M2', 'm3', 'M3', 'P4', 'A4', 'd5', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8']
    for (const letter of ['C', 'D', 'E', 'F', 'G', 'A', 'B']) {
      for (const alter of ['', '#', 'b']) {
        const start = note(`${letter}${alter}4`)
        for (const text of intervals) {
          const i = interval(text)
          const moved = transpose(start, i)
          expect(intervalShorthand(between(start, moved)), `${letter}${alter} + ${text}`).toBe(text)
          expect(midiOf(moved) - midiOf(start)).toBe(semitonesOf(i))
        }
      }
    }
  })
})

describe('inversion', () => {
  it('sums the numbers to nine and swaps the qualities', () => {
    expect(intervalShorthand(invert(interval('M3')))).toBe('m6')
    expect(intervalShorthand(invert(interval('P5')))).toBe('P4')
    expect(intervalShorthand(invert(interval('A4')))).toBe('d5')
    expect(intervalShorthand(invert(interval('m7')))).toBe('M2')
  })

  it('is its own inverse', () => {
    for (const text of ['m2', 'M3', 'P4', 'A4', 'P5', 'm6', 'M7']) {
      expect(intervalShorthand(invert(invert(interval(text))))).toBe(text)
    }
  })

  it('reduces a compound interval first', () => {
    expect(intervalShorthand(invert(interval('M9')))).toBe('m7')
  })
})

describe('simplify', () => {
  it('brings compound intervals inside an octave and leaves simple ones alone', () => {
    expect(simplify(interval('M9')).number).toBe(2)
    expect(simplify(interval('P11')).number).toBe(4)
    expect(simplify(interval('M13')).number).toBe(6)
    expect(simplify(interval('P8')).number).toBe(8)
    expect(simplify(interval('m3')).number).toBe(3)
  })
})

describe('the interval list lessons use', () => {
  it('covers every semitone from unison to octave exactly once', () => {
    const sizes = COMMON_INTERVALS.map((entry) => semitonesOf(interval(entry.shorthand)))
    expect(sizes).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })

  it('names every entry with real shorthand', () => {
    for (const entry of COMMON_INTERVALS) {
      expect(parseInterval(entry.shorthand), entry.shorthand).not.toBeNull()
      expect(entry.blurb.length).toBeLessThanOrEqual(80)
    }
  })
})
