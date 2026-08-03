import { useState } from 'react'
import { Aside, Check, Control, Controls, Headline, Lesson, Say, Try } from '../../ui/lesson/index.js'
import Keyboard from '../../widgets/Keyboard.tsx'
import { player } from '../../audio/index.js'
import { frequency } from '../../theory/index.js'

const LOW = 60

export default function TheSameNoteBigger() {
  const [shown, setShown] = useState<'unison' | 'octave' | null>(null)

  const both = (interval: number, label: 'unison' | 'octave') => {
    setShown(label)
    player().chord([LOW, LOW + interval], { duration: 2.2, strum: 0 })
  }

  return (
    <Lesson>
      <Headline>The same note, bigger</Headline>

      <Say>
        Play a C, then the next C up. Different heights, and yet somehow the same note — every
        musical system ever invented has treated them as the same, and given them one name.
      </Say>

      <Try caption="Both Cs are amber. Play one, then the other.">
        <Keyboard range={[60, 84]} highlight={[{ pitchClass: 0, tone: 'root' }]} labels="note" keys />
      </Try>

      <Say>
        The reason is arithmetic. The higher C vibrates exactly twice as fast as the lower one
        — <span className="mono">{Math.round(frequency(LOW))} Hz</span> and{' '}
        <span className="mono">{Math.round(frequency(LOW + 12))} Hz</span>. Nothing else in
        music is that simple a ratio, and nothing else fuses like this.
      </Say>

      <Try caption="Two notes at once. The first pair beats and clashes; the second locks together.">
        <Controls>
          <Control toggle active={shown === 'unison'} onPress={() => both(1, 'unison')}>
            A semitone apart
          </Control>
          <Control toggle active={shown === 'octave'} onPress={() => both(12, 'octave')}>
            An octave apart
          </Control>
        </Controls>
      </Try>

      <Check
        id="octave-ratio"
        ask="A note an octave higher vibrates…"
        options={['Twice as fast', 'Twelve times as fast', 'A little bit faster']}
        answer={0}
        explain="Exactly double, every time. That doubling is why the note names run out after twelve and start again — you have arrived back where you began, one storey up."
      />

      <Aside title="Why does doubling sound like the same note?">
        <p>
          Almost every instrument produces a fundamental frequency plus a stack of quieter
          multiples of it. Double the fundamental and the new stack is a subset of the old one
          — nothing new arrives, so the ear hears reinforcement rather than a second note.
        </p>
        <p>
          It is the one interval that is essentially universal across musical cultures, which
          is a decent hint that it is a fact about hearing rather than a matter of taste.
        </p>
      </Aside>
    </Lesson>
  )
}
