import { useState } from 'react'
import { Aside, Caption, Check, Control, Controls, Headline, Lesson, Say, Try } from '../../ui/lesson/index.js'
import ChordPlayer from '../../widgets/ChordPlayer.tsx'
import { key } from '../../theory/index.js'

// Wow moment: the door closes, or it doesn't.
//
// This lesson only works if the loop NEVER STOPS. The learner has to hear one ending, then
// the next, against a reference that is still playing — swapping while it runs, quantised to
// the bar. Stop and restart between endings and they are comparing an ending to a memory of
// an ending, which is a completely different and much harder task.
//
// That requirement is why the transport commits queued changes at a bar boundary, and why
// ChordPlayer reads its bars through a ref rather than a closure.

const ENDINGS = [
  { numeral: 'I', name: 'V–I', gloss: 'The door shuts. Nothing is left hanging.' },
  { numeral: 'vi', name: 'V–vi', gloss: 'Everything set up to land at home, and it lands somewhere sadder.' },
  { numeral: 'IV', name: 'IV–I', gloss: 'Home by the side door. Settles, but softly.' },
  { numeral: 'V', name: 'ending on V', gloss: 'Stops mid-sentence. The loop restarting sounds like a restart.' },
]

export default function LandingAndSwerving() {
  const [ending, setEnding] = useState(0)
  const chosen = ENDINGS[ending]!
  const bars = ending === 2 ? ['I', 'vi', 'IV', 'I'] : ['I', 'vi', 'IV', 'V', chosen.numeral]

  return (
    <Lesson>
      <Headline>Landing, and swerving</Headline>

      <Say>
        A progression is mostly about how it ends. Start this looping, then change the last
        chord while it plays — it swaps at the next bar, so you can hear one ending against
        the last one rather than against your memory of it.
      </Say>

      <Try caption="Press play first. Then swap endings without stopping.">
        <ChordPlayer musicKey={key('C')} bars={bars} bpm={92} drums />
        <Controls>
          {ENDINGS.map((option, index) => (
            <Control key={option.name} toggle active={index === ending} onPress={() => setEnding(index)}>
              {option.name}
            </Control>
          ))}
        </Controls>
      </Try>

      <Caption>{chosen.gloss}</Caption>

      <Say>
        These are <strong>cadences</strong> — the handful of ways a phrase can finish. The
        difference between them is not loudness or speed. It is entirely which chord arrives
        last, and how much the one before it was pointing at that chord.
      </Say>

      <Check
        id="most-final"
        ask="Which ending sounds most finished?"
        options={['V–I', 'V–vi', 'Ending on V']}
        answer={0}
        explain="V contains the note a semitone below home, and that note pulls hard. Landing on I resolves it; landing on vi resolves it somewhere unexpected; stopping on V leaves the pull unanswered."
      />

      <Aside title="Why does V pull towards I so strongly?">
        <p>
          In C, the V chord is G–B–D. That B is one semitone below the C, and a semitone is
          the tightest gap in the system — the ear treats it as leaning. The chord also
          contains an F if you add the seventh, and F leans down to E. Two notes leaning
          inwards on the same chord is a lot of pointing.
        </p>
        <p>
          The interrupted cadence works precisely because it exploits that. The setup is
          identical; the arrival is not, and the surprise is measured against how strongly you
          were expecting the other thing.
        </p>
      </Aside>
    </Lesson>
  )
}
