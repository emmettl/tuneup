import { describe, expect, it } from 'vitest'
import { SoundingNotes } from './sounding.js'

const note = (midi: number, from: number, to: number) => ({ midi, from, to })

describe('scheduling ahead of the sound', () => {
  it('does not light a note that has been scheduled but is not yet sounding', () => {
    // The bug this class exists to prevent. A note scheduled 120ms ahead must not light the
    // key 120ms early — at slow tempos that is most of a beat, and the app looks like it is
    // guessing rather than listening.
    const sounding = new SoundingNotes()
    sounding.schedule(note(60, 1, 1.5))
    sounding.sample(0.9)
    expect(sounding.activeMidi().size).toBe(0)
    expect(sounding.isSounding(60)).toBe(false)
  })

  it('lights it exactly when the clock reaches it', () => {
    const sounding = new SoundingNotes()
    sounding.schedule(note(60, 1, 1.5))
    sounding.sample(1)
    expect(sounding.isSounding(60)).toBe(true)
  })

  it('puts it out when the note ends', () => {
    const sounding = new SoundingNotes()
    sounding.schedule(note(60, 1, 1.5))
    sounding.sample(1.2)
    expect(sounding.isSounding(60)).toBe(true)
    sounding.sample(1.5)
    expect(sounding.isSounding(60)).toBe(false)
  })

  it('reports pending notes separately from sounding ones', () => {
    const sounding = new SoundingNotes()
    sounding.schedule(note(60, 1, 1.5))
    sounding.schedule(note(64, 2, 2.5))
    sounding.sample(1.2)
    expect(sounding.pending(1.2).map((n) => n.midi)).toEqual([64])
  })
})

describe('change detection', () => {
  it('reports a change when a note starts or stops', () => {
    const sounding = new SoundingNotes()
    sounding.schedule(note(60, 1, 2))
    expect(sounding.sample(0.5)).toBe(false)
    expect(sounding.sample(1)).toBe(true)
    expect(sounding.sample(2)).toBe(true)
  })

  it('reports no change while a chord is held', () => {
    // The reason this returns a boolean at all: a held chord should cost one render, not
    // sixty a second. Without it, the keyboard re-renders every frame for nothing and
    // competes with the scheduler for the main thread.
    const sounding = new SoundingNotes()
    for (const midi of [60, 64, 67]) sounding.schedule(note(midi, 0, 4))
    expect(sounding.sample(1)).toBe(true)
    for (const now of [1.1, 1.5, 2, 3, 3.9]) {
      expect(sounding.sample(now), `${now}`).toBe(false)
    }
  })

  it('bumps the version only when the set actually changes', () => {
    const sounding = new SoundingNotes()
    sounding.schedule(note(60, 0, 2))
    sounding.sample(0)
    const after = sounding.version
    sounding.sample(0.5)
    sounding.sample(1)
    expect(sounding.version).toBe(after)
    sounding.sample(2)
    expect(sounding.version).toBe(after + 1)
  })

  it('treats a re-struck note at the same pitch as no change to the set', () => {
    // Two overlapping notes at one pitch are still one lit key. The set is what the UI
    // draws, so the set is what change detection tracks.
    const sounding = new SoundingNotes()
    sounding.schedule(note(60, 0, 2))
    sounding.schedule(note(60, 1, 3))
    sounding.sample(0.5)
    const version = sounding.version
    expect(sounding.sample(1.5)).toBe(false)
    expect(sounding.version).toBe(version)
    expect(sounding.isSounding(60)).toBe(true)
  })
})

describe('chords', () => {
  it('holds every note of a chord at once', () => {
    const sounding = new SoundingNotes()
    for (const midi of [60, 64, 67]) sounding.schedule(note(midi, 1, 2))
    sounding.sample(1.5)
    expect([...sounding.activeMidi()].sort((a, b) => a - b)).toEqual([60, 64, 67])
  })

  it('releases them independently', () => {
    const sounding = new SoundingNotes()
    sounding.schedule(note(60, 1, 3))
    sounding.schedule(note(64, 1, 2))
    sounding.sample(2.5)
    expect([...sounding.activeMidi()]).toEqual([60])
  })

  it('exposes the notes themselves, not just the pitches', () => {
    const sounding = new SoundingNotes()
    sounding.schedule({ midi: 60, from: 0, to: 2, track: 'keys' })
    sounding.sample(1)
    expect(sounding.active()[0]?.track).toBe('keys')
  })
})

describe('housekeeping', () => {
  it('prunes notes that finished long ago', () => {
    // This runs every frame on a page a learner may leave open. A list that only grows is a
    // slow leak, and the pruning happens in the same pass as the sampling rather than as a
    // separate filter allocating a new array sixty times a second.
    const sounding = new SoundingNotes()
    for (let index = 0; index < 500; index++) {
      sounding.schedule(note(60 + (index % 12), index * 0.1, index * 0.1 + 0.05))
    }
    sounding.sample(60)
    expect(sounding.pending(60)).toHaveLength(0)
    expect(sounding.activeMidi().size).toBe(0)
  })

  it('does not prune a note that has only just finished', () => {
    // A slow frame must not be able to step straight over a short note and miss it entirely.
    const sounding = new SoundingNotes()
    sounding.schedule(note(60, 1, 1.05))
    sounding.sample(1.1)
    sounding.sample(1.02)
    expect(sounding.isSounding(60)).toBe(true)
  })

  it('clears everything, so a stopped transport leaves no key lit', () => {
    const sounding = new SoundingNotes()
    for (const midi of [60, 64, 67]) sounding.schedule(note(midi, 0, 10))
    sounding.sample(1)
    const version = sounding.version
    sounding.clear()
    expect(sounding.activeMidi().size).toBe(0)
    expect(sounding.active()).toHaveLength(0)
    // The version has to move, or a reader that bails on an unchanged version would keep
    // drawing the keys it drew before the stop.
    expect(sounding.version).toBe(version + 1)
  })

  it('does not bump the version clearing an already-empty registry', () => {
    const sounding = new SoundingNotes()
    const version = sounding.version
    sounding.clear()
    expect(sounding.version).toBe(version)
  })
})
