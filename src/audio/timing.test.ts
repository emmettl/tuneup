import { describe, expect, it } from 'vitest'
import {
  BEATS_PER_BAR,
  STEPS_PER_BEAT,
  humanise,
  positionOf,
  secondsPerBar,
  secondsPerBeat,
  secondsPerStep,
  stepTime,
  swingDelay,
  tempoFromTaps,
  tripletStepTime,
} from './timing.js'

describe('tempo', () => {
  it('divides a beat into sixteenths', () => {
    // 120bpm is half a second a beat, so a sixteenth is an eighth of a second.
    expect(secondsPerStep(120)).toBeCloseTo(0.125)
    expect(secondsPerStep(60)).toBeCloseTo(0.25)
  })

  it('agrees with itself across beats, steps and bars', () => {
    for (const bpm of [60, 90, 120, 128, 174]) {
      expect(secondsPerStep(bpm) * STEPS_PER_BEAT).toBeCloseTo(secondsPerBeat(bpm))
      expect(secondsPerBeat(bpm) * BEATS_PER_BAR).toBeCloseTo(secondsPerBar(bpm))
      expect(secondsPerStep(bpm) * STEPS_PER_BEAT * bpm).toBeCloseTo(60)
    }
  })
})

describe('swing', () => {
  it('leaves the on-beats alone', () => {
    for (const step of [0, 2, 4, 6, 14, 32]) {
      expect(swingDelay(step, 0.8, 0.125)).toBe(0)
    }
  })

  it('delays only the off-beats, and by more as it is turned up', () => {
    const light = swingDelay(1, 0.3, 0.125)
    const heavy = swingDelay(1, 0.9, 0.125)
    expect(light).toBeGreaterThan(0)
    expect(heavy).toBeGreaterThan(light)
  })

  it('never pushes an off-beat past the step that follows it', () => {
    // Otherwise the sixteenths reorder and the pattern plays back scrambled, which sounds
    // like a broken sequencer rather than like a lot of swing.
    const stepSeconds = 0.125
    for (const swing of [0, 0.25, 0.5, 0.75, 1, 4, -3]) {
      const delay = swingDelay(1, swing, stepSeconds)
      expect(delay).toBeGreaterThanOrEqual(0)
      expect(delay).toBeLessThan(stepSeconds)
    }
  })

  it('is straight at zero', () => {
    for (let step = 0; step < 16; step++) expect(swingDelay(step, 0, 0.125)).toBe(0)
  })
})

describe('step times', () => {
  it('starts at the origin and spaces steps evenly when straight', () => {
    expect(stepTime(10, 0, 120)).toBeCloseTo(10)
    expect(stepTime(10, 4, 120)).toBeCloseTo(10.5)
    expect(stepTime(10, 8, 120)).toBeCloseTo(11)
  })

  it('stays exact over a long run rather than drifting', () => {
    // Computed from the step number rather than accumulated, so this is exact after ten
    // thousand steps. Accumulating a float per step drifts audibly over a few minutes.
    const bpm = 137
    const far = stepTime(0, 10_000, bpm)
    expect(far).toBeCloseTo(10_000 * secondsPerStep(bpm), 6)
  })

  it('always moves forwards, whatever the swing', () => {
    for (const swing of [0, 0.5, 0.67, 1]) {
      let previous = -Infinity
      for (let step = 0; step < 64; step++) {
        const time = stepTime(0, step, 120, swing)
        expect(time, `swing ${swing} step ${step}`).toBeGreaterThan(previous)
        previous = time
      }
    }
  })
})

describe('the triplet grid', () => {
  it('puts three subdivisions in a beat', () => {
    const bpm = 120
    expect(tripletStepTime(0, 3, bpm)).toBeCloseTo(secondsPerBeat(bpm))
    expect(tripletStepTime(0, 6, bpm)).toBeCloseTo(secondsPerBeat(bpm) * 2)
  })

  it('is where two-thirds swing lands the off-beat, which is what "shuffle" means', () => {
    // Not a coincidence and not a redundancy: swing at 2/3 is DEFINED as putting the
    // off-beat on the second triplet. Asserting they agree is asserting that the swing
    // control is calibrated to the thing musicians mean by shuffle.
    const bpm = 120
    expect(stepTime(0, 1, bpm, 2 / 3)).toBeCloseTo(tripletStepTime(0, 1, bpm), 5)
  })

  it('offers a middle subdivision the sixteenth grid has no place for', () => {
    // This is the real reason both exist. A swung sixteenth grid has two positions per beat
    // with the second one displaced; a triplet grid has three, and the middle one is a
    // position you simply cannot express as a swung sixteenth at any swing amount.
    const bpm = 120
    const middle = tripletStepTime(0, 1, bpm)
    const sixteenths = [0, 1, 2, 3].map((step) => stepTime(0, step, bpm, 0))
    for (const time of sixteenths) {
      expect(Math.abs(middle - time), `${time}`).toBeGreaterThan(0.01)
    }
  })
})

describe('humanise', () => {
  it('is deterministic, so a loop does not wander on every repeat', () => {
    // A groove that humanises differently each time round sounds unstable rather than human.
    // A player's timing quirks are consistent within a groove.
    expect(humanise(5, 1, 0.125, 7)).toBe(humanise(5, 1, 0.125, 7))
    expect(humanise(5, 1, 0.125, 7)).not.toBe(humanise(6, 1, 0.125, 7))
  })

  it('is zero when the amount is zero', () => {
    for (let step = 0; step < 16; step++) expect(humanise(step, 0, 0.125)).toBe(0)
  })

  it('stays small enough to be feel rather than error', () => {
    for (let step = 0; step < 64; step++) {
      expect(Math.abs(humanise(step, 1, 0.125))).toBeLessThan(0.0126)
    }
  })

  it('goes both early and late', () => {
    const offsets = Array.from({ length: 64 }, (_, step) => humanise(step, 1, 0.125))
    expect(offsets.some((o) => o > 0)).toBe(true)
    expect(offsets.some((o) => o < 0)).toBe(true)
  })
})

describe('position', () => {
  it('splits a step into bar, beat and index', () => {
    expect(positionOf(0)).toEqual({ bar: 0, index: 0, beat: 0 })
    expect(positionOf(4)).toEqual({ bar: 0, index: 4, beat: 1 })
    expect(positionOf(16)).toEqual({ bar: 1, index: 0, beat: 0 })
    expect(positionOf(21)).toEqual({ bar: 1, index: 5, beat: 1 })
  })

  it('keeps the index positive going backwards', () => {
    // A bar-quantised swap looks one bar back at the loop point, so negative steps reach
    // this. A negative index would index off the front of a pattern array.
    expect(positionOf(-1).index).toBe(15)
    expect(positionOf(-16).index).toBe(0)
  })
})

describe('tap tempo', () => {
  it('reads the gaps between taps', () => {
    expect(tempoFromTaps([0, 0.5, 1, 1.5])).toBeCloseTo(120)
    expect(tempoFromTaps([0, 1, 2])).toBeCloseTo(60)
  })

  it('needs at least two taps', () => {
    expect(tempoFromTaps([])).toBeNull()
    expect(tempoFromTaps([1])).toBeNull()
  })

  it('refuses tempos that mean the learner stopped tapping', () => {
    // Showing 12bpm because someone wandered off, or 900 because they double-tapped, reads
    // as the control being broken rather than as their input being odd.
    expect(tempoFromTaps([0, 10])).toBeNull()
    expect(tempoFromTaps([0, 0.05])).toBeNull()
  })

  it('averages, so one uneven tap does not throw it', () => {
    const steady = tempoFromTaps([0, 0.5, 1.0, 1.5, 2.0])!
    const wobbly = tempoFromTaps([0, 0.48, 1.0, 1.53, 2.0])!
    expect(Math.abs(steady - wobbly)).toBeLessThan(1)
  })
})
