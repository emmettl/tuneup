import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// The layer boundaries, enforced.
//
// tuneup is three layers with one-way dependencies: theory knows nothing, audio knows theory,
// and the UI knows both. That is easy to agree to and easy to erode — the erosion always
// arrives as "just this one import", when a lesson needs a chord name formatted and the
// formatter happens to live in a component.
//
// The cost of erosion is specific rather than aesthetic. The theory core is the layer whose
// correctness decides whether the site teaches true things, and it is exhaustively tested
// precisely because it is pure: no audio device, no DOM, no async. One `document.` reference
// and a chunk of that becomes untestable in Node, and the tests quietly stop covering it.
//
// So this file reads the source and checks. Fifteen lines, and it is the only thing standing
// between the boundary and the first inconvenient afternoon.

const SRC = fileURLToPath(new URL('.', import.meta.url))

function sourceFiles(directory: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(join(SRC, directory), { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) found.push(...sourceFiles(path))
    else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.test.ts')) found.push(path)
  }
  return found
}

/**
 * The file's code, with comments removed.
 *
 * Stripping is not fussiness. The first version matched raw source and failed on the word
 * "window" inside the sentence "the search cost is exponential in the window" — a comment
 * explaining an octave search range in voicing.ts. A boundary check that fires on prose
 * teaches everyone to work around it, which is worse than not having it.
 */
const read = (path: string) =>
  readFileSync(join(SRC, path), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')

describe('the theory layer stays pure', () => {
  const files = sourceFiles('theory')

  it('has files to check', () => {
    // Guards the guard: a rename that emptied this list would make every assertion below
    // vacuously true, and the suite would go green while checking nothing.
    expect(files.length).toBeGreaterThan(5)
  })

  it('imports nothing from outside itself', () => {
    for (const path of files) {
      expect(read(path), path).not.toMatch(/from '\.\.\//)
    }
  })

  it('never touches Web Audio', () => {
    for (const path of files) {
      expect(read(path), path).not.toMatch(/AudioContext|AudioNode|createOscillator/)
    }
  })

  it('never touches the DOM', () => {
    for (const path of files) {
      expect(read(path), path).not.toMatch(/\bdocument\.|\bwindow\.|HTMLElement/)
    }
  })

  it('never imports React', () => {
    for (const path of files) {
      expect(read(path), path).not.toMatch(/from 'react/)
    }
  })
})

describe('import extensions', () => {
  // One rule, decided on day one because it is a repo-wide diff later: `.ts` modules are
  // imported with a `.js` extension, `.tsx` components with `.tsx`. Both resolve under
  // `allowImportingTsExtensions` with bundler resolution; what matters is that it is
  // consistent, so nobody has to think about it per import.
  const files = [...sourceFiles('theory')]

  it('always writes an extension on a relative import', () => {
    for (const path of files) {
      const relative = read(path).match(/from '(\.[^']*)'/g) ?? []
      for (const statement of relative) {
        expect(statement, `${path}: ${statement}`).toMatch(/\.(js|tsx)'$/)
      }
    }
  })
})
