import { useState } from 'react'
import { Aside, Caption, Check, Control, Controls, Headline, Lesson, Say, Try } from '../../ui/lesson/index.js'
import Keyboard from '../../widgets/Keyboard.tsx'
import { chordHighlights } from '../../widgets/highlight.js'
import { player } from '../../audio/index.js'
import { CHORD_FORMULAS, chord, chordNotes, chordSymbol, key, midiOf } from '../../theory/index.js'

const FLAVOURS = ['Cmaj7', 'Cm7', 'C7'] as const

export default function AddAFourthNote() {
  const [which, setWhich] = useState(0)
  const spec = chord(FLAVOURS[which]!)
  const notes = chordNotes(spec)

  const strike = (index: number) => {
    setWhich(index)
    player().chord(chordNotes(chord(FLAVOURS[index]!)).map(midiOf), {
      duration: 2.2,
      instrument: 'rhodes',
    })
  }

  return (
    <Lesson>
      <Headline>Add a fourth note</Headline>

      <Say>
        Keep stacking. One more third on top of a triad gives a <strong>seventh chord</strong>,
        and the extra note changes the mood far more than a fourth note has any right to.
      </Say>

      <Try caption="Same root, same fifth. The third and the seventh do all the work.">
        <Controls>
          {FLAVOURS.map((name, index) => (
            <Control key={name} toggle active={index === which} onPress={() => strike(index)}>
              {chordSymbol(chord(name))}
            </Control>
          ))}
        </Controls>
        <Keyboard
          range={[60, 79]}
          highlight={chordHighlights(notes)}
          spellIn={key('C')}
          labels="note"
          height={130}
        />
      </Try>

      <Caption>{CHORD_FORMULAS[spec.quality].blurb}</Caption>

      <Say>
        The third one — <span className="mono">C7</span> — is the odd one out. A major triad
        with a <em>flattened</em> seventh, so it is neither comfortably major nor minor. It is
        called a <strong>dominant seventh</strong>, it is restless by design, and the entire
        blues is built on it. Remember this chord.
      </Say>

      <Check
        id="dominant-seventh"
        ask="What makes a dominant seventh different from a major seventh?"
        options={[
          'Its seventh is a semitone lower',
          'Its third is a semitone lower',
          'It has an extra note',
        ]}
        answer={0}
        explain="Both are major triads with a fourth note on top. The major seventh sits one semitone below the octave and sounds dreamy; the dominant's is two below, and that gap is what makes it restless."
      />

      <Aside title="Why is it called 'dominant'?">
        <p>
          Because in an ordinary key exactly one degree produces this chord naturally — the
          fifth, which is called the dominant. Build a seventh chord on any other degree of a
          major scale and you get a major seventh, a minor seventh or a half-diminished, never
          this one.
        </p>
        <p>
          That uniqueness is why it points home so strongly: hearing it, the ear knows which
          key it is in and where it is going. The blues throws that away by making every chord
          a dominant seventh, so nothing points anywhere and the tension becomes the texture
          instead of a journey.
        </p>
      </Aside>
    </Lesson>
  )
}
