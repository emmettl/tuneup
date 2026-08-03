import { describe, expect, it } from 'vitest'
import { soundingDiff } from './sounding-diff.js'

const set = (...values: number[]) => new Set(values)

describe('sounding diff', () => {
  it('turns on the notes that just started', () => {
    expect(soundingDiff(set(60, 64), set(60))).toEqual({ add: [64], remove: [] })
  })

  it('turns off the notes that just stopped', () => {
    expect(soundingDiff(set(60), set(60, 64))).toEqual({ add: [], remove: [64] })
  })

  it('does both at once when a chord changes', () => {
    const { add, remove } = soundingDiff(set(65, 69, 72), set(60, 64, 67))
    expect(add.sort((a, b) => a - b)).toEqual([65, 69, 72])
    expect(remove.sort((a, b) => a - b)).toEqual([60, 64, 67])
  })

  it('does nothing at all while a chord is held', () => {
    // The reason this is a diff rather than a re-stamp. The set changes a few times a bar
    // while eighty-odd keys do not, and a held chord should cost zero attribute writes a
    // frame rather than one per key.
    expect(soundingDiff(set(60, 64, 67), set(60, 64, 67))).toEqual({ add: [], remove: [] })
  })

  it('keeps the common notes of overlapping chords untouched', () => {
    // C major to F major shares a C. Re-stamping it would restart its CSS transition and
    // make a held note flicker on every chord change.
    const { add, remove } = soundingDiff(set(60, 65, 69), set(60, 64, 67))
    expect(add).not.toContain(60)
    expect(remove).not.toContain(60)
  })

  it('clears everything when the transport stops', () => {
    expect(soundingDiff(set(), set(60, 64, 67)).remove.sort((a, b) => a - b)).toEqual([60, 64, 67])
  })

  it('handles both sides empty', () => {
    expect(soundingDiff(set(), set())).toEqual({ add: [], remove: [] })
  })
})
