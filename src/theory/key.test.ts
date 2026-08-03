import { describe, expect, it } from 'vitest'
import { midiOf, noteName } from './pitch.js'
import {
  circleDistance,
  circleOfFifths,
  conventionalTonic,
  dominantKey,
  fifthsOf,
  key,
  keyFromFifths,
  keyName,
  keyScale,
  keySignature,
  noteAtFifths,
  parallel,
  parseKey,
  relative,
  spellInKey,
  spellsCleanly,
  subdominantKey,
  writableKeys,
} from './key.js'

describe('position on the circle', () => {
  it('puts C at zero and counts fifths outwards', () => {
    expect(fifthsOf(key('C'))).toBe(0)
    expect(fifthsOf(key('G'))).toBe(1)
    expect(fifthsOf(key('D'))).toBe(2)
    expect(fifthsOf(key('F'))).toBe(-1)
    expect(fifthsOf(key('Bb'))).toBe(-2)
    expect(fifthsOf(key('F# major'))).toBe(6)
    expect(fifthsOf(key('Cb major'))).toBe(-7)
  })

  it('gives a minor key the same position as its relative major', () => {
    expect(fifthsOf(key('A minor'))).toBe(0)
    expect(fifthsOf(key('E minor'))).toBe(1)
    expect(fifthsOf(key('D minor'))).toBe(-1)
    expect(fifthsOf(key('F# minor'))).toBe(3)
  })

  it('round-trips through keyFromFifths', () => {
    for (let fifths = -7; fifths <= 7; fifths++) {
      for (const mode of ['major', 'minor'] as const) {
        expect(fifthsOf(keyFromFifths(fifths, mode))).toBe(fifths)
      }
    }
  })

  it('names the note at each position', () => {
    expect(noteName(noteAtFifths(0))).toBe('C')
    expect(noteName(noteAtFifths(1))).toBe('G')
    expect(noteName(noteAtFifths(-1))).toBe('F')
    expect(noteName(noteAtFifths(6))).toBe('F♯')
    expect(noteName(noteAtFifths(-6))).toBe('G♭')
  })
})

describe('key signatures', () => {
  it('counts accidentals to match the position on the circle', () => {
    for (let fifths = -7; fifths <= 7; fifths++) {
      const signature = keySignature(keyFromFifths(fifths, 'major'))
      expect(signature.letters.length, `${fifths}`).toBe(Math.abs(fifths))
      expect(signature.kind).toBe(fifths === 0 ? 'none' : fifths > 0 ? 'sharp' : 'flat')
    }
  })

  it('writes sharps in F C G D A E B order', () => {
    expect(keySignature(key('G')).letters).toEqual(['F'])
    expect(keySignature(key('D')).letters).toEqual(['F', 'C'])
    expect(keySignature(key('A')).letters).toEqual(['F', 'C', 'G'])
    expect(keySignature(key('C# major')).letters).toEqual(['F', 'C', 'G', 'D', 'A', 'E', 'B'])
  })

  it('writes flats in the same order backwards', () => {
    expect(keySignature(key('F')).letters).toEqual(['B'])
    expect(keySignature(key('Bb')).letters).toEqual(['B', 'E'])
    expect(keySignature(key('Eb')).letters).toEqual(['B', 'E', 'A'])
  })

  it('gives a minor key its relative major signature', () => {
    expect(keySignature(key('A minor')).letters).toEqual([])
    expect(keySignature(key('E minor')).letters).toEqual(['F'])
    expect(keySignature(key('C minor')).letters).toEqual(['B', 'E', 'A'])
  })

  it('agrees with how the scale is actually spelled', () => {
    // The signature and the scale are computed by completely different routes — one from a
    // fifths count, the other from letter offsets and semitone arithmetic. If they ever
    // disagree, one of them is lying to the learner.
    for (const mode of ['major', 'minor'] as const) {
      for (const k of writableKeys(mode)) {
        const signature = keySignature(k)
        const altered = keyScale(k).filter((n) => n.alter !== 0)
        expect(altered.length, keyName(k)).toBe(signature.letters.length)
        for (const n of altered) {
          expect(signature.letters, keyName(k)).toContain(n.letter)
          expect(n.alter, `${keyName(k)} ${noteName(n)}`).toBe(signature.kind === 'sharp' ? 1 : -1)
        }
      }
    }
  })
})

describe('relationships', () => {
  it('finds the relative minor a third below', () => {
    expect(keyName(relative(key('C')))).toBe('A minor')
    expect(keyName(relative(key('G')))).toBe('E minor')
    expect(keyName(relative(key('Eb')))).toBe('C minor')
  })

  it('makes relative its own inverse', () => {
    for (const k of writableKeys('major')) {
      expect(keyName(relative(relative(k)))).toBe(keyName(k))
    }
  })

  it('shares a signature with the relative, and not with the parallel', () => {
    expect(fifthsOf(relative(key('C')))).toBe(fifthsOf(key('C')))
    expect(fifthsOf(parallel(key('C')))).not.toBe(fifthsOf(key('C')))
    // C minor is three flats away from C major — which is why the parallel switch feels
    // like a bigger move than the relative one, and the lesson says so.
    expect(fifthsOf(parallel(key('C')))).toBe(-3)
  })

  it('steps one accidental at a time round the circle', () => {
    // This is the chapter 3 dial: one click, one note changes. If the count ever moved by
    // more than one the widget's whole premise would be false.
    let k = key('C')
    for (let step = 0; step < 6; step++) {
      const before = keySignature(k).fifths
      k = dominantKey(k)
      expect(keySignature(k).fifths).toBe(before + 1)
    }
    expect(keyName(subdominantKey(key('C')))).toBe('F major')
  })
})

describe('distance', () => {
  it('is zero for a key with itself and one for its neighbours', () => {
    expect(circleDistance(key('C'), key('C'))).toBe(0)
    expect(circleDistance(key('C'), key('G'))).toBe(1)
    expect(circleDistance(key('C'), key('F'))).toBe(1)
  })

  it('counts the short way round', () => {
    // C to B is five sharps by signature, but they are neighbours on the wheel going the
    // other way — which is what a listener hears and what the dial shows.
    expect(circleDistance(key('C'), key('B'))).toBe(5)
    expect(circleDistance(key('C'), key('Db'))).toBe(5)
    expect(circleDistance(key('C'), key('F# major'))).toBe(6)
  })

  it('is zero between relatives, because they are the same signature', () => {
    expect(circleDistance(key('C'), key('A minor'))).toBe(0)
  })
})

describe('the circle itself', () => {
  const circle = circleOfFifths()

  it('has twelve positions, because it is a wheel', () => {
    expect(circle).toHaveLength(12)
  })

  it('starts at C major and A minor', () => {
    expect(keyName(circle[0]!.major)).toBe('C major')
    expect(keyName(circle[0]!.minor)).toBe('A minor')
  })

  it('never asks for more than six accidentals', () => {
    // Past six the enharmonic spelling is the readable one, and a dial showing seven sharps
    // next to five flats looks broken.
    for (const position of circle) {
      expect(Math.abs(position.signature.fifths), keyName(position.major)).toBeLessThanOrEqual(6)
    }
  })

  it('covers all twelve pitch classes exactly once', () => {
    const roots = new Set(circle.map((p) => midiOf(p.major.tonic) % 12))
    expect(roots.size).toBe(12)
  })

  it('pairs each major with the minor that shares its signature', () => {
    for (const position of circle) {
      expect(keyName(relative(position.major))).toBe(keyName(position.minor))
    }
  })
})

describe('parsing and naming', () => {
  it('reads the forms lesson data will use', () => {
    expect(keyName(key('C'))).toBe('C major')
    expect(keyName(key('Eb major'))).toBe('E♭ major')
    expect(keyName(key('f# minor'))).toBe('F♯ minor')
    expect(keyName(key('A min'))).toBe('A minor')
  })

  it('defaults a bare note to major', () => {
    expect(parseKey('D')?.mode).toBe('major')
  })

  it('returns null for nonsense', () => {
    for (const bad of ['', 'H major', 'C sideways', 'major']) {
      expect(parseKey(bad), bad).toBeNull()
    }
  })
})

describe('spelling in a key', () => {
  it('uses the scale spelling for in-key notes', () => {
    expect(noteName(spellInKey(63, key('Eb')))).toBe('E♭')
    expect(noteName(spellInKey(66, key('D')))).toBe('F♯')
  })

  it('follows the signature direction for notes outside the key', () => {
    // A chromatic passing note in E flat major is an A flat, not a G sharp. Getting this
    // backwards makes a printed example look like it was written by someone guessing.
    expect(noteName(spellInKey(61, key('Eb')))).toBe('D♭')
    expect(noteName(spellInKey(61, key('D')))).toBe('C♯')
  })

  it('keeps the octave right across the B/C boundary', () => {
    // The scale is spelled in one octave and re-seated; comparing MIDI rather than trusting
    // the letter is what stops a B natural in C major coming back an octave low.
    for (const k of [key('C'), key('Eb'), key('B'), key('F# major')]) {
      for (let midi = 48; midi <= 84; midi++) {
        expect(midiOf(spellInKey(midi, k)), `${keyName(k)} ${midi}`).toBe(midi)
      }
    }
  })
})

describe('spelling cleanly', () => {
  it('holds for every writable key in both modes', () => {
    for (const mode of ['major', 'minor'] as const) {
      for (const k of writableKeys(mode)) {
        expect(spellsCleanly(k), keyName(k)).toBe(true)
      }
    }
  })
})

describe('conventional spelling of a key', () => {
  it('picks the spelling a musician would write', () => {
    // D sharp major and A sharp major are arithmetically fine and nobody writes them.
    expect(noteName(conventionalTonic(3))).toBe('E♭')
    expect(noteName(conventionalTonic(1))).toBe('D♭')
    expect(noteName(conventionalTonic(10))).toBe('B♭')
    expect(noteName(conventionalTonic(6))).toBe('F♯')
  })

  it('leaves the naturals alone', () => {
    for (const [pitchClass, name] of [[0, 'C'], [2, 'D'], [4, 'E'], [5, 'F'], [7, 'G'], [9, 'A'], [11, 'B']] as const) {
      expect(noteName(conventionalTonic(pitchClass)), `${pitchClass}`).toBe(name)
    }
  })

  it('covers all twelve, never with more than six accidentals', () => {
    for (let pitchClass = 0; pitchClass < 12; pitchClass++) {
      const tonic = conventionalTonic(pitchClass)
      expect(midiOf(tonic) % 12, `${pitchClass}`).toBe(pitchClass)
      expect(Math.abs(fifthsOf({ tonic, mode: 'major' })), `${pitchClass}`).toBeLessThanOrEqual(6)
    }
  })

  it('spells minor keys too', () => {
    expect(noteName(conventionalTonic(9, 'minor'))).toBe('A')
    expect(noteName(conventionalTonic(0, 'minor'))).toBe('C')
    expect(noteName(conventionalTonic(4, 'minor'))).toBe('E')
    // Pitch class 3 is the genuine coin flip: D♯ minor is six sharps and E♭ minor is six
    // flats, so either is defensible and the circle's choice is the one to be consistent with.
    expect(['D♯', 'E♭']).toContain(noteName(conventionalTonic(3, 'minor')))
  })
})
