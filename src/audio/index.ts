// The audio layer.
//
// Web Audio, and nothing above it: no React, no components. `src/architecture.test.ts` keeps
// the theory layer below this one clean; this layer is allowed to know about theory, and
// nothing in the UI should reach past `player()` into the graph.

export * from './timing.js'
export * from './transport.js'
export * from './sounding.js'
export * from './spec.js'
export * from './context.js'
export * from './player.js'
export { PATCHES, INSTRUMENT_IDS, type InstrumentId } from './instruments/keys.js'
export { DRUM_IDS, DRUM_NAMES, type DrumId } from './instruments/kit.js'
