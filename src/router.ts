// Routing, in the URL hash.
//
// Hash rather than the history API, and the reason is `base: './'` in vite.config.ts. A
// relative base is what lets one build serve the GitHub Pages project site at /tuneup/, a
// local preview at /, and any other static host, with no BASE_PATH threaded through the
// deploy workflow. A history router has to KNOW its base path to build correct URLs, which
// puts that variable straight back — and on Pages it additionally needs the
// 404.html-copies-index.html trick, which returns a real 404 status, flashes, and breaks the
// back button in ways that are tedious to explain.
//
// Hash routing is the only option that keeps the relative base honest. It deep-links
// correctly wherever the site is served from, including from a file:// copy.
//
// The cost, stated rather than hidden: crawlers and link-preview bots ignore the fragment, so
// a shared lesson link shows the site's card rather than that lesson's. If that ever matters,
// the fix is a small Vite plugin emitting one HTML entry per lesson that redirects into the
// hash route. Not now.

import { UNITS, type UnitId } from './lessons/index.js'

export type Route =
  | { name: 'home' }
  | { name: 'curriculum'; unit?: UnitId }
  | { name: 'lesson'; slug: string }
  | { name: 'sandbox'; widget: string }
  | { name: 'not-found'; hash: string }

const UNIT_IDS = new Set<string>(UNITS.map((unit) => unit.id))

/** Parse a hash into a route. Pure, and the part with all the edge cases. */
export function parseRoute(hash: string): Route {
  // Strip the leading '#', then a leading '/', so '#/l/x', '#l/x' and '#//l/x' all agree.
  // People hand-type these into lesson data and a stray slash should not 404.
  const path = hash.replace(/^#/, '').replace(/^\/+/, '').replace(/\/+$/, '')
  if (path === '') return { name: 'home' }

  const parts = path.split('/').map((part) => safeDecode(part))
  const [head = '', second = ''] = parts

  if (head === 'l' && second) return { name: 'lesson', slug: second }
  if (head === 'curriculum') {
    if (!second) return { name: 'curriculum' }
    return UNIT_IDS.has(second)
      ? { name: 'curriculum', unit: second as UnitId }
      : { name: 'not-found', hash }
  }
  if (head === 'sandbox' && second) return { name: 'sandbox', widget: second }

  return { name: 'not-found', hash }
}

function safeDecode(part: string): string {
  try {
    return decodeURIComponent(part)
  } catch {
    // A stray '%' from a hand-edited URL throws rather than returning the raw text, and an
    // exception here would take out the whole app on load.
    return part
  }
}

export function hrefFor(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/'
    case 'curriculum':
      return route.unit ? `#/curriculum/${route.unit}` : '#/curriculum'
    case 'lesson':
      return `#/l/${encodeURIComponent(route.slug)}`
    case 'sandbox':
      return `#/sandbox/${encodeURIComponent(route.widget)}`
    case 'not-found':
      return route.hash || '#/'
  }
}

export function currentRoute(): Route {
  return parseRoute(typeof location === 'undefined' ? '' : location.hash)
}

export function navigate(route: Route, options: { replace?: boolean } = {}): void {
  const href = hrefFor(route)
  if (options.replace) history.replaceState(null, '', href)
  else location.hash = href.slice(1)
}

export function subscribe(listener: () => void): () => void {
  window.addEventListener('hashchange', listener)
  // replaceState does not fire hashchange, so navigate({replace}) would leave the UI stale.
  window.addEventListener('popstate', listener)
  return () => {
    window.removeEventListener('hashchange', listener)
    window.removeEventListener('popstate', listener)
  }
}

/** Whether two routes point at the same place. Used to avoid pushing a duplicate entry. */
export function sameRoute(a: Route, b: Route): boolean {
  return hrefFor(a) === hrefFor(b)
}
