import { useState } from 'react'
import { Aside, Caption, Check, Control, Controls, Headline, Lesson, Say, Try } from '../../ui/lesson/index.js'
import PitchClock from '../../widgets/PitchClock.tsx'
import { player } from '../../audio/index.js'
import {
  fifthsOf,
  keyFromFifths,
  keyName,
  midiOf,
  scalePitches,
  writableKeys,
} from '../../theory/index.js'

// Transposition: the same shape, started somewhere else.
//
// The motif is played in SCALE DEGREES rather than fixed pitches, so it genuinely transposes
// with the key rather than being a different tune in each one. That is the point being made,
// so faking it would undermine the lesson it exists to teach.
const MOTIF = [0, 4, 3, 2, 0]

export default function MoveTheShape() {
  const [fifths, setFifths] = useState(0)
  const musicKey = keyFromFifths(fifths, 'major')

  const playMotif = () => {
    const pitches = scalePitches(midiOf({ ...musicKey.tonic, octave: 4 }), 'major', 2)
    const origin = player().now()
    MOTIF.forEach((degree, index) => {
      player().play(pitches[degree]!, { at: origin + index * 0.3, duration: 0.28 })
    })
  }

  return (
    <Lesson>
      <Headline>Move the shape</Headline>

      <Say>
        The major scale is a pattern of gaps, so it can start anywhere. Drag the ring round and
        watch: the shape never changes, it just sits somewhere else.
      </Say>

      <Try caption="Drag the ring to rotate it. Every note moves together.">
        <PitchClock scale={{ key: musicKey, id: 'major' }} rotatable labels="note" />
      </Try>

      <Say>
        Starting somewhere else is called a <strong>key</strong>. Same tune, same shape,
        different height — which is exactly what someone means when they say a song is too
        high and they need it down a bit.
      </Say>

      <Try caption="A short phrase, written as scale degrees rather than notes. Change key and it moves intact.">
        <Controls>
          {writableKeys('major')
            .filter((k) => Math.abs(fifthsOf(k)) <= 4)
            .map((k) => (
              <Control
                key={keyName(k)}
                toggle
                active={keyName(k) === keyName(musicKey)}
                onPress={() => setFifths(fifthsOf(k))}
              >
                {keyName(k).replace(' major', '')}
              </Control>
            ))}
        </Controls>
        <Controls>
          <Control onPress={playMotif}>Play the phrase in {keyName(musicKey)}</Control>
        </Controls>
      </Try>

      <Caption>
        It is recognisably the same phrase in all nine, and not one note of it is the same.
      </Caption>

      <Check
        id="what-transposes"
        ask="What stays the same when you change key?"
        options={['The gaps between the notes', 'The actual notes', 'Nothing — it is a new tune']}
        answer={0}
        explain="Only the pattern of gaps. Every actual note changes, which is why a tune you know is still that tune when someone sings it lower."
      />

      <Aside title="Why do some keys have more sharps than others?">
        <p>
          The shape has to stay intact, and the twelve notes are not evenly spelled — so once
          you start somewhere other than C, some of the seven have to be raised or lowered to
          keep the gaps right. The further round the circle of fifths you go, the more of them
          need it. That count IS the key signature.
        </p>
      </Aside>
    </Lesson>
  )
}
