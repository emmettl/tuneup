import { useSyncExternalStore } from 'react'
import { currentRoute, subscribe, type Route } from '../router.js'

// `useSyncExternalStore` rather than an effect-plus-state pair: the hash is genuinely external
// state, and this is the hook that exists to read external state without tearing during a
// concurrent render.
//
// The snapshot has to be CACHED. `currentRoute()` parses the hash into a fresh object every
// call, so returning it directly gives React a new identity every time it checks — which it
// reads as "changed", and it re-renders in a loop until it gives up. Comparing the href and
// only minting a new object when it actually differs is what makes this stable.

let cached: Route = currentRoute()
let cachedHash = typeof location === 'undefined' ? '' : location.hash

function snapshot(): Route {
  const hash = location.hash
  if (hash !== cachedHash) {
    cachedHash = hash
    cached = currentRoute()
  }
  return cached
}

/** The server snapshot. There is no server, but React asks for one and throws without it. */
function serverSnapshot(): Route {
  return { name: 'home' }
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot)
}
