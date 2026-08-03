import { describe, expect, it } from 'vitest'
import { chord, chordSemitones } from './chord.js'
import {
  DEFAULT_CENTRE,
  closeVoicing,
  shell,
  spread,
  strumOffsets,
  totalMovement,
  voiceLead,
  voiceProgression,
} from './voicing.js'

const classes = (pitches: number[]) => new Set(pitches.map((p) => ((p % 12) + 12) % 12))

describe('close voicing', () => {
  it('stacks the chord upwards from near the centre', () => {
    const voicing = closeVoicing(chord('C'), 64)
    expect(voicing).toEqual([60, 64, 67])
  })

  it('lands somewhere sensible whatever the root', () => {
    for (const text of ['C', 'F#', 'Bb', 'E', 'Ab']) {
      const voicing = closeVoicing(chord(text), DEFAULT_CENTRE)
      expect(voicing[0], text).toBeGreaterThanOrEqual(DEFAULT_CENTRE - 12)
      expect(voicing[0], text).toBeLessThanOrEqual(DEFAULT_CENTRE)
    }
  })

  it('applies an inversion', () => {
    expect(closeVoicing({ ...chord('C'), inversion: 1 }, 64)).toEqual([64, 67, 72])
  })

  it('always ascends', () => {
    for (const text of ['C', 'Am7', 'G13', 'Cdim7', 'F#m9']) {
      const voicing = closeVoicing(chord(text))
      for (let i = 1; i < voicing.length; i++) {
        expect(voicing[i]!, text).toBeGreaterThan(voicing[i - 1]!)
      }
    }
  })
})

describe('voice leading', () => {
  it('keeps the note the two chords share exactly where it was', () => {
    // C major and F major both contain a C. A player does not move it, and neither should we.
    const first = closeVoicing(chord('C'), 64)
    const second = voiceLead(chord('F'), first, 64)
    const kept = second.filter((midi) => first.includes(midi))
    expect(kept.length).toBeGreaterThanOrEqual(1)
  })

  it('moves less than a blindly re-stacked chord would', () => {
    // The claim the whole file exists to make, stated as a number rather than as taste.
    const progression = ['C', 'F', 'G', 'Am', 'C'].map((text) => chord(text))
    const led = voiceProgression(progression, 64)
    const blocked = progression.map((spec) => closeVoicing(spec, 64))
    expect(totalMovement(led)).toBeLessThan(totalMovement(blocked))
  })

  it('never moves a triad more than a few semitones in total between neighbours', () => {
    const led = voiceProgression(['C', 'F', 'G', 'C'].map((text) => chord(text)), 64)
    for (let index = 1; index < led.length; index++) {
      expect(totalMovement([led[index - 1]!, led[index]!])).toBeLessThanOrEqual(5)
    }
  })

  it('plays the right notes, whatever octave it puts them in', () => {
    // Voice leading may re-octave and reorder freely. What it may never do is change the
    // chord. Comparing pitch-class sets is exactly that claim, and it is what keeps the
    // optimiser honest — without it, "minimise movement" is happy to drop a note.
    const progression = ['Cmaj7', 'Am7', 'Dm7', 'G7'].map((text) => chord(text))
    voiceProgression(progression, 64).forEach((voicing, index) => {
      const spec = progression[index]!
      expect(classes(voicing), spec.quality).toEqual(classes(closeVoicing(spec, 64)))
      expect(voicing, spec.quality).toHaveLength(chordSemitones(spec.quality).length)
    })
  })

  it('never doubles a note onto itself', () => {
    const led = voiceProgression(
      ['C', 'Am', 'F', 'G', 'Em', 'Dm', 'G7', 'C'].map((text) => chord(text)),
      64,
    )
    for (const voicing of led) {
      expect(new Set(voicing).size).toBe(voicing.length)
    }
  })

  it('falls back to a close voicing when there is nothing to lead from', () => {
    expect(voiceLead(chord('C'), null, 64)).toEqual(closeVoicing(chord('C'), 64))
    expect(voiceLead(chord('C'), [], 64)).toEqual(closeVoicing(chord('C'), 64))
  })

  it('does not let a progression drift up the keyboard', () => {
    // Eight bars of independent "voice it near the centre" walks steadily upwards and it is
    // very audible. Anchoring each chord to the previous one is what stops it.
    const long = Array.from({ length: 16 }, (_, i) => chord(['C', 'F', 'G', 'Am'][i % 4]!))
    const led = voiceProgression(long, 64)
    const first = led[0]!
    const last = led.at(-1)!
    expect(Math.abs(last[0]! - first[0]!)).toBeLessThanOrEqual(12)
  })

  it('stays inside a playable range', () => {
    const led = voiceProgression(
      ['C', 'F#', 'Bb', 'E', 'Ab', 'D'].map((text) => chord(text)),
      64,
    )
    for (const voicing of led) {
      expect(Math.min(...voicing)).toBeGreaterThanOrEqual(36)
      expect(Math.max(...voicing)).toBeLessThanOrEqual(88)
    }
  })
})

describe('shell voicings', () => {
  it('drops the fifth from a seventh chord', () => {
    const full = closeVoicing(chord('Cmaj7'), 64)
    const shelled = shell(chord('Cmaj7'), 64)
    expect(shelled).toHaveLength(3)
    expect(shelled).not.toContain(full[2])
  })

  it('leaves a triad alone, because two notes is not a chord', () => {
    expect(shell(chord('C'), 64)).toEqual(closeVoicing(chord('C'), 64))
  })
})

describe('spread voicings', () => {
  it('drops the root an octave and leaves the rest', () => {
    const close = closeVoicing(chord('Cm9'), 64)
    const opened = spread(chord('Cm9'), 64)
    expect(opened[0]).toBe(close[0]! - 12)
    expect(opened.slice(1)).toEqual(close.slice(1))
  })
})

describe('strum offsets', () => {
  it('starts at zero and ends at the spread', () => {
    const offsets = strumOffsets(4, 0.012)
    expect(offsets[0]).toBe(0)
    expect(offsets.at(-1)).toBeCloseTo(0.012)
  })

  it('spaces the notes evenly', () => {
    const offsets = strumOffsets(5, 0.02)
    for (let i = 2; i < offsets.length; i++) {
      expect(offsets[i]! - offsets[i - 1]!).toBeCloseTo(offsets[1]! - offsets[0]!)
    }
  })

  it('handles a single note without dividing by zero', () => {
    expect(strumOffsets(1)).toEqual([0])
  })

  it('stays below the threshold where separate notes are heard', () => {
    // Above roughly 30ms a strum stops being a chord and starts being an arpeggio.
    expect(Math.max(...strumOffsets(6))).toBeLessThan(0.03)
  })
})
