import { useState } from 'react'
import { Aside, Caption, Check, Control, Controls, Headline, Lesson, Say, Try } from '../../ui/lesson/index.js'
import PitchClock from '../../widgets/PitchClock.tsx'
import Keyboard from '../../widgets/Keyboard.tsx'
import { key, pitchClassSet } from '../../theory/index.js'

export default function TakeTwoAway() {
  const [pentatonic, setPentatonic] = useState(false)
  const c = key('C')
  const scaleId = pentatonic ? ('major-pentatonic' as const) : ('major' as const)

  // Derived rather than typed out: whichever two notes the major scale has that the
  // pentatonic does not. If either definition ever changed, this caption would follow.
  const major = [...pitchClassSet(c.tonic, 'major')]
  const five = pitchClassSet(c.tonic, 'major-pentatonic')
  const removed = major.filter((pc) => !five.has(pc))

  return (
    <Lesson>
      <Headline>Take two away</Headline>

      <Say>
        Seven notes give you a scale, but two of them are awkward — they sit a semitone from a
        neighbour, so they clash if you land on them at the wrong moment. Take those two out
        and you have five notes that cannot go wrong.
      </Say>

      <Try caption="Two segments go dark. That is the whole difference.">
        <PitchClock scale={{ key: c, id: scaleId }} labels="note" />
        <Controls>
          <Control toggle active={!pentatonic} onPress={() => setPentatonic(false)}>
            All seven
          </Control>
          <Control toggle active={pentatonic} onPress={() => setPentatonic(true)}>
            Take two away
          </Control>
        </Controls>
      </Try>

      <Caption>
        {pentatonic
          ? `The fourth and seventh degrees are gone. Five notes left, and no two of them are next-door neighbours.`
          : `The two that will go are the fourth and the seventh — ${removed.length} notes, both of them a semitone away from something.`}
      </Caption>

      <Say>
        Now play it. With seven notes you can hit something sour; with five you cannot. This is
        why the pentatonic is the first scale most people improvise with, and why it never
        really stops being useful.
      </Say>

      <Try caption="Mash the coloured keys in any order. There is genuinely no wrong note.">
        <Keyboard range={[60, 84]} scale={{ key: c, id: scaleId }} spellIn={c} labels="note" keys />
      </Try>

      <Check
        id="which-two-go"
        ask="Which notes does the major pentatonic leave out?"
        options={['The fourth and the seventh', 'The second and the sixth', 'The third and the fifth']}
        answer={0}
        explain="Both are a semitone from a neighbour — the fourth sits just above the third, and the seventh just below the octave. Removing them removes every semitone clash in the scale."
      />

      <Aside title="Why does removing semitones make it safe?">
        <p>
          Two notes a semitone apart, played together or in quick succession, produce the
          sharpest dissonance available in the system. A seven-note scale contains two such
          pairs; a pentatonic contains none, so no combination of its notes can produce that
          particular clash.
        </p>
        <p>
          That is also its limitation. The semitone is what makes a scale sound like it is
          leading somewhere, so pentatonic melodies float pleasantly and rarely sound like they
          have arrived. Most music wants both, at different moments.
        </p>
      </Aside>
    </Lesson>
  )
}
