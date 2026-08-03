import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  LESSONS,
  UNITS,
  lessonBySlug,
  nextLesson,
  orderedLessons,
  populatedUnits,
  previousLesson,
} from './index.js'

const HERE = fileURLToPath(new URL('.', import.meta.url))

describe('slugs', () => {
  it('are unique', () => {
    const slugs = LESSONS.map((lesson) => lesson.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('are kebab-case and url-safe', () => {
    // A slug is a permanent URL and the key progress is stored under. Anything needing
    // encoding will get encoded inconsistently somewhere and quietly split one lesson's
    // progress across two keys.
    for (const lesson of LESSONS) {
      expect(lesson.slug, lesson.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      expect(encodeURIComponent(lesson.slug)).toBe(lesson.slug)
    }
  })
})

describe('units', () => {
  it('gives every lesson a unit that exists', () => {
    const ids = new Set(UNITS.map((unit) => unit.id))
    for (const lesson of LESSONS) {
      expect(ids.has(lesson.unit), `${lesson.slug} → ${lesson.unit}`).toBe(true)
    }
  })

  it('has unique unit ids', () => {
    const ids = UNITS.map((unit) => unit.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('only offers units that actually have lessons', () => {
    // An empty chapter heading in the nav is a promise the site is not yet keeping.
    for (const unit of populatedUnits()) {
      expect(LESSONS.some((lesson) => lesson.unit === unit.id), unit.id).toBe(true)
    }
  })
})

describe('prerequisites', () => {
  it('point at lessons that exist', () => {
    for (const lesson of LESSONS) {
      for (const slug of lesson.after ?? []) {
        expect(lessonBySlug(slug), `${lesson.slug} after ${slug}`).toBeDefined()
      }
    }
  })

  it('never point at themselves', () => {
    for (const lesson of LESSONS) {
      expect(lesson.after ?? [], lesson.slug).not.toContain(lesson.slug)
    }
  })

  it('have no cycles', () => {
    // Advisory or not, a cycle would make "this builds on…" render a loop of chips that never
    // reaches a starting point.
    const seen = new Map<string, 'visiting' | 'done'>()
    const walk = (slug: string, trail: string[]): void => {
      const state = seen.get(slug)
      if (state === 'done') return
      expect(state, `cycle: ${[...trail, slug].join(' → ')}`).not.toBe('visiting')
      seen.set(slug, 'visiting')
      for (const next of lessonBySlug(slug)?.after ?? []) walk(next, [...trail, slug])
      seen.set(slug, 'done')
    }
    for (const lesson of LESSONS) walk(lesson.slug, [])
  })

  it('only depend on lessons that come earlier in the curriculum', () => {
    const order = new Map(orderedLessons().map((lesson, index) => [lesson.slug, index]))
    for (const lesson of LESSONS) {
      for (const slug of lesson.after ?? []) {
        expect(order.get(slug)!, `${lesson.slug} after ${slug}`).toBeLessThan(order.get(lesson.slug)!)
      }
    }
  })
})

describe('metadata', () => {
  it('keeps every summary to a single line', () => {
    for (const lesson of LESSONS) {
      expect(lesson.summary.length, lesson.slug).toBeLessThanOrEqual(100)
      expect(lesson.summary, lesson.slug).not.toContain('\n')
    }
  })

  it('gives every lesson a plausible length', () => {
    for (const lesson of LESSONS) {
      expect(lesson.minutes, lesson.slug).toBeGreaterThan(0)
      expect(lesson.minutes, lesson.slug).toBeLessThanOrEqual(15)
    }
  })
})

describe('ordering', () => {
  it('follows unit order', () => {
    const unitIndex = new Map(UNITS.map((unit, index) => [unit.id, index]))
    const order = orderedLessons().map((lesson) => unitIndex.get(lesson.unit)!)
    for (let i = 1; i < order.length; i++) {
      expect(order[i]!).toBeGreaterThanOrEqual(order[i - 1]!)
    }
  })

  it('links each lesson to its neighbours', () => {
    const all = orderedLessons()
    expect(previousLesson(all[0]!.slug)).toBeUndefined()
    expect(nextLesson(all.at(-1)!.slug)).toBeUndefined()
    for (let i = 1; i < all.length; i++) {
      expect(nextLesson(all[i - 1]!.slug)?.slug).toBe(all[i]!.slug)
      expect(previousLesson(all[i]!.slug)?.slug).toBe(all[i - 1]!.slug)
    }
  })

  it('includes every registered lesson exactly once', () => {
    expect(orderedLessons()).toHaveLength(LESSONS.length)
  })
})

describe('the registry matches the files on disk', () => {
  /** Every .tsx under src/lessons, relative to this directory. */
  function lessonFiles(directory = ''): string[] {
    const found: string[] = []
    for (const entry of readdirSync(join(HERE, directory), { withFileTypes: true })) {
      const path = directory ? `${directory}/${entry.name}` : entry.name
      if (entry.isDirectory()) found.push(...lessonFiles(path))
      else if (entry.name.endsWith('.tsx')) found.push(path)
    }
    return found
  }

  /**
   * The import paths written in index.ts, read from the SOURCE.
   *
   * Not from `load.toString()`: the bundler rewrites dynamic imports, so scraping the
   * function body passes in Node and silently matches nothing once transformed — a test that
   * looks green while checking exactly zero things.
   */
  function registeredPaths(): Set<string> {
    const source = readFileSync(join(HERE, 'index.ts'), 'utf8')
    return new Set([...source.matchAll(/import\('\.\/(.+?\.tsx)'\)/g)].map((match) => match[1]!))
  }

  it('finds the imports it is checking', () => {
    // Guards the guard. If the import style in index.ts ever changes, this fails loudly
    // instead of letting both assertions below pass vacuously.
    expect(registeredPaths().size).toBe(LESSONS.length)
  })

  it('registers every lesson component that exists', () => {
    // The failure that actually happens: someone writes a lesson, forgets to add it to the
    // registry, and it is simply invisible — no error, no broken link, nothing to notice.
    // Nothing else in the project catches that.
    const registered = registeredPaths()
    for (const file of lessonFiles()) {
      expect(registered.has(file), `${file} exists but is not in LESSONS`).toBe(true)
    }
  })

  it('points every registered import at a file that exists', () => {
    const files = new Set(lessonFiles())
    for (const path of registeredPaths()) {
      expect(files.has(path), `LESSONS imports ${path}, which is not on disk`).toBe(true)
    }
  })
})
