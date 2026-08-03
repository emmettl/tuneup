import { useState } from 'react'
import { Aside, Caption, Check, Control, Controls, Headline, Lesson, Say, Try } from '../../ui/lesson/index.js'
import Keyboard from '../../widgets/Keyboard.tsx'
import ChordPlayer from '../../widgets/ChordPlayer.tsx'
import { player } from '../../audio/index.js'
import {
  chord,
  chordPitches,
  chordSymbol,
  closeVoicing,
  key,
  progressionChords,
  progressionById,
  totalMovement,
  voiceProgression,
} from '../../theory/index.js'

const C = chord('C')

export default function SameChordDifferentShape() {
  const [inversion, setInversion] = useState(0)
  const pitches = chordPitches({ ...C, inversion }, 4)

  const pop = progressionById('pop-four')!
  const chords = progressionChords(pop, key('C'))
  const blocked = chords.map((spec) => closeVoicing(spec, 64))
  const led = voiceProgression(chords, 64)

  return (
    <Lesson>
      <Headline>Same chord, different shape</Headline>

      <Say>
        A chord is a set of notes, not an order. Move the bottom note up an octave and it is
        still the same chord — same name, same function, different shape under the hand.
      </Say>

      <Try caption="C major three ways. Listen: the character shifts, the chord does not.">
        <Controls>
          {[0, 1, 2].map((n) => (
            <Control
              key={n}
              toggle
              active={n === inversion}
              onPress={() => {
                setInversion(n)
                player().chord(chordPitches({ ...C, inversion: n }, 4), { duration: 1.8 })
              }}
            >
              {n === 0 ? 'Root position' : `${n === 1 ? 'First' : 'Second'} inversion`}
            </Control>
          ))}
        </Controls>
        <Keyboard
          range={[60, 84]}
          // Coloured by the note's ROLE in the chord rather than by its position in the
          // voicing — that is the whole point of the lesson: the third is still the third
          // when it happens to be at the bottom.
          highlight={pitches.map((midi) => ({
            midi,
            tone:
              (['root', 'third', 'fifth'] as const)[
                [0, 4, 7].indexOf((((midi - 60) % 12) + 12) % 12)
              ] ?? 'scale',
          }))}
          spellIn={key('C')}
          labels="note"
          height={130}
        />
        <p className="mono" style={{ fontSize: 13, color: 'var(--ink-dim)', margin: 0 }}>
          {chordSymbol({ ...C, inversion })}
        </p>
      </Try>

      <Say>
        This matters because it lets chords move smoothly. Play a progression in root position
        and every finger jumps; choose inversions that keep the shared notes still, and the
        same four chords sound like a player rather than a list.
      </Say>

      <Try caption="The same four chords, voiced two ways. Press play and switch.">
        <ChordPlayer musicKey={key('C')} bars={pop.numerals} bpm={90} />
      </Try>

      <Caption>
        Blocked, those four chords move {totalMovement(blocked)} semitones in total. Voice-led,
        they move {totalMovement(led)}. The player above uses the second, which is why it does
        not lurch.
      </Caption>

      <Check
        id="what-inversion-changes"
        ask="What does inverting a chord change?"
        options={[
          'Which note is lowest — not which notes it contains',
          'The chord becomes a different chord',
          'One note is replaced by another',
        ]}
        answer={0}
        explain="Exactly the same notes in a different arrangement. The name does not change, the function in the key does not change, and only the shape and the lowest note do."
      />

      <Aside title="Does the bass note really not matter?">
        <p>
          It matters to the character quite a lot — the lowest note is the one the ear takes as
          the foundation, so a first-inversion chord feels lighter and less settled than root
          position. That is why a final chord is almost always in root position.
        </p>
        <p>
          What it does not change is which chord it IS. C, E and G are a C major triad in any
          order, and a chart writes C/E rather than something else entirely.
        </p>
      </Aside>
    </Lesson>
  )
}
