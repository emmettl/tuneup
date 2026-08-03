import { describe, expect, it } from 'vitest'
import { Transport, type StepEvent, type Ticker } from './transport.js'
import { LOOKAHEAD_SECONDS, secondsPerStep } from './timing.js'

/** A clock and a ticker a test moves by hand. This is the whole reason the transport takes
 *  both as options: none of the scheduling logic needs an AudioContext to be checked. */
function harness(options: { bpm?: number; swing?: number; stepsPerBar?: (bar: number) => number } = {}) {
  let now = 0
  const steps: StepEvent[] = []
  const bars: number[] = []
  let tick = () => {}

  const ticker = (onTick: () => void): Ticker => {
    tick = onTick
    return { start: () => {}, stop: () => {} }
  }

  const transport = new Transport({
    clock: () => now,
    bpm: () => options.bpm ?? 120,
    swing: () => options.swing ?? 0,
    stepsPerBar: options.stepsPerBar,
    onStep: (event) => steps.push(event),
    onBar: (bar) => bars.push(bar),
    ticker,
  })

  return {
    transport,
    steps,
    bars,
    get now() {
      return now
    },
    /** Move the clock forward and let the scheduler catch up, the way the real ticker would. */
    advance(seconds: number, slices = 8) {
      for (let i = 0; i < slices; i++) {
        now += seconds / slices
        tick()
      }
    },
  }
}

describe('scheduling', () => {
  it('schedules ahead of the clock and never behind it', () => {
    // The contract the whole design rests on: every step handed to onStep is in the future,
    // so the audio thread can place it sample-accurately.
    const h = harness()
    h.transport.start()
    h.advance(2)
    expect(h.steps.length).toBeGreaterThan(0)
    for (const step of h.steps) {
      expect(step.time).toBeGreaterThanOrEqual(0)
    }
  })

  it('never schedules further ahead than the lookahead window', () => {
    const h = harness()
    h.transport.start()
    h.advance(1)
    // Everything scheduled so far must have been within a window of the clock at the time.
    const last = h.steps.at(-1)!
    expect(last.time).toBeLessThanOrEqual(h.now + LOOKAHEAD_SECONDS + 1e-9)
  })

  it('numbers steps consecutively without gaps or repeats', () => {
    const h = harness()
    h.transport.start()
    h.advance(4)
    h.steps.forEach((step, index) => {
      expect(step.absolute).toBe(index)
    })
  })

  it('spaces steps at the tempo', () => {
    const h = harness({ bpm: 120 })
    h.transport.start()
    h.advance(2)
    const expected = secondsPerStep(120)
    for (let index = 1; index < h.steps.length; index++) {
      expect(h.steps[index]!.time - h.steps[index - 1]!.time).toBeCloseTo(expected, 6)
    }
  })

  it('does not drift over a long run', () => {
    const h = harness({ bpm: 137 })
    h.transport.start()
    h.advance(30, 400)
    const last = h.steps.at(-1)!
    expect(last.time).toBeCloseTo(last.absolute * secondsPerStep(137), 6)
  })

  it('schedules nothing before it is started', () => {
    const h = harness()
    h.advance(2)
    expect(h.steps).toHaveLength(0)
  })

  it('stops scheduling when stopped', () => {
    const h = harness()
    h.transport.start()
    h.advance(1)
    const count = h.steps.length
    h.transport.stop()
    h.advance(2)
    expect(h.steps).toHaveLength(count)
  })

  it('ignores a second start', () => {
    const h = harness()
    h.transport.start()
    h.advance(1)
    const count = h.steps.length
    h.transport.start()
    expect(h.steps.length).toBe(count)
  })
})

describe('bars', () => {
  it('reports a bar boundary before the first step of that bar', () => {
    const h = harness()
    h.transport.start()
    h.advance(4)
    expect(h.bars[0]).toBe(0)
    expect(h.bars[1]).toBe(1)
  })

  it('counts sixteen steps to a bar by default', () => {
    const h = harness()
    h.transport.start()
    h.advance(4)
    const bar1 = h.steps.find((step) => step.bar === 1)!
    expect(bar1.absolute).toBe(16)
    expect(bar1.index).toBe(0)
  })

  it('reads the bar length AFTER the bar callback, so a swap applies to that bar', () => {
    // The ordering that makes bar-quantised swapping work. Every A/B comparison in the
    // curriculum depends on a change committed at a boundary taking effect on the bar that
    // starts there rather than the one after it.
    let length = 16
    const h = harness({ stepsPerBar: () => length })
    const seen: number[] = []
    h.transport.start()
    // Change the length mid-run, the way a queued swap committed at a boundary would.
    h.advance(2)
    length = 8
    h.advance(4)
    for (const step of h.steps) if (step.index === 0) seen.push(step.absolute)
    // Bar 0 was 16 steps; once the length changed, bars are 8 apart.
    const gaps = seen.slice(1).map((value, index) => value - seen[index]!)
    expect(gaps.at(-1)).toBe(8)
  })

  it('honours a per-bar length function', () => {
    const h = harness({ stepsPerBar: (bar) => (bar % 2 === 0 ? 16 : 8) })
    h.transport.start()
    h.advance(4)
    const starts = h.steps.filter((step) => step.index === 0).map((step) => step.absolute)
    expect(starts[0]).toBe(0)
    expect(starts[1]).toBe(16)
    expect(starts[2]).toBe(24)
  })
})

describe('swing', () => {
  it('displaces the off-beats and leaves the on-beats where they were', () => {
    const straight = harness({ swing: 0 })
    straight.transport.start()
    straight.advance(2)

    const swung = harness({ swing: 0.6 })
    swung.transport.start()
    swung.advance(2)

    const count = Math.min(straight.steps.length, swung.steps.length)
    for (let index = 0; index < count; index++) {
      const a = straight.steps[index]!
      const b = swung.steps[index]!
      if (index % 2 === 0) expect(b.time).toBeCloseTo(a.time, 9)
      else expect(b.time).toBeGreaterThan(a.time)
    }
  })

  it('keeps every step in order', () => {
    const h = harness({ swing: 1 })
    h.transport.start()
    h.advance(4)
    for (let index = 1; index < h.steps.length; index++) {
      expect(h.steps[index]!.time).toBeGreaterThan(h.steps[index - 1]!.time)
    }
  })
})

describe('the clock-runaway guard', () => {
  it('does not spin forever when the clock jumps a long way forward', () => {
    // A resumed AudioContext or a machine waking from sleep can move the clock by minutes in
    // one go. Without a bound the scheduler would sit here queueing hundreds of thousands of
    // steps into the past and lock the tab.
    const h = harness()
    h.transport.start()
    h.advance(600, 1)
    expect(h.steps.length).toBeLessThanOrEqual(513)
  })
})

describe('position', () => {
  it('never runs ahead of the sound', () => {
    // The scheduler works up to a lookahead window in front of the audio clock. Reporting
    // the last SCHEDULED step would put the playhead ahead of what the learner can hear —
    // glaring at slow tempos, and it makes the app look like it is guessing.
    //
    // Checked as an invariant across the run rather than at one instant, because at an exact
    // step boundary the two legitimately coincide and a strict `<` would be flaky.
    const h = harness({ bpm: 120 })
    h.transport.start()
    for (let slice = 0; slice < 20; slice++) {
      h.advance(0.1)
      expect(h.transport.position.step).toBeLessThanOrEqual(h.steps.at(-1)!.absolute)
    }
  })

  it('lags the scheduler by roughly the lookahead window', () => {
    // The other half of the same claim: not merely "not ahead", but actually behind by about
    // the window — which is what proves the position is read from the clock and not from the
    // scheduler's own counter.
    const h = harness({ bpm: 120 })
    h.transport.start()
    h.advance(1.05)
    const lag = h.steps.at(-1)!.absolute - h.transport.position.step
    expect(lag).toBeGreaterThan(0)
    expect(lag * secondsPerStep(120)).toBeLessThanOrEqual(LOOKAHEAD_SECONDS + secondsPerStep(120))
  })

  it('is zero when stopped', () => {
    const h = harness()
    expect(h.transport.position).toEqual({ bar: 0, index: 0, step: 0 })
  })
})
