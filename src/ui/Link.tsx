import type { ReactNode } from 'react'
import { hrefFor, type Route } from '../router.js'

/**
 * A link to a route.
 *
 * A real `<a href>`, deliberately. A `<button onClick={navigate}>` looks equivalent and
 * silently breaks middle-click, cmd-click and "open in new tab" — and on a site whose only
 * growth mechanism is someone sharing a lesson, breaking the ability to open one in a new tab
 * is not a small thing. The browser handles hash navigation natively; nothing needs
 * intercepting.
 */
export function Link({
  to,
  children,
  className,
  ariaCurrent,
}: {
  to: Route
  children: ReactNode
  className?: string
  ariaCurrent?: boolean
}) {
  return (
    <a href={hrefFor(to)} className={className} aria-current={ariaCurrent ? 'page' : undefined}>
      {children}
    </a>
  )
}
