import { describe, expect, it } from 'vitest'
import { hrefFor, parseRoute, sameRoute, type Route } from './router.js'

describe('parsing', () => {
  it('reads the routes the app uses', () => {
    expect(parseRoute('#/')).toEqual({ name: 'home' })
    expect(parseRoute('#/l/twelve-doors')).toEqual({ name: 'lesson', slug: 'twelve-doors' })
    expect(parseRoute('#/curriculum')).toEqual({ name: 'curriculum' })
    expect(parseRoute('#/curriculum/blues')).toEqual({ name: 'curriculum', unit: 'blues' })
    expect(parseRoute('#/sandbox/keyboard')).toEqual({ name: 'sandbox', widget: 'keyboard' })
  })

  it('treats an empty or bare hash as home', () => {
    // A first visit has no hash at all, and '#' alone is what a bare anchor leaves behind.
    for (const hash of ['', '#', '#/', '#//']) {
      expect(parseRoute(hash), JSON.stringify(hash)).toEqual({ name: 'home' })
    }
  })

  it('tolerates stray slashes, because these get hand-typed into lesson data', () => {
    expect(parseRoute('#//l/twelve-doors')).toEqual({ name: 'lesson', slug: 'twelve-doors' })
    expect(parseRoute('#/l/twelve-doors/')).toEqual({ name: 'lesson', slug: 'twelve-doors' })
  })

  it('decodes an encoded slug', () => {
    expect(parseRoute('#/l/twelve%2Ddoors')).toEqual({ name: 'lesson', slug: 'twelve-doors' })
  })

  it('survives a malformed escape rather than taking out the app', () => {
    // decodeURIComponent throws on a lone '%'. An exception during route parsing happens on
    // load, before anything can catch it, and the whole page would be blank.
    expect(() => parseRoute('#/l/100%')).not.toThrow()
    expect(parseRoute('#/l/100%')).toEqual({ name: 'lesson', slug: '100%' })
  })

  it('rejects an unknown unit rather than rendering an empty chapter', () => {
    expect(parseRoute('#/curriculum/nonsense').name).toBe('not-found')
  })

  it('returns not-found for anything it does not recognise', () => {
    for (const hash of ['#/nope', '#/l', '#/sandbox']) {
      expect(parseRoute(hash).name, hash).toBe('not-found')
    }
  })
})

describe('building hrefs', () => {
  it('round-trips every route', () => {
    const routes: Route[] = [
      { name: 'home' },
      { name: 'curriculum' },
      { name: 'curriculum', unit: 'blues' },
      { name: 'lesson', slug: 'the-blue-note' },
      { name: 'sandbox', widget: 'keyboard' },
    ]
    for (const route of routes) {
      expect(parseRoute(hrefFor(route)), hrefFor(route)).toEqual(route)
    }
  })

  it('always produces a hash, so nothing ever navigates the document', () => {
    expect(hrefFor({ name: 'home' }).startsWith('#')).toBe(true)
    expect(hrefFor({ name: 'lesson', slug: 'x' }).startsWith('#')).toBe(true)
  })

  it('encodes a slug that would otherwise break the path', () => {
    expect(hrefFor({ name: 'lesson', slug: 'a/b' })).toBe('#/l/a%2Fb')
    expect(parseRoute('#/l/a%2Fb')).toEqual({ name: 'lesson', slug: 'a/b' })
  })

  it('compares routes by where they point', () => {
    expect(sameRoute({ name: 'lesson', slug: 'x' }, { name: 'lesson', slug: 'x' })).toBe(true)
    expect(sameRoute({ name: 'lesson', slug: 'x' }, { name: 'lesson', slug: 'y' })).toBe(false)
  })
})
