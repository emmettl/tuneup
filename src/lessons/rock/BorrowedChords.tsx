import { useState } from 'react'
import { Aside, Caption, Check, Control, Controls, Headline, Lesson, Say, Try } from '../../ui/lesson/index.js'
import ChordPlayer from '../../widgets/ChordPlayer.tsx'
import PitchClock from '../../widgets/PitchClock.tsx'
import { key } from '../../theory/index.js'

const A = key('A')

export default function BorrowedChords() {
  const [borrowed, setBorrowed] = useState(false)

  return (
    <Lesson>
      <Headline>Rock&apos;s favourite outsider</Headline>

      <Say>
        Chapter six said a key hands you seven chords and any order of them works. Rock spends
        most of its time proving that by reaching outside for one particular chord.
      </Say>

      <Try caption="Press play, then swap. Same drums, same key, one chord from outside it.">
        <ChordPlayer
          musicKey={A}
          bars={borrowed ? ['I', 'bVII', 'IV', 'I'] : ['I', 'V', 'vi', 'IV']}
          bpm={104}
          drums
        />
        <Controls>
          <Control toggle active={!borrowed} onPress={() => setBorrowed(false)}>
            Inside the key
          </Control>
          <Control toggle active={borrowed} onPress={() => setBorrowed(true)}>
            Borrow ♭VII
          </Control>
        </Controls>
      </Try>

      <Caption>
        {borrowed
          ? 'That G is not in A major — the key wants G sharp. Flattening it is the single most recognisable move in rock harmony.'
          : 'Four ordinary chords from the key. Pleasant, and slightly polite.'}
      </Caption>

      <Try caption="The borrowed note, on the ring. One segment lit that the scale did not ask for.">
        <PitchClock
          scale={{ key: A, id: borrowed ? 'mixolydian' : 'major' }}
          rotatable={false}
          labels="note"
        />
      </Try>

      <Say>
        Flatten the seventh of a major scale and you get <strong>Mixolydian</strong> — the mode
        from the last chapter. Rock did not borrow one chord so much as move into a mode that
        was there all along.
      </Say>

      <Check
        id="which-note-borrowed"
        ask="What is ♭VII in the key of A?"
        options={['G major — the seventh degree, lowered', 'G sharp major', 'B minor']}
        answer={0}
        explain="A major's seventh degree is G sharp, so ♭VII lowers it to G. Written as a flattened seventh rather than a raised sixth because it keeps the letter G, which is what makes it read as the seventh bent down."
      />

      <Aside title="Why does it sound less polite?">
        <p>
          The seventh degree of a major scale sits one semitone below home and leans hard on it
          — that pull is what makes a major key sound resolved. Flatten it and the lean
          disappears: the scale stops pointing home so insistently.
        </p>
        <p>
          Less pull means less resolution, and less resolution means a progression can circle
          indefinitely without needing to arrive. That is a very useful property if what you
          want is a riff that loops for four minutes.
        </p>
      </Aside>
    </Lesson>
  )
}
