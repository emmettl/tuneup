import { useState } from 'react'
import { Aside, Caption, Check, Control, Controls, Headline, Lesson, Say, Try } from '../../ui/lesson/index.js'
import StepGrid from '../../widgets/StepGrid.tsx'
import { laneFrom } from '../../widgets/step-grid.js'

const DIVISIONS = [
  { every: 4, label: 'Quarter notes', note: 'One hit per beat. This is the pulse itself.' },
  { every: 2, label: 'Eighth notes', note: 'Two per beat. Twice as busy, same tempo — the beat has not moved.' },
  { every: 1, label: 'Sixteenth notes', note: 'Four per beat. Still the same tempo; there is just more happening between the beats.' },
]

export default function SplittingTheBeat() {
  const [which, setWhich] = useState(0)
  const division = DIVISIONS[which]!
  const steps = Array.from({ length: 16 }, (_, i) => i).filter((i) => i % division.every === 0)

  return (
    <Lesson>
      <Headline>Splitting the beat</Headline>

      <Say>
        The pulse is a grid, and you can put hits anywhere on it — but the useful positions are
        the even divisions. One per beat, two, or four. The tempo never changes; only how
        finely you are chopping it up.
      </Say>

      <Try caption="The kick stays on the beat throughout. Only the hat divides.">
        <StepGrid
          pattern={[
            laneFrom('kick', 'Kick', 16, [0, 4, 8, 12]),
            laneFrom('hat', 'Hi-hat', 16, steps, Object.fromEntries(steps.map((s) => [s, s % 4 === 0 ? 0.8 : 0.45]))),
          ]}
          bpm={96}
          editable={false}
        />
        <Controls>
          {DIVISIONS.map((entry, index) => (
            <Control key={entry.label} toggle active={index === which} onPress={() => setWhich(index)}>
              {entry.label}
            </Control>
          ))}
        </Controls>
      </Try>

      <Caption>{division.note}</Caption>

      <Say>
        This is the difference between a track that feels calm and one that feels urgent, and
        it is available without touching the tempo at all. Most of what people hear as
        &ldquo;faster&rdquo; is actually finer subdivision.
      </Say>

      <Check
        id="subdivision-tempo"
        ask="Going from eighths to sixteenths makes the music…"
        options={[
          'Busier, at exactly the same tempo',
          'Twice as fast',
          'Twice as loud',
        ]}
        answer={0}
        explain="The beat is in the same place — the kick never moved. There are simply twice as many hats between the beats, and the ear reads density as energy rather than as speed."
      />

      <Aside title="Why powers of two?">
        <p>
          Because that is what the notation is built on, and because halving is the division
          the ear tracks most easily. A beat split in two gives two equal halves you can count
          without effort; split into five, you have to think about it.
        </p>
        <p>
          Threes are the important exception, and they are common enough to have their own
          feel — a beat divided into three is what makes a shuffle, which is the next lesson.
        </p>
      </Aside>
    </Lesson>
  )
}
