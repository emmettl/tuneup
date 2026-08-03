import { useState } from 'react'
import { Aside, Caption, Check, Control, Controls, Headline, Lesson, Say, Try } from '../../ui/lesson/index.js'
import StepGrid from '../../widgets/StepGrid.tsx'
import Fretboard from '../../widgets/Fretboard.tsx'
import { player } from '../../audio/index.js'
import { key, midiOf, note } from '../../theory/index.js'
import { laneFrom } from '../../widgets/step-grid.js'

// An original boogie figure — root, fifth, sixth, fifth — which is public-domain idiom rather
// than any particular recording. The lesson deliberately alters ONE step so the learner hears
// how little it takes to change a riff's character.
const ROOT = midiOf(note('E2'))
const SHAPES = {
  boogie: { steps: [0, 7, 9, 7, 0, 7, 9, 7], label: 'Root, fifth, sixth, fifth', note: 'The boogie shape. Older than rock and still everywhere in it.' },
  flat7: { steps: [0, 7, 10, 7, 0, 7, 10, 7], label: 'Sixth becomes a flat seventh', note: 'One note moved up a semitone, and it has gone from swing to hard rock.' },
  fifths: { steps: [0, 7, 0, 7, 0, 7, 0, 7], label: 'Just root and fifth', note: 'Nothing but the power chord, pumping. Now the drums carry all of it.' },
} as const

type Shape = keyof typeof SHAPES

export default function TheRiff() {
  const [shape, setShape] = useState<Shape>('boogie')
  const chosen = SHAPES[shape]

  const play = () => {
    const origin = player().now()
    const step = 60 / 116 / 2
    chosen.steps.forEach((semitones, index) => {
      player().play(ROOT + semitones, {
        at: origin + index * step,
        duration: step * 0.9,
        instrument: 'guitar',
      })
    })
  }

  return (
    <Lesson>
      <Headline>The riff</Headline>

      <Say>
        A riff is not a chord progression. It is a short rhythmic figure repeated until it
        becomes the song — and most rock riffs use two or three notes, so what makes them
        distinctive is almost entirely rhythm and one choice of note.
      </Say>

      <Try caption="Play each, then change one note and hear the genre move.">
        <Controls>
          {(Object.keys(SHAPES) as Shape[]).map((id) => (
            <Control key={id} toggle active={shape === id} onPress={() => { setShape(id); }}>
              {SHAPES[id].label}
            </Control>
          ))}
          <Control onPress={play}>Play it</Control>
        </Controls>
        <Fretboard
          root={note('E')}
          scale={shape === 'flat7' ? 'mixolydian' : 'major-pentatonic'}
          musicKey={key('E')}
          frets={[0, 4]}
          labels="degree"
        />
      </Try>

      <Caption>{chosen.note}</Caption>

      <Try caption="Under a straight rock beat. The riff is the melody, the harmony and the hook at once.">
        <StepGrid
          pattern={[
            laneFrom('kick', 'Kick', 16, [0, 6, 8, 14]),
            laneFrom('snare', 'Snare', 16, [4, 12]),
            laneFrom('hat', 'Hi-hat', 16, [0, 2, 4, 6, 8, 10, 12, 14]),
          ]}
          bpm={116}
          editable={false}
        />
      </Try>

      <Say>
        Notice there is no chord anywhere. The riff implies the harmony by which notes it
        touches — and because it uses no third, it stays as ambiguous as the power chord from
        the last lesson.
      </Say>

      <Check
        id="riff-vs-progression"
        ask="What distinguishes a riff from a chord progression?"
        options={[
          'A riff is a rhythmic figure repeated as the song itself',
          'A riff is always played on guitar',
          'A riff has no repeated notes',
        ]}
        answer={0}
        explain="A progression is a background for something else to happen over. A riff IS the thing — it carries the rhythm, the harmony and the hook at once, which is why so much rock has no separate melody underneath."
      />

      <Aside title="Why does the flat seventh change so much?">
        <p>
          The sixth belongs to the major scale, so the boogie shape sits comfortably inside an
          ordinary key and sounds like swing. Flatten it to a seventh and the figure is now in
          Mixolydian — the borrowed-chord mode from earlier — which has no leading note and no
          pull home.
        </p>
        <p>
          A figure that does not pull home can repeat indefinitely without demanding
          resolution. That is precisely what a riff needs to do.
        </p>
      </Aside>
    </Lesson>
  )
}
