import { useState } from 'react'
import { Aside, Caption, Check, Control, Controls, Headline, Lesson, Say, Try } from '../../ui/lesson/index.js'
import ChordPlayer from '../../widgets/ChordPlayer.tsx'
import { key, progressionById } from '../../theory/index.js'

const SHAPES = [
  { id: 'house-pads', label: 'Deep house pads', inKey: 'A minor', note: 'Four rich minor chords held long. Nothing resolves; it just circles.' },
  { id: 'dorian-vamp', label: 'Dorian vamp', inKey: 'A minor', note: 'Two chords, forever. The raised sixth is what stops it sounding sad.' },
  { id: 'minor-loop', label: 'Driving minor loop', inKey: 'A minor', note: 'Three chords that never come home, which is exactly why it keeps moving.' },
] as const

export default function MinorModalAndFourChords() {
  const [which, setWhich] = useState(0)
  const shape = SHAPES[which]!
  const progression = progressionById(shape.id)!

  return (
    <Lesson>
      <Headline>Minor, modal, and only four chords</Headline>

      <Say>
        Dance music almost never uses the chord that pulls you home. It uses a small set of
        minor and modal chords that circle instead — because a track that resolves is a track
        that has ended, and these are meant to run for six minutes.
      </Say>

      <Try caption="All in A minor, all four bars or fewer. Press play and switch between them.">
        <ChordPlayer
          musicKey={key(shape.inKey)}
          bars={progression.numerals}
          bpm={122}
          drums
        />
        <Controls>
          {SHAPES.map((entry, index) => (
            <Control key={entry.id} toggle active={index === which} onPress={() => setWhich(index)}>
              {entry.label}
            </Control>
          ))}
        </Controls>
      </Try>

      <Caption>{shape.note}</Caption>

      <Say>
        Notice what is missing: there is no <span className="mono">V</span> anywhere. That is
        the chord that says &ldquo;and now we are home&rdquo;, and leaving it out is the whole
        trick. Nothing arrives, so nothing has to end.
      </Say>

      <Check
        id="why-no-five"
        ask="Why do these progressions avoid the V chord?"
        options={[
          'V resolves strongly, and a loop that resolves sounds finished',
          'V is too difficult to play',
          'V only exists in major keys',
        ]}
        answer={0}
        explain="A strong resolution is an ending. Music built to circle for minutes at a time avoids the one chord whose job is to arrive — which is the opposite of the choice chapter six's cadences lesson was making."
      />

      <Aside title="Why minor and modal specifically?">
        <p>
          Minor keys have a weaker natural pull towards home than major ones — the seventh
          degree sits a whole tone below the tonic rather than a semitone, so it leans less.
          Modal harmony weakens it further by removing the leading note altogether.
        </p>
        <p>
          The result is harmony with no gravity. In a chapter-six context that would be a
          failure; here it is the entire design goal, because it lets everything else — the
          rhythm, the filter sweep, the arrangement — carry the sense of movement instead.
        </p>
      </Aside>
    </Lesson>
  )
}
