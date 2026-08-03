import { setPreference } from '../preferences.js'
import { usePreferences } from './usePreference.js'

/**
 * Site-wide settings.
 *
 * One row, in the footer. Notation is off by default — the curriculum is written to work
 * entirely without it, and someone who cannot read music should never have to dismiss a stave
 * they did not ask for.
 */
export default function Settings() {
  const { notation } = usePreferences()
  return (
    <div className="settings">
      <label className="settings-toggle">
        <input
          type="checkbox"
          checked={notation}
          onChange={(event) => setPreference('notation', event.target.checked)}
        />
        <span>Show notation</span>
      </label>
      <span className="settings-note">
        Adds a stave beside the examples. Everything works without it.
      </span>
    </div>
  )
}
