import { describe, expect, it } from 'vitest'
import {
  SEGMENTS,
  angleAtPoint,
  angleOf,
  layoutRing,
  pitchClassAtAngle,
  radiusAtPoint,
  rotateSet,
  shortestStep,
} from './clock-layout.js'

const TAU = Math.PI * 2

describe('angles', () => {
  it('puts pitch class zero straight up', () => {
    expect(angleOf(0)).toBe(0)
  })

  it('runs clockwise, a twelfth of a turn per semitone', () => {
    expect(angleOf(3)).toBeCloseTo(TAU / 4)
    expect(angleOf(6)).toBeCloseTo(TAU / 2)
  })

  it('wraps', () => {
    expect(angleOf(12)).toBeCloseTo(angleOf(0))
    expect(angleOf(-1)).toBeCloseTo(angleOf(11))
  })
})

describe('finding a segment from an angle', () => {
  it('is the inverse of angleOf', () => {
    for (let pitchClass = 0; pitchClass < SEGMENTS; pitchClass++) {
      expect(pitchClassAtAngle(angleOf(pitchClass)), `${pitchClass}`).toBe(pitchClass)
    }
  })

  it('puts the boundaries between segments, not through their middles', () => {
    // Half a segment either side of centre must still be that segment, or a click on a
    // segment's own label would select its neighbour.
    const half = TAU / SEGMENTS / 2
    for (let pitchClass = 0; pitchClass < SEGMENTS; pitchClass++) {
      const centre = angleOf(pitchClass)
      expect(pitchClassAtAngle(centre - half * 0.9), `${pitchClass} low`).toBe(pitchClass)
      expect(pitchClassAtAngle(centre + half * 0.9), `${pitchClass} high`).toBe(pitchClass)
    }
  })

  it('covers the whole circle with no gaps', () => {
    for (let step = 0; step < 720; step++) {
      const value = pitchClassAtAngle((step / 720) * TAU)
      expect(Number.isInteger(value), `${step}`).toBe(true)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(SEGMENTS)
    }
  })

  it('handles angles outside one turn', () => {
    expect(pitchClassAtAngle(angleOf(3) + TAU)).toBe(3)
    expect(pitchClassAtAngle(angleOf(3) - TAU)).toBe(3)
  })
})

describe('pointing at the ring', () => {
  it('reads straight up as pitch class zero', () => {
    // Screen y grows downwards, so "up" is a SMALLER y. Getting that wrong gives a ring that
    // runs backwards and starts at three o'clock, which reads as two separate bugs.
    expect(pitchClassAtAngle(angleAtPoint(100, 0, 100, 100))).toBe(0)
  })

  it('reads clockwise around the face', () => {
    expect(pitchClassAtAngle(angleAtPoint(200, 100, 100, 100))).toBe(3) // 3 o'clock
    expect(pitchClassAtAngle(angleAtPoint(100, 200, 100, 100))).toBe(6) // 6 o'clock
    expect(pitchClassAtAngle(angleAtPoint(0, 100, 100, 100))).toBe(9) // 9 o'clock
  })

  it('measures distance from the centre', () => {
    expect(radiusAtPoint(100, 0, 100, 100)).toBeCloseTo(100)
    expect(radiusAtPoint(100, 100, 100, 100)).toBe(0)
  })
})

describe('the ring layout', () => {
  const ring = layoutRing(100, 100, 60, 95)

  it('has twelve segments, one per pitch class', () => {
    expect(ring).toHaveLength(SEGMENTS)
    expect(ring.map((s) => s.pitchClass)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
  })

  it('produces a closed path for each', () => {
    for (const segment of ring) {
      expect(segment.path.startsWith('M '), `${segment.pitchClass}`).toBe(true)
      expect(segment.path.endsWith('Z'), `${segment.pitchClass}`).toBe(true)
      expect(segment.path, `${segment.pitchClass}`).not.toContain('NaN')
    }
  })

  it('places every label between the two radii', () => {
    for (const segment of ring) {
      const distance = radiusAtPoint(segment.labelX, segment.labelY, 100, 100)
      expect(distance, `${segment.pitchClass}`).toBeGreaterThan(60)
      expect(distance, `${segment.pitchClass}`).toBeLessThan(95)
    }
  })

  it('puts the first label at the top', () => {
    expect(ring[0]!.labelX).toBeCloseTo(100)
    expect(ring[0]!.labelY).toBeLessThan(100)
  })
})

describe('rotating a set', () => {
  it('keeps the size, which is the whole point of the modes lesson', () => {
    // Rotating never adds or removes a note. If this ever failed, "same notes, new home"
    // would be false and the lesson built on it would be teaching something wrong.
    const major = new Set([0, 2, 4, 5, 7, 9, 11])
    for (let semitones = -12; semitones <= 12; semitones++) {
      expect(rotateSet(major, semitones).size, `${semitones}`).toBe(7)
    }
  })

  it('moves every note by the same amount', () => {
    expect([...rotateSet([0, 4, 7], 2)].sort((a, b) => a - b)).toEqual([2, 6, 9])
  })

  it('wraps round the top', () => {
    expect([...rotateSet([11], 1)]).toEqual([0])
    expect([...rotateSet([0], -1)]).toEqual([11])
  })

  it('returns to itself after a full turn', () => {
    const blues = new Set([0, 3, 5, 6, 7, 10])
    expect([...rotateSet(blues, 12)].sort((a, b) => a - b)).toEqual([...blues].sort((a, b) => a - b))
  })
})

describe('shortest step', () => {
  it('goes the short way round', () => {
    expect(shortestStep(0, 1)).toBe(1)
    expect(shortestStep(0, 11)).toBe(-1)
    expect(shortestStep(11, 0)).toBe(1)
  })

  it('is zero for the same segment', () => {
    expect(shortestStep(5, 5)).toBe(0)
  })

  it('never returns more than half a turn', () => {
    for (let from = 0; from < SEGMENTS; from++) {
      for (let to = 0; to < SEGMENTS; to++) {
        expect(Math.abs(shortestStep(from, to)), `${from}→${to}`).toBeLessThanOrEqual(6)
      }
    }
  })
})
