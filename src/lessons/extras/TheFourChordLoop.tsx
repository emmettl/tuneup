import { useState } from 'react'
import { Aside, Caption, Check, Control, Controls, Headline, Lesson, Say, Try } from '../../ui/lesson/index.js'
import ChordPlayer from '../../widgets/ChordPlayer.tsx'
import { key } from '../../theory/index.js'

// Deliberately no song titles anywhere. The progression is genuinely the backbone of an
// enormous amount of pop, and naming tracks would promise a melody this app cannot play — see
// theory/progression.ts for the standing rule.
const ROTATIONS = [
  { bars: ['I', 'V', 'vi', 'IV'], label: 'Start on I', note: 'Bright and open. It sounds like a beginning.' },
  { bars: ['vi', 'IV', 'I', 'V'], label: 'Start on vi', note: 'The same four chords, and now it sounds wistful.' },
  { bars: ['IV', 'I', 'V', 'vi'], label: 'Start on IV', note: 'Suspended, as though you came in halfway through.' },
  { bars: ['V', 'vi', 'IV', 'I'], label: 'Start on V', note: 'Restless until the very last bar, then it lands.' },
]

export default function TheFourChordLoop() {
  const [which, setWhich] = useState(0)
  const rotation = ROTATIONS[which]!

  return (
    <Lesson>
      <Headline>The four-chord loop</Headline>

      <Say>
        Four chords underpin a great many pop choruses — <span className="mono">I–V–vi–IV</span>{' '}
        and its rotations. Not because writers are lazy, but because it does something specific:
        it never quite settles, so it can go round again without sounding finished.
      </Say>

      <Try caption="Press play, then start the same four chords in a different place.">
        <ChordPlayer musicKey={key('C')} bars={rotation.bars} bpm={96} drums />
        <Controls>
          {ROTATIONS.map((entry, index) => (
            <Control key={entry.label} toggle active={index === which} onPress={() => setWhich(index)}>
              {entry.label}
            </Control>
          ))}
        </Controls>
      </Try>

      <Caption>{rotation.note}</Caption>

      <Say>
        Identical chords, identical order — only the starting point moved, and the emotional
        colour changed completely. Which chord you begin on decides what the loop sounds like
        it is doing, because it decides what everything else is heard as departing from.
      </Say>

      <Check
        id="why-loop-works"
        ask="Why does this progression loop so comfortably?"
        options={[
          'It never lands firmly on I at the end, so it always wants to continue',
          'All four chords are major',
          'It only uses chords from one key',
        ]}
        answer={0}
        explain="Ending on IV leaves the ear expecting more, and the loop obliges. A progression that resolved properly every four bars would sound like four separate endings in a row."
      />

      <Aside title="Is it really the same progression each time?">
        <p>
          Arguably not. Once the loop is going, a listener hears whichever chord it starts on
          as home — so I–V–vi–IV and vi–IV–I–V are the same cycle heard in two different keys,
          one major and one minor, without a single note changing.
        </p>
        <p>
          That is the relative-minor idea from chapter four, arriving from a completely
          different direction: same notes, different home, different mood.
        </p>
      </Aside>
    </Lesson>
  )
}
