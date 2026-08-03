// The geometry of the pitch clock: twelve chromatic segments in a ring.
//
// Pure, and separate from the component for the same reason the keyboard's is — dragging the
// ring asks "which segment is under this point" on every pointermove, and that has to be a
// function of an angle rather than a DOM lookup.
//
// Why a chromatic ring at all, when there is already a circle of fifths? Because they are
// ordered differently and answer different questions. Fifths order shows how KEYS relate;
// chromatic order shows the SHAPE of a scale — which is the thing that makes "modes are one
// pattern rotated", "the relative minor is the same notes" and "the pentatonic is a scale
// with two holes in it" visible at a glance. Neither ordering can do the other's job.

/** Twelve o'clock is pitch class 0, and the ring runs clockwise, like a clock face. */
export const SEGMENTS = 12

const TAU = Math.PI * 2

/** The angle, in radians, of the CENTRE of a segment. Zero points straight up. */
export function angleOf(pitchClass: number): number {
  return (((pitchClass % SEGMENTS) + SEGMENTS) % SEGMENTS) * (TAU / SEGMENTS)
}

/** Which segment an angle falls in. Offset by half a segment so the boundaries sit between
 *  segments rather than through their middles. */
export function pitchClassAtAngle(radians: number): number {
  const shifted = radians + TAU / SEGMENTS / 2
  const normalised = ((shifted % TAU) + TAU) % TAU
  return Math.floor(normalised / (TAU / SEGMENTS)) % SEGMENTS
}

/**
 * The angle of a point relative to the ring's centre, measured clockwise from straight up.
 *
 * Screen coordinates put y downwards, so "up" is negative y — which is why this is
 * `atan2(dx, -dy)` rather than the usual `atan2(dy, dx)`. Getting that wrong produces a ring
 * that rotates backwards and starts at three o'clock, which looks like two separate bugs.
 */
export function angleAtPoint(x: number, y: number, cx: number, cy: number): number {
  const angle = Math.atan2(x - cx, cy - y)
  return ((angle % TAU) + TAU) % TAU
}

/** Distance from the centre, for rejecting points outside the ring. */
export function radiusAtPoint(x: number, y: number, cx: number, cy: number): number {
  return Math.hypot(x - cx, y - cy)
}

export interface Segment {
  pitchClass: number
  /** Path data for the segment's wedge. */
  path: string
  /** Where a label sits. */
  labelX: number
  labelY: number
}

function pointOn(cx: number, cy: number, radius: number, angle: number): [number, number] {
  return [cx + radius * Math.sin(angle), cy - radius * Math.cos(angle)]
}

/**
 * A wedge of the ring, as an SVG path.
 *
 * Drawn with a small gap on each side so the segments read as twelve separate things rather
 * than as one striped disc.
 */
export function segmentPath(
  cx: number,
  cy: number,
  inner: number,
  outer: number,
  pitchClass: number,
  gap = 0.03,
): string {
  const half = TAU / SEGMENTS / 2 - gap
  const centre = angleOf(pitchClass)
  const from = centre - half
  const to = centre + half

  const [ox1, oy1] = pointOn(cx, cy, outer, from)
  const [ox2, oy2] = pointOn(cx, cy, outer, to)
  const [ix2, iy2] = pointOn(cx, cy, inner, to)
  const [ix1, iy1] = pointOn(cx, cy, inner, from)

  // Always the short way round: a segment is a twelfth of a circle, so the large-arc flag is
  // never set. Hardcoding 0 rather than computing it removes a whole class of inside-out arc.
  return [
    `M ${ox1.toFixed(2)} ${oy1.toFixed(2)}`,
    `A ${outer} ${outer} 0 0 1 ${ox2.toFixed(2)} ${oy2.toFixed(2)}`,
    `L ${ix2.toFixed(2)} ${iy2.toFixed(2)}`,
    `A ${inner} ${inner} 0 0 0 ${ix1.toFixed(2)} ${iy1.toFixed(2)}`,
    'Z',
  ].join(' ')
}

export function layoutRing(
  cx: number,
  cy: number,
  inner: number,
  outer: number,
): Segment[] {
  const labelRadius = (inner + outer) / 2
  return Array.from({ length: SEGMENTS }, (_, pitchClass) => {
    const [labelX, labelY] = pointOn(cx, cy, labelRadius, angleOf(pitchClass))
    return {
      pitchClass,
      path: segmentPath(cx, cy, inner, outer, pitchClass),
      labelX,
      labelY,
    }
  })
}

/**
 * Rotate a set of pitch classes by a number of semitones.
 *
 * This is the modes lesson as arithmetic: the SET never changes size and never changes shape,
 * only where it sits on the ring. Dragging the home marker is the other half — same notes,
 * new home — and keeping them as two separate operations is what lets the lesson show that
 * they are different things.
 */
export function rotateSet(pitchClasses: Iterable<number>, semitones: number): Set<number> {
  const rotated = new Set<number>()
  for (const value of pitchClasses) {
    rotated.add((((value + semitones) % SEGMENTS) + SEGMENTS) % SEGMENTS)
  }
  return rotated
}

/** The shortest signed distance between two pitch classes, -6..6. What a drag needs to know
 *  to decide which way round the ring it went. */
export function shortestStep(from: number, to: number): number {
  const raw = (((to - from) % SEGMENTS) + SEGMENTS) % SEGMENTS
  return raw > SEGMENTS / 2 ? raw - SEGMENTS : raw
}
