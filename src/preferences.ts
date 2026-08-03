// Site-wide preferences.
//
// Only things a learner sets once and expects to stay set. Anything scoped to a single lesson
// belongs in that lesson's own state — a preference that only matters in one place is a prop
// wearing a disguise.

const KEY = 'tuneup.prefs.v1'

export interface Preferences {
  /**
   * Show notation alongside the interactive examples.
   *
   * Off by default and global rather than per-lesson: someone who reads music wants it
   * everywhere, and someone who does not should never meet it. Making it per-lesson would ask
   * a beginner the same question thirty times.
   */
  notation: boolean
}

const DEFAULTS: Preferences = { notation: false }

let current: Preferences = load()
const listeners = new Set<() => void>()

function load(): Preferences {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw) as Partial<Preferences>
    return { notation: parsed.notation === true }
  } catch {
    // Private browsing, blocked storage, or malformed JSON. Defaults are fine; failing to
    // load the site over a preference is not.
    return { ...DEFAULTS }
  }
}

export function preferences(): Preferences {
  return current
}

export function setPreference<K extends keyof Preferences>(name: K, value: Preferences[K]): void {
  if (current[name] === value) return
  current = { ...current, [name]: value }
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    // Not worth interrupting for; the setting still applies for this session.
  }
  for (const listener of listeners) listener()
}

export function subscribePreferences(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
