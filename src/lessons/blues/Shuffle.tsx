import { useState } from 'react'
import { Aside, Caption, Check, Control, Controls, Headline, Lesson, Say, Try } from '../../ui/lesson/index.js'
import ChordPlayer from '../../widgets/ChordPlayer.tsx'
import StepGrid from '../../widgets/StepGrid.tsx'
import { GROOVES } from '../../audio/grooves.js'
import { key, twelveBar } from '../../theory/index.js'

export default function Shuffle() {
  const [swing, setSwing] = useState(0.66)

  return (
    <Lesson>
      <Headline>Shuffle</Headline>

      <Say>
        The twelve-bar form and the blue note give you the notes. The shuffle gives you the
        other half, and it is entirely about where the off-beats land.
      </Say>

      <Try caption="The same drum pattern at three swing amounts.">
        <StepGrid pattern={GROOVES.shuffle.pattern} bpm={88} swing={swing} editable={false} />
        <Controls>
          <Control toggle active={swing === 0} onPress={() => setSwing(0)}>
            Straight
          </Control>
          <Control toggle active={swing === 0.4} onPress={() => setSwing(0.4)}>
            Halfway
          </Control>
          <Control toggle active={swing === 0.66} onPress={() => setSwing(0.66)}>
            Full shuffle
          </Control>
        </Controls>
      </Try>

      <Caption>
        {swing === 0
          ? 'Straight, and it has stopped being a blues — this is a rock beat with blues chords over it.'
          : swing === 0.4
            ? 'Somewhere in between. Plenty of real playing lives here rather than at either extreme.'
            : 'The off-beats have landed on triplets. That long-short limp is the shuffle.'}
      </Caption>

      <Try caption="Now the whole thing. Twelve bars, dominant sevenths, and the shuffle underneath.">
        <ChordPlayer musicKey={key('E')} bars={twelveBar('turnaround')} bpm={88} drums />
      </Try>

      <Say>
        At full shuffle each beat is divided into <strong>three</strong> rather than two, and
        the middle one is left out. Long, short, long, short — which is why shuffled music is
        often written in twelve-eight rather than as swung eighths.
      </Say>

      <Check
        id="shuffle-division"
        ask="What is a beat divided into when you shuffle?"
        options={['Three, with the middle one left out', 'Two equal halves', 'Four, played faster']}
        answer={0}
        explain="Three even parts, and you play the first and third. That is why the gap alternates long-short instead of staying even, and why it cannot be written as ordinary eighth notes."
      />

      <Aside title="Is swing a dial or a setting?">
        <p>
          A dial. Two-thirds is the textbook shuffle where the off-beat lands exactly on a
          triplet, but a great deal of real playing sits between straight and that — jazz
          drummers vary it within a single piece, and it tends to straighten out as tempo rises
          because there is no longer time for the lopsidedness.
        </p>
        <p>
          It is one of the clearest cases where a number in a piece of software is an
          approximation of something a player does by feel and never thinks about numerically.
        </p>
      </Aside>
    </Lesson>
  )
}
