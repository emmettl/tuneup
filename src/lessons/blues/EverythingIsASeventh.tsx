import { useState } from 'react'
import { Aside, Caption, Check, Control, Controls, Headline, Lesson, Say, Try } from '../../ui/lesson/index.js'
import ChordPlayer from '../../widgets/ChordPlayer.tsx'
import { key, twelveBar } from '../../theory/index.js'

// The blues breaks the rule chapter six spent a whole lesson establishing, and the lesson is
// built so the learner hears the rule and the breach back to back rather than being told.

export default function EverythingIsASeventh() {
  const [sevenths, setSevenths] = useState(true)
  const bars = sevenths ? twelveBar('quick-change') : twelveBar('quick-change').map((n) => n.replace('7', ''))

  return (
    <Lesson>
      <Headline>Everything is a seventh</Headline>

      <Say>
        Chapter six said a key contains exactly one dominant seventh, and that its job is to
        pull you home. The blues makes <em>every</em> chord a dominant seventh — which by those
        rules should be chaos.
      </Say>

      <Try caption="Press play, then swap. Same twelve bars, same key, same groove.">
        <ChordPlayer musicKey={key('E')} bars={bars} bpm={88} drums />
        <Controls>
          <Control toggle active={!sevenths} onPress={() => setSevenths(false)}>
            Plain triads
          </Control>
          <Control toggle active={sevenths} onPress={() => setSevenths(true)}>
            All dominant sevenths
          </Control>
        </Controls>
      </Try>

      <Caption>
        {sevenths
          ? 'Every chord restless, none of them resolving. It does not sound wrong — it sounds like the blues.'
          : 'Correct by the rules, and oddly bland. This is a folk song, not a blues.'}
      </Caption>

      <Say>
        It works because nothing is trying to resolve. When every chord is equally unstable,
        none of them is a departure from anywhere — so the tension stops being a journey and
        becomes the texture. That is a different idea about what harmony is for.
      </Say>

      <Check
        id="why-not-chaos"
        ask="Why doesn't making every chord a dominant seventh sound wrong?"
        options={[
          'Nothing resolves, so the tension becomes the texture rather than a journey',
          'The sevenths are played too quietly to notice',
          'The blues scale cancels the tension out',
        ]}
        answer={0}
        explain="A dominant seventh is only restless relative to something settled. Make everything restless and there is nothing to be restless against — so it stops functioning as tension and starts functioning as colour."
      />

      <Aside title="Is the blues actually breaking the rules?">
        <p>
          It is following a different set. Common-practice harmony treats dissonance as
          something to prepare and resolve; the blues treats it as a permanent quality of the
          sound, closer to how a particular timbre is chosen than to how a chord progression is
          planned.
        </p>
        <p>
          Both are internally consistent, and the second one is where an enormous amount of
          twentieth-century music comes from. The rules in chapter six are worth knowing
          because most music does follow them — not because music that does not is wrong.
        </p>
      </Aside>
    </Lesson>
  )
}
