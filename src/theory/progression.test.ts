import { describe, expect, it } from 'vitest'
import { chordSymbol } from './chord.js'
import { key, keyName, writableKeys } from './key.js'
import { parseRoman } from './roman.js'
import {
  PROGRESSIONS,
  chordAtBar,
  identifyTwelveBar,
  progressionBars,
  progressionById,
  progressionChords,
  progressionLength,
  progressionsTagged,
  twelveBar,
} from './progression.js'

describe('the catalogue', () => {
  it('gives every progression a unique id', () => {
    const ids = PROGRESSIONS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('writes every numeral in a form the parser understands', () => {
    // A typo here would surface as a blank chord slot in a lesson. Catching it in a test is
    // the whole reason the numerals are data rather than strings scattered through JSX.
    for (const p of PROGRESSIONS) {
      for (const numeral of p.numerals) {
        expect(parseRoman(numeral), `${p.id}: ${numeral}`).not.toBeNull()
      }
    }
  })

  it('keeps every blurb caption-length', () => {
    for (const p of PROGRESSIONS) {
      expect(p.blurb.length, p.id).toBeLessThanOrEqual(95)
    }
  })

  it('names no songs, because pressing play cannot produce one', () => {
    // The site synthesises everything and reproduces no recording or melody. A blurb that
    // names a track promises something the app cannot deliver, and a learner reads the gap
    // as a bug. Function and feel only — this test is the guard on that policy.
    for (const p of PROGRESSIONS) {
      expect(p.blurb, p.id).not.toMatch(/\bby\s+[A-Z]/)
      expect(p.blurb, p.id).not.toMatch(/["“”]/)
    }
  })

  it('gives every bars array the same length as its numerals', () => {
    for (const p of PROGRESSIONS) {
      if (p.bars) expect(p.bars.length, p.id).toBe(p.numerals.length)
    }
  })

  it('can be looked up by id and by tag', () => {
    expect(progressionById('twelve-bar')?.name).toBe('12-bar blues')
    expect(progressionById('nope')).toBeUndefined()
    expect(progressionsTagged('blues').length).toBeGreaterThanOrEqual(3)
    expect(progressionsTagged('electronica').length).toBeGreaterThanOrEqual(2)
  })
})

describe('the twelve-bar form', () => {
  it('is always exactly twelve bars', () => {
    for (const variant of ['basic', 'quick-change', 'turnaround'] as const) {
      expect(twelveBar(variant), variant).toHaveLength(12)
    }
  })

  it('uses only I, IV and V, all of them sevenths', () => {
    // Chapter 9's claim that the blues breaks the rules by making every chord a dominant
    // seventh only holds if the data actually does that.
    for (const variant of ['basic', 'quick-change', 'turnaround'] as const) {
      for (const numeral of twelveBar(variant)) {
        expect(numeral, variant).toMatch(/^(I|IV|V)7$/)
      }
    }
  })

  it('puts the quick change in bar two and nowhere else', () => {
    expect(twelveBar('quick-change')[1]).toBe('IV7')
    expect(twelveBar('basic')[1]).toBe('I7')
  })

  it('sends the turnaround to V in the last bar so the form loops', () => {
    expect(twelveBar('turnaround').at(-1)).toBe('V7')
    expect(twelveBar('quick-change').at(-1)).toBe('I7')
  })

  it('has the same bars 5 to 10 in every variant', () => {
    // The variants differ only at the start and the end. That is what makes them variants of
    // one form rather than three unrelated progressions.
    const middle = (list: string[]) => list.slice(4, 10)
    expect(middle(twelveBar('basic'))).toEqual(middle(twelveBar('quick-change')))
    expect(middle(twelveBar('turnaround'))).toEqual(middle(twelveBar('quick-change')))
  })

  it('names which variant a set of numerals is', () => {
    expect(identifyTwelveBar(twelveBar('basic'))).toBe('basic')
    expect(identifyTwelveBar(twelveBar('turnaround'))).toBe('turnaround')
    expect(identifyTwelveBar(['I7', 'IV7'])).toBeNull()
  })

  it('lands the right chords in E, the key a blues is usually played in', () => {
    const bars = progressionBars(progressionById('twelve-bar')!, key('E'))
    const symbols = bars.map((bar) => chordSymbol(bar.chord))
    expect(symbols[0]).toBe('E7')
    expect(symbols[4]).toBe('A7') // bar 5 is the IV
    expect(symbols[8]).toBe('B7') // bar 9 is the V
    expect(symbols[9]).toBe('A7') // and bar 10 drops back to the IV
  })
})

describe('realising a progression in a key', () => {
  it('names the chords of the four-chord loop', () => {
    const chords = progressionChords(progressionById('pop-four')!, key('C'))
    expect(chords.map((spec) => chordSymbol(spec))).toEqual(['C', 'G', 'Am', 'F'])
  })

  it('transposes intact, which is the entire point of numerals', () => {
    const shape = (k: string) =>
      progressionChords(progressionById('pop-four')!, key(k)).map((spec) => spec.quality)
    expect(shape('C')).toEqual(shape('Eb'))
    expect(shape('C')).toEqual(shape('F# major'))
  })

  it('spells the borrowed chords of the rock progression correctly', () => {
    const chords = progressionChords(progressionById('mixolydian-rock')!, key('A'))
    expect(chords.map((spec) => chordSymbol(spec))).toEqual(['A', 'G', 'D', 'A'])
  })

  it('spells the Andalusian descent in A minor', () => {
    const chords = progressionChords(progressionById('andalusian')!, key('A minor'))
    expect(chords.map((spec) => chordSymbol(spec))).toEqual(['Am', 'G', 'F', 'E'])
  })

  it('resolves every progression in every key without failing', () => {
    for (const p of PROGRESSIONS) {
      for (const k of writableKeys(p.numerals[0]?.startsWith('i') ? 'minor' : 'major')) {
        const chords = progressionChords(p, k)
        expect(chords, `${p.id} in ${keyName(k)}`).toHaveLength(p.numerals.length)
        for (const spec of chords) {
          expect(Math.abs(spec.root.alter), `${p.id} in ${keyName(k)}`).toBeLessThanOrEqual(2)
        }
      }
    }
  })
})

describe('bars', () => {
  it('defaults to one bar per chord', () => {
    const bars = progressionBars(progressionById('pop-four')!, key('C'))
    expect(bars.map((bar) => bar.bars)).toEqual([1, 1, 1, 1])
    expect(bars.map((bar) => bar.at)).toEqual([0, 1, 2, 3])
    expect(progressionLength(progressionById('pop-four')!)).toBe(4)
  })

  it('honours an explicit bars array', () => {
    const pads = progressionById('house-pads')!
    expect(progressionLength(pads)).toBe(8)
    expect(progressionBars(pads, key('A minor')).map((bar) => bar.at)).toEqual([0, 2, 4, 6])
  })

  it('finds which chord is sounding in a given bar', () => {
    const twelve = progressionById('twelve-bar')!
    expect(chordSymbol(chordAtBar(twelve, key('E'), 0).chord)).toBe('E7')
    expect(chordSymbol(chordAtBar(twelve, key('E'), 4).chord)).toBe('A7')
    expect(chordSymbol(chordAtBar(twelve, key('E'), 8).chord)).toBe('B7')
  })

  it('wraps, so a loop can ask for any bar number', () => {
    const twelve = progressionById('twelve-bar')!
    expect(chordSymbol(chordAtBar(twelve, key('E'), 12).chord)).toBe('E7')
    expect(chordSymbol(chordAtBar(twelve, key('E'), 16).chord)).toBe('A7')
    // Negative too — a bar-quantised swap can look one bar backwards at the loop point.
    expect(chordSymbol(chordAtBar(twelve, key('E'), -12).chord)).toBe('E7')
  })

  it('holds a multi-bar chord for its whole length', () => {
    const pads = progressionById('house-pads')!
    const first = chordSymbol(chordAtBar(pads, key('A minor'), 0).chord)
    expect(chordSymbol(chordAtBar(pads, key('A minor'), 1).chord)).toBe(first)
    expect(chordSymbol(chordAtBar(pads, key('A minor'), 2).chord)).not.toBe(first)
  })
})

describe('the cadences', () => {
  it('has all four endings chapter 6 swaps between', () => {
    for (const id of ['perfect-cadence', 'plagal-cadence', 'interrupted-cadence', 'half-cadence']) {
      expect(progressionById(id), id).toBeDefined()
    }
  })

  it('makes the interrupted cadence land somewhere other than home', () => {
    const chords = progressionChords(progressionById('interrupted-cadence')!, key('C'))
    expect(chordSymbol(chords.at(-1)!)).toBe('Am')
    expect(chordSymbol(progressionChords(progressionById('perfect-cadence')!, key('C')).at(-1)!)).toBe('C')
  })
})
