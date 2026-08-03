import { useState } from 'react'
import { Aside, Caption, Check, Control, Controls, Headline, Lesson, Say, Try } from '../../ui/lesson/index.js'
import StepGrid from '../../widgets/StepGrid.tsx'
import { laneFrom, type Pattern } from '../../widgets/step-grid.js'

const LAYERS: { id: string; label: string; lane: () => Pattern[number] }[] = [
  { id: 'kick', label: 'Kick', lane: () => laneFrom('kick', 'Kick', 16, [0, 4, 8, 12]) },
  { id: 'clap', label: 'Clap', lane: () => laneFrom('clap', 'Clap', 16, [4, 12]) },
  { id: 'openhat', label: 'Open hat', lane: () => laneFrom('openhat', 'Open hat', 16, [2, 6, 10, 14]) },
  { id: 'hat', label: 'Sixteenth hats', lane: () => laneFrom('hat', 'Hi-hat', 16, [1, 3, 5, 7, 9, 11, 13, 15], { 1: 0.4, 5: 0.4, 9: 0.4, 13: 0.4 }) },
  { id: 'ride', label: 'Ride', lane: () => laneFrom('ride', 'Ride', 16, [0, 8], { 0: 0.5, 8: 0.5 }) },
]

export default function RepetitionIsTheStructure() {
  const [on, setOn] = useState<string[]>(['kick', 'clap'])
  const pattern = LAYERS.filter((l) => on.includes(l.id)).map((l) => l.lane())

  const toggle = (id: string) =>
    setOn((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]))

  return (
    <Lesson>
      <Headline>Repetition is the structure</Headline>

      <Say>
        A dance track is one or two bars, repeated for five minutes. What stops that being
        unbearable is that the layers change: something arrives every eight or sixteen bars,
        and something else leaves.
      </Say>

      <Try caption="Press play, then add and remove layers while it runs. That is arranging.">
        <StepGrid pattern={pattern} bpm={124} editable={false} />
        <Controls>
          {LAYERS.map((layer) => (
            <Control key={layer.id} toggle active={on.includes(layer.id)} onPress={() => toggle(layer.id)}>
              {layer.label}
            </Control>
          ))}
        </Controls>
      </Try>

      <Caption>
        {on.length} layer{on.length === 1 ? '' : 's'}. The pattern underneath never changed —
        only how much of it you can hear.
      </Caption>

      <Say>
        Nothing here is a new idea; it is the same idea revealed and withdrawn. In a genre
        where the harmony deliberately does not move, this is what carries the sense of a piece
        going somewhere.
      </Say>

      <Check
        id="what-arranges"
        ask="In a loop-based track, what usually creates the sense of movement?"
        options={[
          'Layers arriving and leaving',
          'The chords changing key',
          'The tempo gradually increasing',
        ]}
        answer={0}
        explain="The loop stays put and the arrangement moves. It is the same job harmony does in a pop song, handed to a different department."
      />

      <Aside title="Why does taking something away feel like an event?">
        <p>
          Because the ear adapts. After sixteen bars a layer stops being noticed and becomes
          part of the floor — so removing it is heard as a change even though nothing new
          arrived, and putting it back lands harder than it did the first time.
        </p>
        <p>
          That is the whole mechanism behind a drop: strip the track to almost nothing for
          eight bars and the return of a kick you had stopped hearing feels enormous. Nothing
          was added; your attention was simply reset.
        </p>
      </Aside>
    </Lesson>
  )
}
