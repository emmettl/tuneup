import type { ReactNode } from 'react'

// The button a lesson uses to make something happen.
//
// This exists because the first two lessons both reached for `lesson-check-option` — the quiz
// answer style — to build a mode toggle, and it looked plausible: same size, same shape. It
// was wrong in a way that matters, because that style means "this is the right answer", so a
// toggle sitting in the on position was quietly telling the learner they had got something
// correct when they had merely chosen a mode.
//
// Writing three lessons before writing forty-seven was supposed to surface exactly this sort
// of thing, and it did.

export interface ControlProps {
  children: ReactNode
  onPress: () => void
  /** For a toggle: whether this option is the one currently selected. */
  active?: boolean
  /** Sets aria-pressed, so a screen reader announces the toggle state rather than just a
   *  button. Omit for a plain "do it now" action, where pressed-ness is meaningless. */
  toggle?: boolean
  label?: string
}

export function Control({ children, onPress, active = false, toggle = false, label }: ControlProps) {
  return (
    <button
      type="button"
      className={`control ${active ? 'is-on' : ''}`}
      // pointerdown rather than click: it is the earliest event that counts as a user gesture
      // for unlocking audio, and on touch it fires a good hundred milliseconds before click —
      // which is the difference between an instrument and a website.
      onPointerDown={onPress}
      onKeyDown={(event) => {
        // Pointer handling means the browser's own click-from-keyboard never reaches us.
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onPress()
        }
      }}
      aria-pressed={toggle ? active : undefined}
      aria-label={label}
    >
      {children}
    </button>
  )
}

/** A row of controls. Exists so lessons stop hand-writing flex styles inline. */
export function Controls({ children }: { children: ReactNode }) {
  return <div className="controls">{children}</div>
}
