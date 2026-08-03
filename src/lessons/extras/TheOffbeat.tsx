import { useState } from 'react'
import { Aside, Caption, Check, Control, Controls, Headline, Lesson, Say, Try } from '../../ui/lesson/index.js'
import StepGrid from '../../widgets/StepGrid.tsx'
import { laneFrom } from '../../widgets/step-grid.js'

const PLACEMENTS = [
  { on: [0, 4, 8, 12], label: 'On the beat', note: 'Chords on the beat, with the drums. Solid, and completely square.' },
  { on: [2, 6, 10, 14], label: 'Off the beat', note: 'The same chords, moved half a beat. That is the skank — and it is the entire genre.' },
]

export default function TheOffbeat() {
  const [which, setWhich] = useState(0)
  const placement = PLACEMENTS[which]!

  return (
    <Lesson>
      <Headline>The offbeat</Headline>

      <Say>
        Reggae and ska are built on one placement decision. Everything else — the chords, the
        tempo, the instruments — can stay exactly where it is.
      </Say>

      <Try caption="Same chords, same drums. Only where the chord lands changes.">
        <StepGrid
          pattern={[
            laneFrom('kick', 'Kick', 16, [4, 12]),
            laneFrom('rim', 'Chord stab', 16, placement.on),
            laneFrom('hat', 'Hi-hat', 16, [0, 4, 8, 12], { 0: 0.4, 4: 0.4, 8: 0.4, 12: 0.4 }),
          ]}
          bpm={78}
          editable={false}
        />
        <Controls>
          {PLACEMENTS.map((entry, index) => (
            <Control key={entry.label} toggle active={index === which} onPress={() => setWhich(index)}>
              {entry.label}
            </Control>
          ))}
        </Controls>
      </Try>

      <Caption>{placement.note}</Caption>

      <Say>
        Note the kick, too: it is on beats two and four rather than one and three, so even the
        foundation is displaced. The result is music where almost nothing lands where you brace
        for it, and the space between the hits does the work.
      </Say>

      <Check
        id="what-makes-skank"
        ask="What makes a reggae skank a skank?"
        options={[
          'The chord lands between the beats rather than on them',
          'The chords are played very quietly',
          'The tempo is much slower',
        ]}
        answer={0}
        explain="Half a beat later, and nothing else changed. Placement alone is enough to relocate a piece of music into an entirely different genre."
      />

      <Aside title="Why does displacement feel so different?">
        <p>
          Because the beat is still there in your head whether or not anything plays on it. An
          offbeat chord is heard <em>against</em> a pulse you are supplying yourself, and that
          tension between what you expect and what arrives is what makes it feel buoyant rather
          than merely late.
        </p>
        <p>
          It also explains why it falls apart if the drums stop: remove the reference and the
          offbeat simply becomes the beat, and the whole effect evaporates.
        </p>
      </Aside>
    </Lesson>
  )
}
