import { describe, expect, it } from 'vitest'
import { SILENCE, buildVoice, releaseTime } from './spec.js'
import { INSTRUMENT_IDS, PATCHES, RHODES } from './instruments/keys.js'
import { frequency } from '../theory/pitch.js'

describe('the patches themselves', () => {
  it('gives every operator an envelope and every patch a carrier', () => {
    for (const id of INSTRUMENT_IDS) {
      const patch = PATCHES[id]
      expect(patch.operators.length, id).toBeGreaterThan(0)
      const carriers = patch.operators.filter((op) => op.index === undefined || op.index === 0)
      expect(carriers.length, `${id} has no carrier — it would be silent`).toBeGreaterThan(0)
      for (const operator of patch.operators) {
        expect(operator.amp.attack, id).toBeGreaterThan(0)
        expect(operator.amp.sustain, id).toBeGreaterThanOrEqual(0)
        expect(operator.amp.sustain, id).toBeLessThanOrEqual(1)
        expect(operator.amp.release, id).toBeGreaterThan(0)
      }
    }
  })

  it('points every modulator at an operator that exists', () => {
    for (const id of INSTRUMENT_IDS) {
      const patch = PATCHES[id]
      for (const operator of patch.operators) {
        if (operator.modulates === undefined) continue
        expect(operator.modulates, id).toBeGreaterThanOrEqual(0)
        expect(operator.modulates, id).toBeLessThan(patch.operators.length)
      }
    }
  })

  it('keeps every trim somewhere sane, so no instrument buries another', () => {
    // Measured properly against an offline render; this only catches an order-of-magnitude
    // slip, which is the failure that actually happens when a patch is added in a hurry.
    //
    // The ceiling is above 1 deliberately. Trim is an output gain applied to a sum of
    // operator gains that are themselves well under 1 — the pad is three quiet detuned saws
    // and genuinely needs more than unity to sit level with the electric piano. Capping at 1
    // would force the balance to be faked somewhere less visible.
    for (const id of INSTRUMENT_IDS) {
      expect(PATCHES[id].trim, id).toBeGreaterThan(0.1)
      expect(PATCHES[id].trim, id).toBeLessThanOrEqual(2)
    }
  })

  it('makes the sustained instruments the ones that hold', () => {
    expect(PATCHES.organ.sustained).toBe(true)
    expect(PATCHES.pad.sustained).toBe(true)
    expect(PATCHES.rhodes.sustained).toBe(false)
    // A sustained patch with a sustain of zero would fall silent while the key was held,
    // which is the sort of contradiction that is obvious in the data and baffling by ear.
    for (const id of INSTRUMENT_IDS) {
      if (!PATCHES[id].sustained) continue
      for (const operator of PATCHES[id].operators) {
        expect(operator.amp.sustain, id).toBeGreaterThan(0)
      }
    }
  })
})

describe('velocity drives brightness, not just volume', () => {
  it('raises the modulation depth for a harder note', () => {
    // The detail that separates an instrument from a volume knob. A real instrument played
    // harder gets harmonically richer; if velocity only scaled gain, every note would have
    // exactly the same timbre at a different level.
    const soft = buildVoice(RHODES, 60, 0.2)
    const hard = buildVoice(RHODES, 60, 1)
    expect(hard.operators[0]!.gain).toBeGreaterThan(soft.operators[0]!.gain)
  })

  it('raises the overall gain too', () => {
    expect(buildVoice(RHODES, 60, 1).gain).toBeGreaterThan(buildVoice(RHODES, 60, 0.3).gain)
  })

  it('opens the filter further for a harder note', () => {
    const soft = buildVoice(RHODES, 60, 0.2)
    const hard = buildVoice(RHODES, 60, 1)
    expect(hard.filter!.frequency).toBeGreaterThan(soft.filter!.frequency)
  })

  it('never produces a silent or negative voice, however soft', () => {
    for (const velocity of [0, -1, 0.001]) {
      const plan = buildVoice(RHODES, 60, velocity)
      expect(plan.gain).toBeGreaterThan(0)
    }
  })
})

describe('high notes decay faster', () => {
  it('shortens the decay as the pitch rises', () => {
    // A piano's top note rings for under a second and its bottom note for the best part of
    // ten. Uniform decay is the single clearest tell that a keyboard is synthesised.
    const low = buildVoice(RHODES, 36)
    const middle = buildVoice(RHODES, 60)
    const high = buildVoice(RHODES, 84)
    expect(low.duration).toBeGreaterThan(middle.duration)
    expect(middle.duration).toBeGreaterThan(high.duration)
  })

  it('leaves the sustained instruments alone', () => {
    // An organ pipe does not decay faster because it is higher. Applying the tracking
    // anyway would make the top of the keyboard fade under a held chord.
    const low = buildVoice(PATCHES.organ, 36)
    const high = buildVoice(PATCHES.organ, 84)
    expect(low.duration).toBeCloseTo(high.duration)
  })

  it('keeps the shortest note long enough to be heard', () => {
    for (const id of INSTRUMENT_IDS) {
      expect(buildVoice(PATCHES[id], 96).duration, id).toBeGreaterThan(0.05)
    }
  })
})

describe('pitch', () => {
  it('puts the carrier at the note frequency', () => {
    const plan = buildVoice(RHODES, 69)
    const carrier = plan.operators.find((op) => op.modulates === undefined)!
    expect(carrier.frequency).toBeCloseTo(frequency(69))
  })

  it('scales every operator by its ratio', () => {
    const plan = buildVoice(RHODES, 60)
    RHODES.operators.forEach((operator, index) => {
      expect(plan.operators[index]!.frequency).toBeCloseTo(frequency(60) * operator.ratio)
    })
  })

  it('scales modulation depth with the carrier, so the timbre is the same at every pitch', () => {
    // A modulator's depth is a frequency deviation in Hz. Held constant, an index that
    // sounds bell-like at the bottom of the keyboard is inaudible at the top.
    const low = buildVoice(RHODES, 48)
    const high = buildVoice(RHODES, 72)
    const ratio = high.operators[0]!.gain / low.operators[0]!.gain
    expect(ratio).toBeCloseTo(frequency(72) / frequency(48), 1)
  })
})

describe('detune', () => {
  it('is deterministic, so the same note twice is the same note', () => {
    expect(buildVoice(RHODES, 60).operators[0]!.detune).toBe(
      buildVoice(RHODES, 60).operators[0]!.detune,
    )
  })

  it('differs between notes, so a chord does not phase-cancel into something thinner', () => {
    const a = buildVoice(RHODES, 60).operators[1]!.detune
    const b = buildVoice(RHODES, 64).operators[1]!.detune
    expect(a).not.toBe(b)
  })

  it('stays within a few cents, which is character rather than being out of tune', () => {
    for (const id of INSTRUMENT_IDS) {
      for (let midi = 36; midi <= 96; midi += 3) {
        for (const operator of buildVoice(PATCHES[id], midi).operators) {
          expect(Math.abs(operator.detune), `${id} ${midi}`).toBeLessThanOrEqual(
            PATCHES[id].spread + 15,
          )
        }
      }
    }
  })
})

describe('the exponential-ramp floor', () => {
  it('is above zero, because a ramp to zero throws', () => {
    // exponentialRampToValueAtTime(0) is invalid and raises. Every ramp-to-silence in the
    // codebase targets this instead and then hard-sets to zero — and it has to be inaudible
    // rather than merely small.
    expect(SILENCE).toBeGreaterThan(0)
    expect(SILENCE).toBeLessThan(0.001)
  })
})

describe('release', () => {
  it('reports the longest release of any operator', () => {
    const plan = buildVoice(RHODES, 60)
    const longest = Math.max(...plan.operators.map((op) => op.amp.release))
    expect(releaseTime(plan)).toBe(longest)
  })

  it('is never zero, because an instant cutoff clicks', () => {
    for (const id of INSTRUMENT_IDS) {
      expect(releaseTime(buildVoice(PATCHES[id], 60)), id).toBeGreaterThan(0)
    }
  })
})
