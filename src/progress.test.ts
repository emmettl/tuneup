import { describe, expect, it } from 'vitest'
import {
  completion,
  emptyProgress,
  markCheck,
  markExplored,
  markVisited,
  migrate,
  statusOf,
} from './progress.js'

describe('migrate', () => {
  it('accepts a well-formed record', () => {
    const stored = { version: 1, lessons: { a: { visited: true, explored: true, checks: { q: true } } }, last: 'a' }
    expect(migrate(stored)).toEqual(stored)
  })

  it('never throws, whatever is in storage', () => {
    // Storage can hold a half-written value from a killed tab, something from a newer version
    // of the app, or hand-edited nonsense. Throwing here happens on load and blanks the page,
    // over data nobody would miss.
    for (const junk of [null, undefined, 0, 'nope', [], {}, { version: 9 }, { version: 1, lessons: 5 }]) {
      expect(() => migrate(junk), JSON.stringify(junk)).not.toThrow()
      expect(migrate(junk).version).toBe(1)
    }
  })

  it('drops entries that are not lesson records', () => {
    const result = migrate({ version: 1, lessons: { a: null, b: 'x', c: { visited: true } } })
    expect(Object.keys(result.lessons)).toEqual(['c'])
    expect(result.lessons.c).toEqual({ visited: true, explored: false, checks: {} })
  })

  it('coerces truthy junk to real booleans', () => {
    const result = migrate({ version: 1, lessons: { a: { visited: 'yes', explored: 1, checks: { q: 'x' } } } })
    expect(result.lessons.a).toEqual({ visited: false, explored: false, checks: { q: false } })
  })

  it('starts fresh on an unknown version rather than guessing', () => {
    expect(migrate({ version: 2, lessons: { a: { visited: true } } }).lessons).toEqual({})
  })
})

describe('recording progress', () => {
  it('marks a lesson visited and remembers it as the last one', () => {
    const p = markVisited(emptyProgress(), 'twelve-doors')
    expect(p.lessons['twelve-doors']?.visited).toBe(true)
    expect(p.last).toBe('twelve-doors')
  })

  it('does not mutate what it was given', () => {
    const before = emptyProgress()
    markVisited(before, 'x')
    expect(before.lessons).toEqual({})
  })

  it('keeps a check right once it has been right', () => {
    // A learner who gets it, then idly clicks a wrong answer to see what it says, has not
    // un-learned it.
    let p = markCheck(emptyProgress(), 'a', 'q1', true)
    p = markCheck(p, 'a', 'q1', false)
    expect(p.lessons.a?.checks.q1).toBe(true)
  })
})

describe('status', () => {
  it('walks from untouched to complete', () => {
    let p = emptyProgress()
    expect(statusOf(p, 'a', ['q'])).toBe('untouched')
    p = markVisited(p, 'a')
    expect(statusOf(p, 'a', ['q'])).toBe('visited')
    p = markExplored(p, 'a')
    expect(statusOf(p, 'a', ['q'])).toBe('explored')
    p = markCheck(p, 'a', 'q', true)
    expect(statusOf(p, 'a', ['q'])).toBe('complete')
  })

  it('completes a lesson with no questions once it has been played with', () => {
    // The interaction IS the lesson. Inventing a quiz to gate completion is exactly the
    // homework feeling this project avoids.
    const p = markExplored(markVisited(emptyProgress(), 'a'), 'a')
    expect(statusOf(p, 'a', [])).toBe('complete')
  })

  it('does not complete while a question is unanswered', () => {
    const p = markExplored(markVisited(emptyProgress(), 'a'), 'a')
    expect(statusOf(p, 'a', ['q1', 'q2'])).toBe('explored')
  })
})

describe('completion', () => {
  it('is a fraction of the lessons explored', () => {
    let p = emptyProgress()
    p = markExplored(markVisited(p, 'a'), 'a')
    expect(completion(p, ['a', 'b'])).toBe(0.5)
    expect(completion(p, [])).toBe(0)
  })

  it('does not count a lesson merely opened', () => {
    const p = markVisited(emptyProgress(), 'a')
    expect(completion(p, ['a'])).toBe(0)
  })
})
