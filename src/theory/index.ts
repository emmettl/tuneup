// The music theory core.
//
// Pure TypeScript: no DOM, no Web Audio, no React, and no imports from outside this
// directory. `src/architecture.test.ts` enforces that, because the boundary is the thing that
// keeps this layer exhaustively testable — and it is the layer where being wrong means
// teaching someone something false.

export * from './pitch.js'
export * from './interval.js'
export * from './scale.js'
export * from './key.js'
export * from './chord.js'
export * from './voicing.js'
export * from './roman.js'
export * from './progression.js'
