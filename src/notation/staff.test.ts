import { describe, expect, it } from 'vitest'
import {
  accidentalNeeded,
  bestClef,
  layoutNotes,
  ledgerLines,
  signatureSteps,
  staffStep,
  stemDirection,
} from './staff.js'
import { key } from '../theory/key.js'
import { note } from '../theory/pitch.js'
import { scaleNotes } from '../theory/scale.js'

describe('vertical position', () => {
  it('puts the bottom line where each clef says', () => {
    expect(staffStep(note('E4'), 'treble')).toBe(0)
    expect(staffStep(note('G2'), 'bass')).toBe(0)
  })

  it('counts letters, not semitones', () => {
    // The whole reason notes are spelled. C sharp, C and C flat are the SAME line — the
    // accidental says which, and a semitone-based layout could not put them together.
    for (const name of ['C5', 'C#5', 'Cb5']) {
      expect(staffStep(note(name), 'treble'), name).toBe(staffStep(note('C5'), 'treble'))
    }
    // And E sharp is a line BELOW F natural, despite sounding the same.
    expect(staffStep(note('E#4'), 'treble')).toBeLessThan(staffStep(note('F4'), 'treble'))
  })

  it('rises by seven per octave', () => {
    expect(staffStep(note('E5'), 'treble') - staffStep(note('E4'), 'treble')).toBe(7)
  })

  it('puts middle C one ledger line below the treble stave', () => {
    expect(staffStep(note('C4'), 'treble')).toBe(-2)
    // And one above the bass stave, which is the same note in both — the fact that makes the
    // two clefs a single continuous system.
    expect(staffStep(note('C4'), 'bass')).toBe(10)
  })
})

describe('stems', () => {
  it('point away from the middle line, so notes stay inside the stave', () => {
    expect(stemDirection(0)).toBe('up')
    expect(stemDirection(8)).toBe('down')
  })
})

describe('ledger lines', () => {
  it('gives none to notes inside the stave', () => {
    for (let step = 0; step <= 8; step++) expect(ledgerLines(step), `${step}`).toEqual([])
  })

  it('adds one per line above or below', () => {
    expect(ledgerLines(10)).toEqual([10])
    expect(ledgerLines(12)).toEqual([10, 12])
    expect(ledgerLines(-2)).toEqual([-2])
    expect(ledgerLines(-4)).toEqual([-2, -4])
  })

  it('gives a note in the space above the same lines as the line below it', () => {
    // A note in the first space above the stave sits ON one ledger line, not two.
    expect(ledgerLines(11)).toEqual([10])
  })
})

describe('accidentals', () => {
  it('writes nothing when the key signature already says it', () => {
    // Every F is sharp in D major, so an F sharp needs no mark. Writing one anyway is the
    // commonest thing a naive renderer gets wrong, and it makes music look frantic.
    expect(accidentalNeeded(note('F#5'), key('D'))).toBeNull()
    expect(accidentalNeeded(note('C4'), key('C'))).toBeNull()
  })

  it('writes a natural to cancel the signature', () => {
    expect(accidentalNeeded(note('F5'), key('D'))).toEqual({ alter: 0, natural: true })
  })

  it('writes a mark for anything the signature did not predict', () => {
    expect(accidentalNeeded(note('G#4'), key('C'))).toEqual({ alter: 1, natural: false })
    expect(accidentalNeeded(note('Bb4'), key('C'))).toEqual({ alter: -1, natural: false })
  })

  it('needs no accidentals at all for a scale written in its own key', () => {
    // The definitive check: a key signature exists precisely so the scale needs no marks.
    for (const name of ['C', 'G', 'D', 'A', 'E', 'B', 'F', 'Bb', 'Eb', 'Ab', 'Db']) {
      const k = key(name)
      for (const n of scaleNotes(k.tonic, 'major')) {
        expect(accidentalNeeded(n, k), `${name}: ${n.letter}`).toBeNull()
      }
    }
  })
})

describe('key signatures', () => {
  it('writes nothing for C major', () => {
    expect(signatureSteps(key('C'), 'treble')).toEqual([])
  })

  it('writes one mark per accidental, in order', () => {
    expect(signatureSteps(key('D'), 'treble').map((m) => m.letter)).toEqual(['F', 'C'])
    expect(signatureSteps(key('Eb'), 'treble').map((m) => m.letter)).toEqual(['B', 'E', 'A'])
  })

  it('keeps every mark inside or beside the stave', () => {
    // The conventional heights exist so the group reads as a group. Picking the nearest
    // octave instead makes a signature that zigzags off the top, which musicians read as
    // wrong even when the letters are right.
    for (const name of ['G', 'D', 'A', 'E', 'B', 'F# major', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb']) {
      for (const clef of ['treble', 'bass'] as const) {
        for (const mark of signatureSteps(key(name), clef)) {
          expect(mark.step, `${name} ${clef} ${mark.letter}`).toBeGreaterThanOrEqual(-1)
          expect(mark.step, `${name} ${clef} ${mark.letter}`).toBeLessThanOrEqual(9)
        }
      }
    }
  })
})

describe('choosing a clef', () => {
  it('picks the one needing fewer ledger lines', () => {
    expect(bestClef([note('C4'), note('E4'), note('G4')])).toBe('treble')
    expect(bestClef([note('C2'), note('E2'), note('G2')])).toBe('bass')
  })
})

describe('laying out a run', () => {
  it('returns one entry per note, with everything the renderer needs', () => {
    const laid = layoutNotes(scaleNotes(note('C'), 'major'), key('C'), 'treble')
    expect(laid).toHaveLength(7)
    expect(laid.every((entry) => entry.accidental === null)).toBe(true)
    // Ascending on the page as well as in pitch.
    for (let i = 1; i < laid.length; i++) expect(laid[i]!.step).toBeGreaterThan(laid[i - 1]!.step)
  })
})
