import { useState } from 'react'
import { Aside, Caption, Check, Control, Controls, Headline, Lesson, Say, Try } from '../../ui/lesson/index.js'
import PitchClock from '../../widgets/PitchClock.tsx'
import { player } from '../../audio/index.js'
import { key, midiOf, note, scalePitches } from '../../theory/index.js'

const ROOT = midiOf(note('C4'))
const MOTIF = [0, 3, 4, 2]

export default function TheSoundOfWonder() {
  const [lydian, setLydian] = useState(true)
  const scale = lydian ? ('lydian' as const) : ('major' as const)

  const play = () => {
    const pitches = scalePitches(ROOT, scale, 2)
    const origin = player().now()
    // A held low root, so what changes is the SCALE against a fixed reference rather than the
    // whole thing shifting. One note differs between these two, and it is easy to miss without
    // something steady underneath.
    player().play(ROOT - 24, { at: origin, duration: 3.2, instrument: 'pad' })
    MOTIF.forEach((degree, index) => {
      player().play(pitches[degree]!, { at: origin + index * 0.42, duration: 0.6, instrument: 'rhodes' })
      player().play(pitches[degree + 4]!, { at: origin + index * 0.42, duration: 0.6, instrument: 'rhodes' })
    })
  }

  return (
    <Lesson>
      <Headline>The sound of wonder</Headline>

      <Say>
        Film and game music has a sound for awe, and it is one note. Raise the fourth degree of
        a major scale and you get <strong>Lydian</strong> — brighter than major, and floating in
        a way major never quite manages.
      </Say>

      <Try caption="The same short figure, over the same held bass. One note differs between them.">
        <PitchClock scale={{ key: key('C'), id: scale }} rotatable={false} labels="degree" />
        <Controls>
          <Control toggle active={!lydian} onPress={() => setLydian(false)}>
            Major
          </Control>
          <Control toggle active={lydian} onPress={() => setLydian(true)}>
            Lydian
          </Control>
          <Control onPress={play}>Play the figure</Control>
        </Controls>
      </Try>

      <Caption>
        {lydian
          ? 'The fourth is raised. Nothing pulls downwards any more, and the whole thing lifts.'
          : 'Ordinary major. Perfectly nice, and firmly on the ground.'}
      </Caption>

      <Say>
        In major, the fourth degree sits a semitone above the third and leans down onto it —
        a small, constant tug towards home. Raise it and that tug disappears. Nothing in the
        scale is pulling anywhere, which the ear reads as weightlessness.
      </Say>

      <Check
        id="lydian-note"
        ask="What is the difference between major and Lydian?"
        options={['The fourth degree is raised a semitone', 'The third is lowered', 'It has an extra note']}
        answer={0}
        explain="One note, raised by one semitone. It is the brightest of the seven modes for exactly that reason — it is the only one with a note higher than the major scale's."
      />

      <Aside title="Why does film music use modes so much?">
        <p>
          Because a score usually must not resolve. A scene has not finished, so the music
          cannot sound finished either — and the modes are precisely the scales with weakened
          or absent pull towards home.
        </p>
        <p>
          It is the same reasoning the electronica chapter reached from the other end: dance
          music avoids the V chord so a loop can run for six minutes, and a composer avoids
          resolution so a cue can run under dialogue without demanding attention. Different
          problem, same property of the harmony.
        </p>
      </Aside>
    </Lesson>
  )
}
