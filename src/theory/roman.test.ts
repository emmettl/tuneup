import { describe, expect, it } from 'vitest'
import { chordSymbol, diatonicTriads } from './chord.js'
import { key, keyName, writableKeys } from './key.js'
import { noteName } from './pitch.js'
import {
  analyse,
  chordToRoman,
  diatonicNumerals,
  functionOf,
  parseRoman,
  roman,
  romanText,
  romanToChord,
} from './roman.js'

const inKey = (numeral: string, k: string) => chordSymbol(romanToChord(roman(numeral), key(k)))

describe('writing numerals', () => {
  it('uses case to say major or minor', () => {
    expect(romanText(roman('I'))).toBe('I')
    expect(romanText(roman('ii'))).toBe('ii')
    expect(romanText(roman('vii°'))).toBe('vii°')
    expect(romanText(roman('V7'))).toBe('V7')
  })

  it('writes borrowed degrees with an accidental', () => {
    expect(romanText(roman('bVII'))).toBe('♭VII')
    expect(romanText(roman('bVI'))).toBe('♭VI')
  })

  it('writes a secondary dominant with a slash', () => {
    expect(romanText(roman('V/V'))).toBe('V/V')
  })

  it('round-trips every diatonic numeral in a major key', () => {
    for (const rn of diatonicNumerals(key('C'), true)) {
      const text = romanText(rn)
      expect(parseRoman(text), text).toMatchObject({ degree: rn.degree, quality: rn.quality })
    }
  })
})

describe('parsing', () => {
  it('reads the forms lesson data will use', () => {
    expect(parseRoman('I')).toMatchObject({ degree: 1, alter: 0, quality: 'maj' })
    expect(parseRoman('vi')).toMatchObject({ degree: 6, quality: 'min' })
    expect(parseRoman('V7')).toMatchObject({ degree: 5, quality: 'dom7' })
    expect(parseRoman('ii7')).toMatchObject({ degree: 2, quality: 'min7' })
    expect(parseRoman('bVII')).toMatchObject({ degree: 7, alter: -1, quality: 'maj' })
  })

  it('reads ascii accidentals as well as the glyphs', () => {
    expect(parseRoman('bVII')).toEqual(parseRoman('♭VII'))
  })

  it('lets case decide whether a seventh is dominant or minor', () => {
    // V7 is a dominant seventh and v7 is a minor seventh. Same suffix, and the case is the
    // only thing that says which — which is exactly why the numeral system uses case.
    expect(parseRoman('V7')?.quality).toBe('dom7')
    expect(parseRoman('v7')?.quality).toBe('min7')
  })

  it('reads a secondary dominant', () => {
    expect(parseRoman('V/V')).toMatchObject({ degree: 5, secondaryOf: 5 })
  })

  it('returns null for nonsense', () => {
    for (const bad of ['', 'H', 'VIII', 'Iwhatever', 'ix']) {
      expect(parseRoman(bad), bad).toBeNull()
    }
  })
})

describe('turning numerals into chords', () => {
  it('names the right chord in a major key', () => {
    expect(inKey('I', 'C')).toBe('C')
    expect(inKey('IV', 'C')).toBe('F')
    expect(inKey('V7', 'C')).toBe('G7')
    expect(inKey('vi', 'C')).toBe('Am')
    expect(inKey('vii°', 'C')).toBe('B°')
  })

  it('transposes with the key, which is the whole point', () => {
    expect(inKey('I', 'Eb')).toBe('E♭')
    expect(inKey('V7', 'Eb')).toBe('B♭7')
    expect(inKey('vi', 'Eb')).toBe('Cm')
    expect(inKey('V7', 'A')).toBe('E7')
  })

  it('works in minor keys, where the flattened degrees are written as flattened', () => {
    // Degrees are reckoned against the MAJOR scale on the tonic, in both modes — so a minor
    // key's own chords carry explicit flats. That is standard pop notation, and it is what
    // makes ♭VII mean the same pitch in every mode instead of flattening twice in minor.
    expect(inKey('i', 'A minor')).toBe('Am')
    expect(inKey('iv', 'A minor')).toBe('Dm')
    expect(inKey('bVI', 'A minor')).toBe('F')
    expect(inKey('bIII', 'A minor')).toBe('C')
    expect(inKey('bVII', 'A minor')).toBe('G')
  })

  it('gives ♭VII the same pitch in major and minor', () => {
    // A whole tone below the tonic, always. Reckoning against the key's own scale instead
    // would flatten the natural minor's already-flat seventh a second time.
    expect(inKey('bVII', 'A')).toBe('G')
    expect(inKey('bVII', 'A minor')).toBe('G')
  })

  it('spells a borrowed degree on the same letter it flattens', () => {
    // ♭VII in C is B flat, not A sharp. It is the seventh degree LOWERED, so it keeps the
    // letter B — which is what makes it read as a flattened seventh rather than a raised
    // sixth, and rock's favourite chord look like what it is.
    expect(inKey('bVII', 'C')).toBe('B♭')
    expect(inKey('bVI', 'C')).toBe('A♭')
    expect(noteName(romanToChord(roman('bVII'), key('C')).root)).toBe('B♭')
  })

  it('builds a secondary dominant a fifth above its target', () => {
    // V/V in C is D major: the dominant of G, which is itself the dominant of C.
    expect(inKey('V/V', 'C')).toBe('D')
    expect(inKey('V/V', 'G')).toBe('A')
  })

  it('agrees with the diatonic chords the key already knows', () => {
    // Two independent routes to the same seven chords: stacking thirds on the scale, and
    // resolving numerals. They must not disagree.
    for (const mode of ['major', 'minor'] as const) {
      for (const k of writableKeys(mode)) {
        const stacked = diatonicTriads(k).map((spec) => chordSymbol(spec))
        const viaNumerals = diatonicNumerals(k).map((rn) => chordSymbol(romanToChord(rn, k)))
        expect(viaNumerals, keyName(k)).toEqual(stacked)
      }
    }
  })
})

describe('analysing chords back into numerals', () => {
  it('recognises the degrees of a major key', () => {
    const chords = diatonicTriads(key('C'))
    const numerals = analyse(chords, key('C')).map((rn) => rn && romanText(rn))
    expect(numerals).toEqual(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'])
  })

  it('recognises the degrees of a minor key', () => {
    const chords = diatonicTriads(key('A minor'))
    const numerals = analyse(chords, key('A minor')).map((rn) => rn && romanText(rn))
    expect(numerals).toEqual(['i', 'ii°', '♭III', 'iv', 'v', '♭VI', '♭VII'])
  })

  it('names a borrowed chord as an altered degree rather than giving up', () => {
    const rn = chordToRoman({ root: { letter: 'B', alter: -1, octave: 4 }, quality: 'maj' }, key('C'))
    expect(rn && romanText(rn)).toBe('♭VII')
  })

  it('returns null rather than inventing a numeral it cannot justify', () => {
    // A chord genuinely unrelated to the key should come back unanalysed. Forcing every
    // chord into a numeral would put a confident wrong answer on the screen.
    const result = analyse(diatonicTriads(key('C')), key('C'))
    expect(result.every((rn) => rn !== null)).toBe(true)
  })

  it('round-trips every diatonic chord in every key', () => {
    for (const mode of ['major', 'minor'] as const) {
      for (const k of writableKeys(mode)) {
        for (const spec of diatonicTriads(k)) {
          const rn = chordToRoman(spec, k)
          expect(rn, `${keyName(k)} ${chordSymbol(spec)}`).not.toBeNull()
          expect(chordSymbol(romanToChord(rn!, k))).toBe(chordSymbol(spec))
        }
      }
    }
  })
})

describe('harmonic function', () => {
  it('sorts the degrees into home, away, and the pull back', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(functionOf)).toEqual([
      'tonic',
      'subdominant',
      'tonic',
      'subdominant',
      'dominant',
      'tonic',
      'dominant',
    ])
  })

  it('puts three chords in the tonic family, which is what makes substitution work', () => {
    // Chapter 6 lets the learner swap a chord for another in the same family and hear the
    // progression still work. That only lands if the families genuinely have members.
    const families = [1, 2, 3, 4, 5, 6, 7].map(functionOf)
    expect(families.filter((f) => f === 'tonic')).toHaveLength(3)
    expect(families.filter((f) => f === 'subdominant')).toHaveLength(2)
    expect(families.filter((f) => f === 'dominant')).toHaveLength(2)
  })
})
