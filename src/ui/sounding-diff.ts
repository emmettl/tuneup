/**
 * Which keys need their highlight turned on and off since the last frame.
 *
 * Split out from `useSoundingDom` because it is the half that can be wrong, and the half a
 * test can reach: the hook itself only runs inside a requestAnimationFrame loop, which is
 * paused whenever the tab is hidden — so there is no way to drive it from outside.
 *
 * A diff rather than "clear everything and re-stamp": the sounding set changes several times
 * a bar while eighty-odd keys do not, and touching only what moved is the difference between
 * two attribute writes a frame and a hundred and sixty.
 */
export function soundingDiff(
  active: ReadonlySet<number>,
  lit: ReadonlySet<number>,
): { add: number[]; remove: number[] } {
  const add: number[] = []
  const remove: number[] = []
  for (const midi of lit) if (!active.has(midi)) remove.push(midi)
  for (const midi of active) if (!lit.has(midi)) add.push(midi)
  return { add, remove }
}
