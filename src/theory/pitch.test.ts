import { describe, expect, it } from 'vitest'
import {
  LETTERS,
  diatonicIndex,
  enharmonic,
  enharmonics,
  frequency,
  letterIndex,
  midiOf,
  midiOfFrequency,
  note,
  noteName,
  parseNote,
  pitchClassOf,
  spellMidi,
} from './pitch.js'

describe('midi numbers', () => {
  it('puts middle C at 60', () => {
    expect(midiOf(note('C4'))).toBe(60)
    expect(midiOf(note('A4'))).toBe(69)
    expect(midiOf(note('C-1'))).toBe(0)
  })

  it('applies the alteration on top of the letter', () => {
    expect(midiOf(note('C#4'))).toBe(61)
    expect(midiOf(note('Db4'))).toBe(61)
    expect(midiOf(note('Cx4'))).toBe(62)
    expect(midiOf(note('Dbb4'))).toBe(60)
  })

  it('crosses the octave boundary by sound, not by letter', () => {
    // B#3 sounds as C4. The letter says octave 3 and the ear says 60, and the ear is the one
    // MIDI has to agree with — otherwise a leading note in C# minor plays an octave low.
    expect(midiOf(note('B#3'))).toBe(60)
    expect(midiOf(note('Cb4'))).toBe(59)
  })
})

describe('the diatonic axis', () => {
  it('numbers the letters from C', () => {
    expect(LETTERS.map((letter) => letterIndex({ letter, alter: 0, octave: 4 }))).toEqual([
      0, 1, 2, 3, 4, 5, 6,
    ])
  })

  it('ignores the alteration', () => {
    // The whole point: F# and Fb are both the letter F, which is what makes the interval
    // from C to either of them a FOURTH of some quality rather than a third or a fifth.
    expect(letterIndex(note('F#4'))).toBe(letterIndex(note('Fb4')))
  })

  it('counts octaves, so a rising line always rises', () => {
    expect(diatonicIndex(note('B4'))).toBeLessThan(diatonicIndex(note('C5')))
  })
})

describe('parsing', () => {
  it('reads the forms lessons will be written in', () => {
    expect(parseNote('C')).toEqual({ letter: 'C', alter: 0, octave: 4 })
    expect(parseNote('bb3')).toEqual({ letter: 'B', alter: -1, octave: 3 })
    expect(parseNote('F♯5')).toEqual({ letter: 'F', alter: 1, octave: 5 })
    expect(parseNote('  G2  ')).toEqual({ letter: 'G', alter: 0, octave: 2 })
  })

  it('reads both double-accidental glyphs', () => {
    expect(midiOf(note('C\u{1D12A}4'))).toBe(62)
    expect(midiOf(note('D\u{1D12B}4'))).toBe(60)
  })

  it('returns null for things that are not notes', () => {
    for (const bad of ['H', '', 'C#|', '4', 'Cbbb', 'C###', 'C#b#']) {
      expect(parseNote(bad), bad).toBeNull()
    }
  })

  it('round-trips through its own name, in both glyph styles', () => {
    for (let midi = 21; midi <= 108; midi++) {
      for (const prefer of ['sharp', 'flat'] as const) {
        const n = spellMidi(midi, prefer)
        for (const unicode of [true, false]) {
          const text = noteName(n, { octave: true, unicode })
          expect(parseNote(text), text).toEqual(n)
        }
      }
    }
  })
})

describe('names', () => {
  it('omits the octave unless asked, because lessons talk about pitch classes', () => {
    expect(noteName(note('F#4'))).toBe('F♯')
    expect(noteName(note('F#4'), { octave: true })).toBe('F♯4')
  })

  it('has an ascii mode for anywhere the glyphs will not render', () => {
    expect(noteName(note('Bb3'), { unicode: false })).toBe('Bb')
    expect(noteName(note('Cx3'), { unicode: false })).toBe('Cx')
  })
})

describe('enharmonics', () => {
  it('recognises the same sound under different names', () => {
    expect(enharmonic(note('C#4'), note('Db4'))).toBe(true)
    expect(enharmonic(note('B#3'), note('C4'))).toBe(true)
    // Same name, different octave, is not the same note.
    expect(enharmonic(note('C4'), note('C5'))).toBe(false)
  })

  it('finds the alternatives, naturals first', () => {
    const names = enharmonics(note('C#4')).map((n) => noteName(n, { octave: true }))
    expect(names).toContain('D♭4')
    expect(names).toContain('C♯4')
    expect(names).toContain('B♯♯3')
  })

  it('keeps every alternative at the same sounding pitch', () => {
    // The octave has to be derived per spelling. B#3 is C4, so carrying the input's octave
    // through would put that pair an octave apart and the enharmonics lesson would play two
    // audibly different notes while claiming they are identical.
    for (let midi = 48; midi <= 72; midi++) {
      for (const n of enharmonics(spellMidi(midi))) {
        expect(midiOf(n), noteName(n, { octave: true })).toBe(midi)
      }
    }
  })
})

describe('frequency', () => {
  it('anchors on A4', () => {
    expect(frequency(69)).toBeCloseTo(440)
    expect(frequency(69, 432)).toBeCloseTo(432)
  })

  it('doubles every octave', () => {
    expect(frequency(81)).toBeCloseTo(880)
    expect(frequency(57)).toBeCloseTo(220)
  })

  it('accepts fractional midi, so a bend is not rounded away', () => {
    const flat = frequency(69)
    const bent = frequency(69.5)
    expect(bent).toBeGreaterThan(flat)
    expect(bent).toBeLessThan(frequency(70))
  })

  it('inverts', () => {
    for (const midi of [40, 60, 69, 88.25]) {
      expect(midiOfFrequency(frequency(midi))).toBeCloseTo(midi)
    }
  })
})

describe('spelling a midi number', () => {
  it('honours the preference on the black keys and ignores it on the white ones', () => {
    expect(noteName(spellMidi(61, 'sharp'))).toBe('C♯')
    expect(noteName(spellMidi(61, 'flat'))).toBe('D♭')
    expect(noteName(spellMidi(60, 'flat'))).toBe('C')
  })

  it('never invents an accidental for a natural', () => {
    // A naive flat-preferring table spells E as Fb, which is correct arithmetic and wrong
    // music: nothing in a lesson should ever show Fb where E was meant.
    for (const midi of [60, 62, 64, 65, 67, 69, 71]) {
      expect(spellMidi(midi, 'flat').alter).toBe(0)
      expect(spellMidi(midi, 'sharp').alter).toBe(0)
    }
  })

  it('round-trips every midi number in both preferences', () => {
    for (let midi = 0; midi <= 127; midi++) {
      expect(midiOf(spellMidi(midi, 'sharp'))).toBe(midi)
      expect(midiOf(spellMidi(midi, 'flat'))).toBe(midi)
    }
  })

  it('agrees with pitchClassOf', () => {
    for (let midi = 0; midi <= 127; midi++) {
      expect(pitchClassOf(spellMidi(midi))).toBe(midi % 12)
    }
  })
})
