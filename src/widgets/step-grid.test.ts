import { describe, expect, it } from 'vitest'
import {
  clearAll,
  clearLane,
  countHits,
  emptyLane,
  hitsAt,
  isEmpty,
  laneFrom,
  lengthOf,
  resize,
  setStep,
  shiftLane,
  toggleStep,
  type Pattern,
} from './step-grid.js'
import { GROOVES, GROOVE_IDS } from '../audio/grooves.js'

const pattern = (): Pattern => [
  laneFrom('kick', 'Kick', 8, [0, 4]),
  laneFrom('hat', 'Hi-hat', 8, [2, 6]),
]

describe('editing', () => {
  it('toggles a step without touching the others', () => {
    const next = toggleStep(pattern(), 'kick', 1)
    expect(next[0]!.steps).toEqual([true, true, false, false, true, false, false, false])
    expect(next[1]!.steps).toEqual(pattern()[1]!.steps)
  })

  it('never mutates what it was given', () => {
    const before = pattern()
    toggleStep(before, 'kick', 1)
    setStep(before, 'kick', 2, true)
    clearLane(before, 'kick')
    expect(before[0]!.steps).toEqual([true, false, false, false, true, false, false, false])
  })

  it('ignores a lane that is not there', () => {
    expect(toggleStep(pattern(), 'nope', 0)).toEqual(pattern())
  })

  it('clears one lane or all of them', () => {
    expect(clearLane(pattern(), 'kick')[0]!.steps.some(Boolean)).toBe(false)
    expect(clearLane(pattern(), 'kick')[1]!.steps.some(Boolean)).toBe(true)
    expect(isEmpty(clearAll(pattern()))).toBe(true)
  })
})

describe('shifting', () => {
  it('wraps rather than dropping hits', () => {
    // Shifting four-on-the-floor by one has to give the offbeat, not three kicks and a hole.
    const shifted = shiftLane(pattern(), 'kick', 1)
    expect(shifted[0]!.steps).toEqual([false, true, false, false, false, true, false, false])
    expect(countHits(shifted)).toBe(countHits(pattern()))
  })

  it('goes backwards too', () => {
    expect(shiftLane(pattern(), 'kick', -1)[0]!.steps[7]).toBe(true)
  })

  it('returns to itself after a full turn', () => {
    expect(shiftLane(pattern(), 'kick', 8)).toEqual(pattern())
  })

  it('handles a shift larger than the pattern', () => {
    expect(shiftLane(pattern(), 'kick', 9)).toEqual(shiftLane(pattern(), 'kick', 1))
  })
})

describe('resizing', () => {
  it('spreads hits out when doubling rather than repeating them', () => {
    // Switching from eighths to sixteenths should feel like adding detail, not like being
    // handed a different pattern.
    const doubled = resize(pattern(), 16)
    expect(lengthOf(doubled)).toBe(16)
    expect(doubled[0]!.steps[0]).toBe(true)
    expect(doubled[0]!.steps[8]).toBe(true)
    expect(countHits(doubled)).toBe(countHits(pattern()))
  })

  it('keeps the hits that survive when halving', () => {
    const halved = resize(pattern(), 4)
    expect(lengthOf(halved)).toBe(4)
    expect(halved[0]!.steps[0]).toBe(true)
    expect(halved[0]!.steps[2]).toBe(true)
  })

  it('is a no-op at the same length', () => {
    expect(resize(pattern(), 8)).toEqual(pattern())
  })

  it('never puts a hit past the end', () => {
    for (const length of [1, 3, 5, 7, 12, 16, 32]) {
      const resized = resize(pattern(), length)
      for (const lane of resized) expect(lane.steps.length, `${length}`).toBe(length)
    }
  })
})

describe('reading hits', () => {
  it('reports which lanes fire on a step', () => {
    expect(hitsAt(pattern(), 0).map((h) => h.id)).toEqual(['kick'])
    expect(hitsAt(pattern(), 2).map((h) => h.id)).toEqual(['hat'])
    expect(hitsAt(pattern(), 1)).toEqual([])
  })

  it('wraps, so a loop can ask for any step number', () => {
    expect(hitsAt(pattern(), 8).map((h) => h.id)).toEqual(['kick'])
    expect(hitsAt(pattern(), -8).map((h) => h.id)).toEqual(['kick'])
  })

  it('carries velocity, defaulting to full', () => {
    const soft = [laneFrom('hat', 'Hat', 4, [0, 2], { 0: 0.4 })]
    expect(hitsAt(soft, 0)[0]!.velocity).toBe(0.4)
    expect(hitsAt(soft, 2)[0]!.velocity).toBe(1)
    expect(hitsAt(pattern(), 0)[0]!.velocity).toBe(1)
  })
})

describe('empty lanes', () => {
  it('start silent and the right length', () => {
    const lane = emptyLane('kick', 'Kick', 16)
    expect(lane.steps).toHaveLength(16)
    expect(lane.steps.some(Boolean)).toBe(false)
  })
})

describe('the grooves', () => {
  it('are all sixteen steps, so the grid and the transport agree', () => {
    for (const id of GROOVE_IDS) {
      for (const lane of GROOVES[id].pattern) {
        expect(lane.steps.length, `${id} ${lane.id}`).toBe(16)
      }
    }
  })

  it('all have something in them, apart from the deliberately empty one', () => {
    for (const id of GROOVE_IDS) {
      if (id === 'none') continue
      expect(isEmpty(GROOVES[id].pattern), id).toBe(false)
    }
  })

  it('puts a kick on every beat of four-on-the-floor, which is its whole name', () => {
    const kick = GROOVES['four-floor'].pattern.find((lane) => lane.id === 'kick')!
    expect([0, 4, 8, 12].every((step) => kick.steps[step])).toBe(true)
    expect(kick.steps.filter(Boolean)).toHaveLength(4)
  })

  it('swings only the grooves that should swing', () => {
    expect(GROOVES.shuffle.swing).toBeGreaterThan(0.5)
    expect(GROOVES['four-floor'].swing).toBe(0)
    expect(GROOVES.rock.swing).toBe(0)
  })

  it('gives every groove a sane tempo and a caption-length blurb', () => {
    for (const id of GROOVE_IDS) {
      expect(GROOVES[id].bpm, id).toBeGreaterThanOrEqual(60)
      expect(GROOVES[id].bpm, id).toBeLessThanOrEqual(180)
      expect(GROOVES[id].blurb.length, id).toBeLessThanOrEqual(90)
    }
  })
})
