import { describe, expect, it } from 'vitest'
import { midiOf, note, noteName } from './pitch.js'
import { key, keyName, writableKeys } from './key.js'
import {
  CHORD_FORMULAS,
  CHORD_QUALITIES,
  type ChordQuality,
  chord,
  chordName,
  chordNotes,
  chordPitches,
  chordSemitones,
  chordSymbol,
  diatonicSevenths,
  diatonicTriads,
  identifyChords,
  isDiatonic,
  parseChord,
  qualityOf,
} from './chord.js'

const spell = (text: string) => chordNotes(chord(text)).map((n) => noteName(n))

describe('the formulas', () => {
  it('starts every chord on its root', () => {
    for (const quality of CHORD_QUALITIES) {
      expect(CHORD_FORMULAS[quality].intervals[0], quality).toBe('P1')
    }
  })

  it('stacks every chord upwards', () => {
    for (const quality of CHORD_QUALITIES) {
      const semitones = chordSemitones(quality)
      for (let i = 1; i < semitones.length; i++) {
        expect(semitones[i]!, quality).toBeGreaterThan(semitones[i - 1]!)
      }
    }
  })

  it('gives every quality a distinct symbol', () => {
    const symbols = CHORD_QUALITIES.map((q) => CHORD_FORMULAS[q].symbol)
    expect(new Set(symbols).size).toBe(symbols.length)
  })
})

describe('spelling', () => {
  it('spells the basic triads', () => {
    expect(spell('C')).toEqual(['C', 'E', 'G'])
    expect(spell('Am')).toEqual(['A', 'C', 'E'])
    expect(spell('Bdim')).toEqual(['B', 'D', 'F'])
    expect(spell('Caug')).toEqual(['C', 'E', 'G♯'])
  })

  it('spells sevenths', () => {
    expect(spell('G7')).toEqual(['G', 'B', 'D', 'F'])
    expect(spell('Cmaj7')).toEqual(['C', 'E', 'G', 'B'])
    expect(spell('Dm7')).toEqual(['D', 'F', 'A', 'C'])
    expect(spell('Bm7b5')).toEqual(['B', 'D', 'F', 'A'])
  })

  it('gives the diminished seventh its double flat', () => {
    // C dim7 is C E♭ G♭ B♭♭. The top note sounds like A and is written as a seventh, because
    // that is what makes it a seventh CHORD rather than a sixth. Semitone arithmetic alone
    // cannot produce this, which is why the formulas are intervals.
    expect(spell('Cdim7')).toEqual(['C', 'E♭', 'G♭', 'B♭♭'])
  })

  it('keeps flat keys flat', () => {
    expect(spell('Eb')).toEqual(['E♭', 'G', 'B♭'])
    expect(spell('Abmaj7')).toEqual(['A♭', 'C', 'E♭', 'G'])
  })

  it('spells the extensions above the octave', () => {
    expect(spell('C9')).toEqual(['C', 'E', 'G', 'B♭', 'D'])
    expect(spell('C7#9')).toEqual(['C', 'E', 'G', 'B♭', 'D♯'])
  })
})

describe('pitches and inversions', () => {
  it('places a root-position chord from the octave given', () => {
    expect(chordPitches(chord('C'), 4)).toEqual([60, 64, 67])
    expect(chordPitches(chord('C'), 3)).toEqual([48, 52, 55])
  })

  it('moves the lowest note up an octave per inversion', () => {
    expect(chordPitches({ ...chord('C'), inversion: 1 }, 4)).toEqual([64, 67, 72])
    expect(chordPitches({ ...chord('C'), inversion: 2 }, 4)).toEqual([67, 72, 76])
  })

  it('wraps back to root position after a full cycle', () => {
    const root = chordPitches(chord('C'), 4)
    // Inversion counts wrap, so a triad's third inversion IS root position. The chord
    // editor relies on that: dragging the inversion control past the end comes round again
    // rather than marching the chord up the keyboard an octave at a time.
    const wrapped = chordPitches({ ...chord('C'), inversion: 3 }, 4)
    expect(wrapped).toEqual(root)
  })

  it('keeps the same pitch classes whatever the inversion', () => {
    for (let inversion = 0; inversion < 4; inversion++) {
      const classes = chordPitches({ ...chord('Cmaj7'), inversion }, 4).map((p) => p % 12)
      expect(new Set(classes)).toEqual(new Set([0, 4, 7, 11]))
    }
  })

  it('puts a slash bass below everything, even when it is near the top of the octave', () => {
    // C/B naively puts the B above the C. Dropping octaves until it is genuinely lowest is
    // what makes a slash chord sound like one.
    const pitches = chordPitches(chord('C/B'), 4)
    expect(pitches[0]).toBeLessThan(pitches[1]!)
    expect(pitches[0]! % 12).toBe(11)
  })
})

describe('symbols', () => {
  it('writes the chord the way a chart would', () => {
    expect(chordSymbol(chord('C'))).toBe('C')
    expect(chordSymbol(chord('Am7'))).toBe('Am7')
    expect(chordSymbol(chord('G7'))).toBe('G7')
    expect(chordSymbol(chord('Bm7b5'))).toBe('Bø7')
    expect(chordSymbol(chord('Cdim7'))).toBe('C°7')
  })

  it('has an ascii mode for anywhere the glyphs will not render', () => {
    expect(chordSymbol(chord('Bm7b5'), { unicode: false })).toBe('Bm7b5')
    expect(chordSymbol(chord('Cdim7'), { unicode: false })).toBe('Cdim7')
  })

  it('shows an inversion as a slash', () => {
    expect(chordSymbol({ ...chord('C'), inversion: 1 })).toBe('C/E')
    expect(chordSymbol({ ...chord('C'), inversion: 2 })).toBe('C/G')
  })

  it('round-trips every quality through parse', () => {
    for (const quality of CHORD_QUALITIES) {
      const spec = { root: note('C'), quality }
      const text = chordSymbol(spec)
      expect(parseChord(text)?.quality, text).toBe(quality)
    }
  })
})

describe('parsing', () => {
  it('reads the forms lesson data will use', () => {
    expect(parseChord('F#m7')?.quality).toBe('min7')
    expect(parseChord('Bbmaj7')?.quality).toBe('maj7')
    expect(parseChord('E5')?.quality).toBe('power')
    expect(parseChord('Dsus4')?.quality).toBe('sus4')
  })

  it('prefers the longer symbol where one is a prefix of another', () => {
    // 'maj7' must not be read as 'maj' plus a stray 7, and 'm7b5' must beat 'm7'.
    expect(parseChord('Cmaj7')?.quality).toBe('maj7')
    expect(parseChord('Cm7b5')?.quality).toBe('min7b5')
    expect(parseChord('Cm7')?.quality).toBe('min7')
  })

  it('reads a bass note that belongs to the chord as an inversion', () => {
    const parsed = parseChord('C/E')
    expect(parsed?.inversion).toBe(1)
    expect(parsed?.bass).toBeUndefined()
  })

  it('reads a bass note that does not belong to the chord as a slash', () => {
    const parsed = parseChord('C/F')
    expect(parsed?.bass && noteName(parsed.bass)).toBe('F')
    expect(parsed?.inversion).toBeUndefined()
  })

  it('returns null for nonsense', () => {
    for (const bad of ['', 'H', 'Cwhatever', 'C/H', '7']) {
      expect(parseChord(bad), bad).toBeNull()
    }
  })
})

describe('identifying a quality from notes', () => {
  it('recognises what it just built', () => {
    for (const quality of CHORD_QUALITIES) {
      const notes = chordNotes({ root: note('C'), quality })
      expect(qualityOf(notes), quality).toBe(quality)
    }
  })

  it('tells a diminished seventh from a sixth chord', () => {
    // These sound identical. They differ only in spelling, and that is exactly the
    // information roman-numeral analysis needs.
    expect(qualityOf(chordNotes(chord('Cdim7')))).toBe('dim7')
    expect(qualityOf(chordNotes(chord('Ebm6')))).toBe('min6')
  })
})

describe('the chords a key gives you', () => {
  it('follows the major-scale pattern in every major key', () => {
    // maj min min maj maj min dim, on degrees 1 to 7. Derived from the scale rather than
    // hardcoded, so this is a real cross-check rather than a restatement.
    for (const k of writableKeys('major')) {
      const qualities = diatonicTriads(k).map((spec) => spec.quality)
      expect(qualities, keyName(k)).toEqual([
        'maj', 'min', 'min', 'maj', 'maj', 'min', 'dim',
      ] satisfies ChordQuality[])
    }
  })

  it('follows the natural-minor pattern in every minor key', () => {
    for (const k of writableKeys('minor')) {
      const qualities = diatonicTriads(k).map((spec) => spec.quality)
      expect(qualities, keyName(k)).toEqual([
        'min', 'dim', 'maj', 'min', 'min', 'maj', 'maj',
      ] satisfies ChordQuality[])
    }
  })

  it('gives the seventh chords their expected qualities', () => {
    const qualities = diatonicSevenths(key('C')).map((spec) => spec.quality)
    expect(qualities).toEqual([
      'maj7', 'min7', 'min7', 'maj7', 'dom7', 'min7', 'min7b5',
    ] satisfies ChordQuality[])
  })

  it('puts exactly one dominant seventh in a major key', () => {
    // That chord is the reason the key has a pull towards home, and chapter 6 says so.
    for (const k of writableKeys('major')) {
      const dominants = diatonicSevenths(k).filter((spec) => spec.quality === 'dom7')
      expect(dominants, keyName(k)).toHaveLength(1)
    }
  })

  it('names the chords of C major the way the lesson will', () => {
    expect(diatonicTriads(key('C')).map((spec) => chordSymbol(spec))).toEqual([
      'C', 'Dm', 'Em', 'F', 'G', 'Am', 'B°',
    ])
  })

  it('spells every diatonic chord in every key without a triple accidental', () => {
    for (const mode of ['major', 'minor'] as const) {
      for (const k of writableKeys(mode)) {
        for (const spec of diatonicSevenths(k)) {
          for (const n of chordNotes(spec)) {
            expect(Math.abs(n.alter), `${keyName(k)} ${chordSymbol(spec)}`).toBeLessThanOrEqual(2)
          }
        }
        expect(diatonicSevenths(k), keyName(k)).toHaveLength(7)
      }
    }
  })

  it('says which chords belong to a key', () => {
    expect(isDiatonic(chord('F'), key('C'))).toBe(true)
    expect(isDiatonic(chord('F#'), key('C'))).toBe(false)
    // The ♭VII that rock borrows — outside the key, which is the whole point of the lesson.
    expect(isDiatonic(chord('Bb'), key('C'))).toBe(false)
  })
})

describe('naming what the learner built', () => {
  it('names a root-position triad', () => {
    const matches = identifyChords([60, 64, 67])
    expect(matches[0] && chordSymbol(matches[0].spec)).toBe('C')
    expect(matches[0]?.rootPosition).toBe(true)
  })

  it('names an inverted triad by its real root, not by its lowest note', () => {
    const matches = identifyChords([64, 67, 72])
    const symbols = matches.map((m) => chordSymbol(m.spec))
    expect(symbols).toContain('C')
  })

  it('ranks root-position readings first', () => {
    const matches = identifyChords([60, 64, 67])
    expect(matches[0]?.rootPosition).toBe(true)
  })

  it('ignores octave doublings', () => {
    expect(identifyChords([60, 64, 67, 72, 76])[0]).toBeDefined()
    expect(chordSymbol(identifyChords([60, 64, 67, 72])[0]!.spec)).toBe('C')
  })

  it('returns nothing for a single note', () => {
    expect(identifyChords([60])).toEqual([])
  })

  it('recognises every quality it can build', () => {
    for (const quality of CHORD_QUALITIES) {
      const pitches = chordPitches({ root: note('C'), quality }, 4)
      const found = identifyChords(pitches).some((m) => m.spec.quality === quality)
      expect(found, quality).toBe(true)
    }
  })
})

describe('names', () => {
  it('reads as a musician would say it', () => {
    expect(chordName(chord('C'))).toBe('C major')
    expect(chordName(chord('Am7'))).toBe('A minor seventh')
    expect(chordName(chord('G7'))).toBe('G dominant seventh')
  })

  it('keeps every blurb caption-length', () => {
    for (const quality of CHORD_QUALITIES) {
      expect(CHORD_FORMULAS[quality].blurb.length, quality).toBeLessThanOrEqual(100)
    }
  })
})

describe('midi sanity', () => {
  it('puts every chord tone at the semitone its formula asked for', () => {
    for (const quality of CHORD_QUALITIES) {
      const spec = { root: note('C4'), quality }
      const notes = chordNotes(spec)
      const semitones = chordSemitones(quality)
      notes.forEach((n, index) => {
        expect(midiOf(n) - midiOf(note('C4')), `${quality} ${index}`).toBe(semitones[index])
      })
    }
  })
})
