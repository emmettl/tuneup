import { useState } from 'react'
import { Aside, Caption, Check, Control, Controls, Headline, Lesson, Say, Try } from '../../ui/lesson/index.js'
import PitchClock from '../../widgets/PitchClock.tsx'
import { player } from '../../audio/index.js'
import {
  MODES_BY_BRIGHTNESS,
  SCALES,
  key,
  midiOf,
  note,
  scalePitches,
} from '../../theory/index.js'

// The modes, ordered by brightness rather than by which degree they start on.
//
// Each step down flattens exactly one more note than the last — asserted in scale.test.ts —
// which is what makes this a single continuous slider rather than seven presets in an
// arbitrary order.

const ROOT = midiOf(note('D4'))

export default function BrightToDark() {
  const [index, setIndex] = useState(1) // Ionian: the familiar one, one step from the top
  const mode = MODES_BY_BRIGHTNESS[index]!

  const hear = (next: number) => {
    setIndex(next)
    const id = MODES_BY_BRIGHTNESS[next]!
    // Held root underneath, so what changes is the SCALE against a fixed reference rather
    // than the whole thing moving. Without the drone every mode just sounds like a scale.
    player().play(ROOT - 12, { duration: 3.4, instrument: 'pad' })
    player().sequence(scalePitches(ROOT, id, 1), { noteSeconds: 0.28 })
  }

  return (
    <Lesson>
      <Headline>Bright to dark</Headline>

      <Say>
        The seven modes are not seven unrelated scales to memorise. Line them up properly and
        each one flattens exactly one more note than the last — a single slider from the
        brightest sound in the system to the darkest.
      </Say>

      <Try caption="All rooted on D, over a held D. Only the scale changes.">
        <PitchClock scale={{ key: key('D'), id: mode }} rotatable={false} labels="degree" />
        <Controls>
          {MODES_BY_BRIGHTNESS.map((id, position) => (
            <Control key={id} toggle active={position === index} onPress={() => hear(position)}>
              {SCALES[id].name}
            </Control>
          ))}
        </Controls>
      </Try>

      <Caption>{SCALES[mode].blurb}</Caption>

      <Say>
        Lydian is major with one note raised; Ionian is plain major; Mixolydian flattens the
        seventh; Dorian the third as well; Aeolian the sixth too. By Locrian even the fifth has
        gone, which is why it never settles — a scale with no stable fifth has no floor.
      </Say>

      <Check
        id="mode-order"
        ask="What changes between one mode and the next in this order?"
        options={[
          'Exactly one more note is flattened',
          'The root moves up a step',
          'The whole scale moves up a semitone',
        ]}
        answer={0}
        explain="One note at a time, in a fixed order. That is why this works as a slider — brightness is a single dimension, and the modes are the seven points along it."
      />

      <Aside title="Modes rooted on one note, or one scale started in seven places?">
        <p>
          Both, and they are the same fact seen from two directions. The previous lesson kept
          the notes fixed and moved home; this one keeps home fixed and changes the notes. The
          first shows WHY the modes exist; the second shows what each one actually sounds like,
          which is very hard to hear when the root keeps moving.
        </p>
        <p>
          Working musicians almost always think the second way — &ldquo;D Dorian&rdquo; means a
          sound rooted on D, not a detour through C major.
        </p>
      </Aside>
    </Lesson>
  )
}
