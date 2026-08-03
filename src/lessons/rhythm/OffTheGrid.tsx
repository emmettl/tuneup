import { useState } from 'react'
import { Aside, Caption, Check, Control, Controls, Headline, Lesson, Say, Try } from '../../ui/lesson/index.js'
import StepGrid from '../../widgets/StepGrid.tsx'
import { GROOVES } from '../../audio/grooves.js'

export default function OffTheGrid() {
  const [swing, setSwing] = useState(0)

  return (
    <Lesson>
      <Headline>Off the grid</Headline>

      <Say>
        Everything so far has landed exactly on the grid. Real players do not — they push the
        in-between notes slightly late, and that lateness is most of what people mean by feel.
      </Say>

      <Try caption="Same pattern, same tempo. Only the notes between the beats move.">
        <StepGrid pattern={GROOVES.rock.pattern} bpm={96} swing={swing} editable={false} />
        <Controls>
          <Control toggle active={swing === 0} onPress={() => setSwing(0)}>
            Straight
          </Control>
          <Control toggle active={swing === 0.33} onPress={() => setSwing(0.33)}>
            A little late
          </Control>
          <Control toggle active={swing === 0.66} onPress={() => setSwing(0.66)}>
            Full shuffle
          </Control>
        </Controls>
      </Try>

      <Caption>
        {swing === 0
          ? 'Dead straight. Every note exactly where the grid says.'
          : swing === 0.33
            ? 'Barely moved, and it already sounds less like a machine.'
            : 'The off-beats have landed on triplets. This is the shuffle the blues is built on.'}
      </Caption>

      <Say>
        Notice the on-beats never move. Swing only delays what falls between them — which is
        why a shuffled pattern still lines up with everything else in the band.
      </Say>

      <Check
        id="what-swings"
        ask="Which notes does swing move?"
        options={['Only the ones between the beats', 'All of them, equally', 'Only the first note of each bar']}
        answer={0}
        explain="The beats stay put and the off-beats arrive late. If everything moved, nothing would have changed — it would just be a slower tempo."
      />

      <Aside title="Swing, shuffle, and triplets">
        <p>
          At around two-thirds, the off-beat lands exactly on the second of three even
          subdivisions of the beat — a triplet. That is the classic shuffle, and it is why
          shuffled music is often written in twelve-eight rather than as swung eighths.
        </p>
        <p>
          Below that you get the various degrees of pushed-but-not-quite-triplet feel that most
          hip-hop and a lot of jazz live in. It is a continuous dial, not three settings.
        </p>
      </Aside>
    </Lesson>
  )
}
