import { describe, expect, it } from 'vitest'
import { LETTERS, midiOf, note, noteName, pitchClassOf } from './pitch.js'
import {
  MODES,
  MODES_BY_BRIGHTNESS,
  SCALES,
  SCALE_IDS,
  type ScaleId,
  degreeOf,
  isInScale,
  modeOnDegree,
  pitchClassSet,
  rotateSteps,
  scaleFromSteps,
  scaleNotes,
  scalePitches,
} from './scale.js'

const names = (root: string, id: ScaleId) => scaleNotes(note(root), id).map((n) => noteName(n))

describe('the definitions themselves', () => {
  it('gives every degree a letter offset', () => {
    for (const id of SCALE_IDS) {
      const { steps, letters } = SCALES[id]
      expect(letters.length, id).toBe(steps.length)
    }
  })

  it('starts every scale on its root and never leaves the octave', () => {
    for (const id of SCALE_IDS) {
      const { steps, letters } = SCALES[id]
      expect(steps[0], id).toBe(0)
      expect(letters[0], id).toBe(0)
      expect(Math.max(...steps), id).toBeLessThan(12)
      // Strictly ascending, or a scale played through would double back on itself.
      for (let i = 1; i < steps.length; i++) expect(steps[i]!, id).toBeGreaterThan(steps[i - 1]!)
    }
  })
})

describe('spelling', () => {
  it('spells the major scale with all seven letters, once each, in every key', () => {
    // The classic spelling bug is a scale that reads C D E F G A A♯ — arithmetically right,
    // musically illiterate, and it makes the key-signature lesson impossible to write.
    const keys = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb']
    for (const root of keys) {
      const letters = scaleNotes(note(root), 'major').map((n) => n.letter)
      expect(new Set(letters).size, root).toBe(7)
      expect(letters.length, root).toBe(7)
    }
  })

  it('uses flats in flat keys and sharps in sharp keys', () => {
    expect(names('Bb', 'major')).toEqual(['B♭', 'C', 'D', 'E♭', 'F', 'G', 'A'])
    expect(names('E', 'major')).toEqual(['E', 'F♯', 'G♯', 'A', 'B', 'C♯', 'D♯'])
  })

  it('produces the double sharps F sharp major genuinely needs further round the circle', () => {
    expect(names('G#', 'major')).toEqual(['G♯', 'A♯', 'B♯', 'C♯', 'D♯', 'E♯', 'F♯♯'])
  })

  it('spells the pentatonics with the missing letters actually missing', () => {
    // Five notes over seven letters. C major pentatonic has no F and no B, and deriving one
    // letter per degree would invent them.
    expect(names('C', 'major-pentatonic')).toEqual(['C', 'D', 'E', 'G', 'A'])
    expect(names('A', 'minor-pentatonic')).toEqual(['A', 'C', 'D', 'E', 'G'])
  })

  it('puts the blue note on the same letter as the fifth', () => {
    // Six notes, five letters, two of them on G. This is the assertion that justifies
    // writing the letter offsets down as data instead of deriving them.
    expect(names('C', 'blues')).toEqual(['C', 'E♭', 'F', 'G♭', 'G', 'B♭'])
    expect(names('A', 'blues')).toEqual(['A', 'C', 'D', 'E♭', 'E', 'G'])
  })

  it('lands every degree on the semitone the formula asked for, in every scale and key', () => {
    for (const id of SCALE_IDS) {
      for (const letter of LETTERS) {
        for (const alter of ['', '#', 'b']) {
          const root = note(`${letter}${alter}4`)
          const spelled = scaleNotes(root, id)
          SCALES[id].steps.forEach((semitones, degree) => {
            expect(midiOf(spelled[degree]!) - midiOf(root), `${letter}${alter} ${id}`).toBe(
              semitones,
            )
          })
        }
      }
    }
  })
})

describe('the relationships the lessons are built on', () => {
  it('makes the natural minor the same notes as the major a minor third above', () => {
    // Relative minor. The wow moment in chapter 4 is this fact made audible, so it had
    // better be true in the data.
    expect(pitchClassSet(note('A'), 'natural-minor')).toEqual(pitchClassSet(note('C'), 'major'))
    expect(pitchClassSet(note('E'), 'natural-minor')).toEqual(pitchClassSet(note('G'), 'major'))
  })

  it('makes every mode the same notes as the major scale it came from', () => {
    const cMajor = pitchClassSet(note('C'), 'major')
    const roots = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
    MODES.forEach((mode, index) => {
      expect(pitchClassSet(note(roots[index]!), mode), mode).toEqual(cMajor)
    })
  })

  it('makes the major pentatonic the major scale minus its two half-step tensions', () => {
    const major = [...pitchClassSet(note('C'), 'major')]
    const pentatonic = pitchClassSet(note('C'), 'major-pentatonic')
    const removed = major.filter((pc) => !pentatonic.has(pc))
    // The fourth and the seventh — F and B, the two notes that sit a semitone from a
    // neighbour and so can clash.
    expect(removed.sort((a, b) => a - b)).toEqual([5, 11])
  })

  it('makes the blues scale the minor pentatonic plus exactly one note', () => {
    const pentatonic = pitchClassSet(note('C'), 'minor-pentatonic')
    const blues = [...pitchClassSet(note('C'), 'blues')]
    const added = blues.filter((pc) => !pentatonic.has(pc))
    expect(added).toEqual([6]) // the flattened fifth
  })

  it('makes the harmonic minor exactly one note different from the natural minor', () => {
    const natural = pitchClassSet(note('A'), 'natural-minor')
    const harmonic = [...pitchClassSet(note('A'), 'harmonic-minor')]
    expect(harmonic.filter((pc) => !natural.has(pc))).toHaveLength(1)
  })

  it('lets the melodic minor come down as the natural minor', () => {
    const up = scaleNotes(note('A'), 'melodic-minor').map((n) => noteName(n))
    const down = scaleNotes(note('A'), 'melodic-minor', true).map((n) => noteName(n))
    expect(up).toEqual(['A', 'B', 'C', 'D', 'E', 'F♯', 'G♯'])
    expect(down).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G'])
  })
})

describe('modes as rotations', () => {
  it('turns the major formula into each mode in turn', () => {
    MODES.forEach((mode, index) => {
      expect(rotateSteps(SCALES.major.steps, index), mode).toEqual([...SCALES[mode].steps])
    })
  })

  it('names the mode on each degree', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(modeOnDegree)).toEqual([...MODES])
    // Wraps, so the ring can be dragged past the end without a special case.
    expect(modeOnDegree(8)).toBe('ionian')
    expect(modeOnDegree(0)).toBe('locrian')
  })

  it('orders the brightness slider so each step flattens exactly one more note', () => {
    // This is what makes "bright to dark" a single continuous control rather than seven
    // presets in an arbitrary order.
    const raisedCount = MODES_BY_BRIGHTNESS.map((mode) => {
      const steps = SCALES[mode].steps
      return steps.reduce((total, semitones, degree) => {
        return total + (semitones - SCALES.major.steps[degree]!)
      }, 0)
    })
    for (let i = 1; i < raisedCount.length; i++) {
      expect(raisedCount[i], MODES_BY_BRIGHTNESS[i]).toBe(raisedCount[i - 1]! - 1)
    }
  })

  it('covers all seven modes exactly once', () => {
    expect([...MODES_BY_BRIGHTNESS].sort()).toEqual([...MODES].sort())
  })
})

describe('degrees', () => {
  it('numbers a note within its scale, and returns null outside it', () => {
    expect(degreeOf(note('C'), 'major', note('E'))).toBe(3)
    expect(degreeOf(note('C'), 'major', note('B'))).toBe(7)
    expect(degreeOf(note('C'), 'major', note('F#'))).toBeNull()
  })

  it('ignores the octave, so a keyboard can light every C at once', () => {
    expect(degreeOf(note('C4'), 'major', note('E6'))).toBe(3)
    expect(isInScale(note('C4'), 'major', note('G2'))).toBe(true)
  })

  it('finds the blue note as the fourth degree of the blues scale', () => {
    expect(degreeOf(note('C'), 'blues', note('Gb'))).toBe(4)
    expect(degreeOf(note('C'), 'blues', note('G'))).toBe(5)
  })
})

describe('playable pitches', () => {
  it('arrives back on the root', () => {
    const pitches = scalePitches(60, 'major')
    expect(pitches[0]).toBe(60)
    expect(pitches.at(-1)).toBe(72)
    expect(pitches).toHaveLength(8)
  })

  it('stacks octaves without a gap or a repeat in the middle', () => {
    const pitches = scalePitches(60, 'minor-pentatonic', 2)
    expect(pitches).toEqual([60, 63, 65, 67, 70, 72, 75, 77, 79, 82, 84])
    expect(new Set(pitches).size).toBe(pitches.length)
  })

  it('always ascends', () => {
    for (const id of SCALE_IDS) {
      const pitches = scalePitches(60, id, 2)
      for (let i = 1; i < pitches.length; i++) {
        expect(pitches[i]!, id).toBeGreaterThan(pitches[i - 1]!)
      }
    }
  })
})

describe('pitch class sets', () => {
  it('has one entry per note, with no accidental collisions', () => {
    for (const id of SCALE_IDS) {
      expect(pitchClassSet(note('C'), id).size, id).toBe(SCALES[id].steps.length)
    }
  })

  it('is rooted where it says it is', () => {
    for (const id of SCALE_IDS) {
      for (const root of ['C', 'F#', 'Bb', 'E']) {
        expect(pitchClassSet(note(root), id).has(pitchClassOf(note(root))), `${root} ${id}`).toBe(
          true,
        )
      }
    }
  })
})

describe('naming a formula', () => {
  it('recognises every scale it knows', () => {
    for (const id of SCALE_IDS) {
      expect(scaleFromSteps(SCALES[id].steps), id).not.toBeNull()
    }
  })

  it('names a rotated major scale as the mode it has become', () => {
    // The whole point: a ring whose home has moved must be able to say what it now is,
    // rather than still claiming to be the scale it started as.
    expect(scaleFromSteps(rotateSteps(SCALES.major.steps, 1))).toBe('dorian')
    expect(scaleFromSteps(rotateSteps(SCALES.major.steps, 4))).toBe('mixolydian')
  })

  it('prefers the plain name over the mode name where they share a formula', () => {
    // Ionian IS major and Aeolian IS natural minor. Both answers are right; the plain one is
    // what a beginner should be shown, and declaration order is what decides it.
    expect(scaleFromSteps(SCALES.major.steps)).toBe('major')
    expect(scaleFromSteps(SCALES.aeolian.steps)).toBe('natural-minor')
  })

  it('returns null for a formula it does not know', () => {
    expect(scaleFromSteps([0, 1, 2, 3])).toBeNull()
  })
})
