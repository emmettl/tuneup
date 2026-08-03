import { useState } from 'react'
import { Aside, Caption, Check, Control, Controls, Headline, Lesson, Say, Try } from '../../ui/lesson/index.js'
import Fretboard from '../../widgets/Fretboard.tsx'
import { TUNINGS, rootFret } from '../../theory/fretboard.js'
import { key, note } from '../../theory/index.js'

const ROOTS = [
  { name: 'A', label: 'A minor' },
  { name: 'C', label: 'C minor' },
  { name: 'D', label: 'D minor' },
  { name: 'E', label: 'E minor' },
] as const

export default function TheShapeOnAGuitar() {
  const [which, setWhich] = useState(0)
  const root = note(ROOTS[which]!.name)
  const start = rootFret(TUNINGS.guitar, root)

  return (
    <Lesson>
      <Headline>The shape on a guitar</Headline>

      <Say>
        On a keyboard, changing key changes which keys you press — the pattern moves and
        reshapes. On a neck it does not. The scale is a <strong>shape</strong>, and changing
        key just means sliding it.
      </Say>

      <Try caption="The minor pentatonic box. Amber dots are the root. Tap any dot to hear it.">
        <Fretboard
          root={root}
          scale="minor-pentatonic"
          musicKey={key(`${ROOTS[which]!.name} minor`)}
          frets={[start, start + 3]}
          labels="degree"
        />
        <Controls>
          {ROOTS.map((entry, index) => (
            <Control key={entry.name} toggle active={index === which} onPress={() => setWhich(index)}>
              {entry.label}
            </Control>
          ))}
        </Controls>
      </Try>

      <Caption>
        {ROOTS[which]!.label}, starting at fret {start}. Identical fingering to the last one —
        the dots are in exactly the same places relative to each other.
      </Caption>

      <Say>
        Two dots on every string, the same relationship every time. This is why a guitarist can
        play in a key they have never thought about: they are not transposing anything, they
        are moving their hand.
      </Say>

      <Check
        id="why-shapes"
        ask="Why does changing key not change the shape on a guitar?"
        options={[
          'Every fret is one semitone, so moving up moves everything equally',
          'Guitars are tuned differently for each key',
          'The shape only works in minor keys',
        ]}
        answer={0}
        explain="A fret is a semitone, on every string. Slide a shape up two frets and every note in it rises by a tone, so the intervals — which are what a scale actually is — are untouched."
      />

      <Aside title="Then why is the guitar hard?">
        <p>
          Because of one irregularity. Five of the six string pairs are a fourth apart and one
          — the third to the second — is a major third, so any shape crossing that boundary
          bends by a fret. Every guitar shape has that kink in it, and it is why the same
          pattern looks slightly different depending on which strings it lands on.
        </p>
        <p>
          The tuning is a compromise: perfectly regular fourths would make chords far harder to
          reach, and this arrangement trades a little scale awkwardness for a lot of chord
          convenience.
        </p>
      </Aside>
    </Lesson>
  )
}
