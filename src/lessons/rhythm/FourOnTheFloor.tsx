import { useState } from 'react'
import { Aside, Caption, Check, Control, Controls, Headline, Lesson, Say, Try } from '../../ui/lesson/index.js'
import StepGrid from '../../widgets/StepGrid.tsx'
import { laneFrom, type Pattern } from '../../widgets/step-grid.js'

// Wow moment: a track appears.
//
// Five decisions, ninety seconds, and something you would plausibly hear in a club. Built one
// layer at a time so the learner hears each one arrive rather than being handed a finished
// beat — and with a "strip it back" direction so they can hear the construction unwind.

const LAYERS: { label: string; lane: () => Pattern[number]; note: string }[] = [
  {
    label: 'Kick on every beat',
    lane: () => laneFrom('kick', 'Kick', 16, [0, 4, 8, 12]),
    note: 'On its own this is a metronome. Four beats, evenly spaced, no character at all.',
  },
  {
    label: 'Open hat between them',
    lane: () => laneFrom('openhat', 'Open hat', 16, [2, 6, 10, 14]),
    note: 'The hats land in the gaps, so the bar starts to swing between two things instead of just ticking.',
  },
  {
    label: 'Clap on two and four',
    lane: () => laneFrom('clap', 'Clap', 16, [4, 12]),
    note: 'Now the bar has a shape: two heavy points to lean on, and the rest pushes between them.',
  },
  {
    label: 'Sixteenths on the closed hat',
    lane: () => laneFrom('hat', 'Hi-hat', 16, [1, 3, 5, 7, 9, 11, 13, 15], { 1: 0.4, 5: 0.4, 9: 0.4, 13: 0.4 }),
    note: 'Detail between the beats. Nothing structural — it just stops the gaps being empty.',
  },
]

export default function FourOnTheFloor() {
  const [layers, setLayers] = useState(1)
  const pattern = LAYERS.slice(0, layers).map((entry) => entry.lane())

  return (
    <Lesson>
      <Headline>Four on the floor</Headline>

      <Say>
        Almost all dance music is built the same way: put a kick on every beat, then add things
        between the kicks. Add one layer at a time and listen to what each one does.
      </Say>

      <Try caption="Press play, then add layers while it runs.">
        <StepGrid pattern={pattern} bpm={124} editable={false} />
        <Controls>
          <Control onPress={() => setLayers((n) => Math.max(1, n - 1))}>Strip one back</Control>
          <Control
            toggle
            active={layers === LAYERS.length}
            onPress={() => setLayers((n) => Math.min(LAYERS.length, n + 1))}
          >
            {layers < LAYERS.length ? `Add: ${LAYERS[layers]!.label}` : 'All four layers'}
          </Control>
        </Controls>
      </Try>

      <Caption>{LAYERS[layers - 1]!.note}</Caption>

      <Say>
        Four decisions. Nothing here is a chord or a scale — this is entirely about where in
        the bar things land, and it is already recognisably a genre.
      </Say>

      <Check
        id="what-makes-it-dance"
        ask="What makes four-on-the-floor feel like dance music?"
        options={[
          'A kick on every single beat, with everything else between them',
          'A very fast tempo',
          'The particular drum sounds used',
        ]}
        answer={0}
        explain="The evenness is the point: a kick on all four beats gives a listener something completely unambiguous to move to, and every other layer is placed against it."
      />

      <Aside title="Why the offbeat hats?">
        <p>
          A kick on every beat is maximally stable and, alone, monotonous. Putting the open hat
          exactly between the kicks gives the ear a second thing to track, half a beat out of
          phase — so the bar reads as an alternation rather than a pulse.
        </p>
        <p>
          Take the hats away and it becomes a march. It really is that one placement.
        </p>
      </Aside>
    </Lesson>
  )
}
