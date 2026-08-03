import { useSyncExternalStore } from 'react'
import { preferences, subscribePreferences, type Preferences } from '../preferences.js'

/**
 * A site-wide preference, and a setter.
 *
 * `useSyncExternalStore` over the module's own store rather than context: preferences are read
 * in a handful of scattered places and threading a provider through every lesson to deliver
 * one boolean would be more machinery than the feature is worth.
 *
 * The snapshot is the whole object, which is stable between changes — returning a fresh object
 * per call would re-render forever.
 */
export function usePreferences(): Preferences {
  return useSyncExternalStore(subscribePreferences, preferences, preferences)
}
