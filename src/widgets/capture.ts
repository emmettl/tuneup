/**
 * Capture a pointer, tolerating a browser that refuses.
 *
 * `setPointerCapture` throws `InvalidPointerId` for any pointer the element does not consider
 * active — which happens for real reasons, not just synthetic events: a pointer that was
 * already released between the event firing and the handler running, or one belonging to a
 * gesture the browser has taken over. An uncaught throw here aborts the pointerdown handler
 * before it has set up the drag, and the widget is silently inert for that gesture.
 *
 * Losing capture only means a drag leaving the element stops tracking, which is a small
 * degradation. Losing the whole handler is not.
 */
export function capturePointer(element: Element, pointerId: number): void {
  try {
    element.setPointerCapture(pointerId)
  } catch {
    // Not capturable. The drag still works within the element's own bounds.
  }
}

/** The matching release, equally tolerant. */
export function releasePointer(element: Element, pointerId: number): void {
  try {
    if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId)
  } catch {
    // Already gone.
  }
}
