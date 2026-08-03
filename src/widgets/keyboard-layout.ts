// Where the keys of a piano go, as pure arithmetic.
//
// Split out from the component because this is the half that can be wrong in ways a test can
// catch — and because hit-testing has to be a function, not a DOM lookup. A drag across the
// keyboard asks "which key is under this point" on every pointermove; `elementFromPoint` is
// both slower and wrong once anything is inside a CSS transform, which a responsive layout
// will eventually apply.
//
// The one thing worth stating out loud, because the obvious implementation gets it backwards:
// THE BLACK KEYS ARE DECIDED BY PITCH, NOT BY SCALE DEGREE. The two gaps — where B meets C and
// where E meets F — are the whole reason a keyboard is legible at a glance, and they are how
// anyone finds middle C without counting. Colour the keys by "degrees of the current scale"
// and those gaps move, and the result reads as broken to anyone who has ever seen a piano.

/** Semitones within an octave that are black keys. Two gaps, at 4→5 and 11→0. */
const BLACK_SEMITONES = new Set([1, 3, 6, 8, 10])

export function isBlackKey(midi: number): boolean {
  return BLACK_SEMITONES.has(((midi % 12) + 12) % 12)
}

export function isWhiteKey(midi: number): boolean {
  return !isBlackKey(midi)
}

export interface KeyBox {
  midi: number
  black: boolean
  /** Left edge, in the same units as the width passed in. */
  x: number
  width: number
  height: number
}

export interface LayoutOptions {
  /** Inclusive MIDI range. */
  from: number
  to: number
  /** Total width to fill. */
  width: number
  height: number
  /** Black key width as a fraction of a white key. */
  blackWidth?: number
  /** Black key height as a fraction of the full height. */
  blackHeight?: number
}

/** How many white keys the range contains. What the width has to be divided by. */
export function whiteKeyCount(from: number, to: number): number {
  let count = 0
  for (let midi = from; midi <= to; midi++) if (isWhiteKey(midi)) count++
  return count
}

/**
 * Lay the keys out left to right.
 *
 * White keys tile the full width; black keys straddle the boundary between the two white keys
 * they sit between, and are returned AFTER the white keys so that drawing the list in order
 * puts them on top without needing z-index.
 */
export function layoutKeys(options: LayoutOptions): KeyBox[] {
  const { from, to, width, height, blackWidth = 0.62, blackHeight = 0.63 } = options
  const whites = whiteKeyCount(from, to)
  if (whites === 0) return []

  const whiteWidth = width / whites
  const blackW = whiteWidth * blackWidth

  const whiteBoxes: KeyBox[] = []
  const blackBoxes: KeyBox[] = []
  let whiteIndex = 0

  for (let midi = from; midi <= to; midi++) {
    if (isWhiteKey(midi)) {
      whiteBoxes.push({ midi, black: false, x: whiteIndex * whiteWidth, width: whiteWidth, height })
      whiteIndex++
    } else {
      // Centred on the boundary the black key straddles, which is the left edge of the white
      // key that follows it — that is `whiteIndex` white keys in, since this one has not been
      // counted yet.
      blackBoxes.push({
        midi,
        black: true,
        x: whiteIndex * whiteWidth - blackW / 2,
        width: blackW,
        height: height * blackHeight,
      })
    }
  }

  return [...whiteBoxes, ...blackBoxes]
}

/**
 * Which key is at a point, or null.
 *
 * Black keys are tested first because they are drawn on top: a point in the overlap belongs
 * to the black key, which is what a finger on a real keyboard does too.
 */
export function keyAt(x: number, y: number, keys: readonly KeyBox[]): number | null {
  for (const key of keys) {
    if (!key.black) continue
    if (x >= key.x && x < key.x + key.width && y >= 0 && y < key.height) return key.midi
  }
  for (const key of keys) {
    if (key.black) continue
    if (x >= key.x && x < key.x + key.width && y >= 0 && y < key.height) return key.midi
  }
  return null
}

/**
 * Widen a range so it starts and ends on a white key.
 *
 * A keyboard beginning on a black key has that key hanging off the left edge with nothing
 * under it, which looks like a rendering bug rather than a choice.
 */
export function whiteBounded(from: number, to: number): [number, number] {
  let low = from
  let high = to
  while (isBlackKey(low)) low--
  while (isBlackKey(high)) high++
  return [low, high]
}

/**
 * The computer-keyboard mapping: home row is the white keys, the row above is the black ones.
 *
 * The layout every tracker and DAW has used for thirty years. It is offset from a C, so the
 * home row spells C major and the two gaps in the upper row fall where B meets C and E meets
 * F — exactly as they do on a piano. Getting that alignment right is what makes the mapping
 * learnable rather than arbitrary.
 */
export const QWERTY_OFFSETS: readonly { code: string; semitone: number }[] = [
  { code: 'KeyA', semitone: 0 }, // C
  { code: 'KeyW', semitone: 1 },
  { code: 'KeyS', semitone: 2 }, // D
  { code: 'KeyE', semitone: 3 },
  { code: 'KeyD', semitone: 4 }, // E
  // No black key between E and F. This gap is not a mistake.
  { code: 'KeyF', semitone: 5 }, // F
  { code: 'KeyT', semitone: 6 },
  { code: 'KeyG', semitone: 7 }, // G
  { code: 'KeyY', semitone: 8 },
  { code: 'KeyH', semitone: 9 }, // A
  { code: 'KeyU', semitone: 10 },
  { code: 'KeyJ', semitone: 11 }, // B
  // Nor between B and C.
  { code: 'KeyK', semitone: 12 }, // C, an octave up
  { code: 'KeyO', semitone: 13 },
  { code: 'KeyL', semitone: 14 }, // D
  { code: 'KeyP', semitone: 15 },
  { code: 'Semicolon', semitone: 16 }, // E
]

/** The note a physical key plays, given where the mapping starts. */
export function midiForCode(code: string, base: number): number | null {
  const entry = QWERTY_OFFSETS.find((candidate) => candidate.code === code)
  return entry ? base + entry.semitone : null
}

/** The letter printed on a key cap, for the labels. */
export function capForMidi(midi: number, base: number): string | null {
  const entry = QWERTY_OFFSETS.find((candidate) => candidate.semitone === midi - base)
  if (!entry) return null
  return entry.code.startsWith('Key') ? entry.code.slice(3).toLowerCase() : ';'
}
