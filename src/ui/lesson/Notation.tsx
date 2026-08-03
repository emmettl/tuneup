import Staff from '../../notation/Staff.tsx'
import { usePreferences } from '../usePreference.js'
import type { Key } from '../../theory/key.js'
import type { Spelled } from '../../theory/pitch.js'

/**
 * The stave for whatever the lesson just demonstrated, if the learner wants one.
 *
 * Renders nothing at all when the preference is off, which is the default. That is the whole
 * bargain of the toggle: the curriculum is written to work without notation, and this is
 * additive for the people who read it — never a second explanation the rest have to skip past.
 */
export function Notation({
  notes,
  musicKey,
  chord,
  label,
}: {
  notes: Spelled[]
  musicKey: Key
  chord?: boolean
  label?: string
}) {
  const { notation } = usePreferences()
  if (!notation || notes.length === 0) return null
  return (
    <figure className="lesson-notation">
      <Staff notes={notes} musicKey={musicKey} chord={chord} label={label} />
    </figure>
  )
}
