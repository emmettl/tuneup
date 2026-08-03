import { useState } from 'react'
import { Aside, Caption, Check, Control, Controls, Headline, Lesson, Say, Try } from '../../ui/lesson/index.js'
import Keyboard from '../../widgets/Keyboard.tsx'
import { player } from '../../audio/index.js'
import { between, intervalName, midiOf, note, spellMidi } from '../../theory/index.js'

const ROOT = midiOf(note('C4'))

export default function CountingSteps() {
  const [target, setTarget] = useState(ROOT + 7)
  const gap = target - ROOT
  const measured = between(spellMidi(ROOT), spellMidi(target))

  const hear = (midi: number) => {
    setTarget(midi)
    const origin = player().now()
    player().play(ROOT, { at: origin, duration: 0.55 })
    player().play(midi, { at: origin + 0.6, duration: 0.55 })
    player().chord([ROOT, midi], { at: origin + 1.3, duration: 1.4 })
  }

  return (
    <Lesson>
      <Headline>Counting steps</Headline>

      <Say>
        The distance between two notes is called an <strong>interval</strong>, and it is
        measured in semitones — one key to the next, black or white. Pick any key and count.
      </Say>

      <Try caption="C is amber. Press any other key to measure from it.">
        <Keyboard
          range={[60, 84]}
          highlight={[
            { midi: ROOT, tone: 'root' },
            { midi: target, tone: 'fifth' },
          ]}
          labels="note"
          silent
          onPlay={hear}
          keys
        />
        <Controls>
          {[2, 4, 5, 7, 9, 12].map((semitones) => (
            <Control
              key={semitones}
              toggle
              active={gap === semitones}
              onPress={() => hear(ROOT + semitones)}
            >
              {semitones} semitones
            </Control>
          ))}
        </Controls>
      </Try>

      <Caption>
        {gap === 0
          ? 'The same note twice — no distance at all.'
          : `${gap} semitone${gap === 1 ? '' : 's'}. That is called a ${intervalName(measured)}.`}
      </Caption>

      <Say>
        Intervals have names as well as numbers, and the names count LETTERS rather than
        semitones. C to G touches five letters — C D E F G — so it is a fifth, whatever
        accidentals are involved.
      </Say>

      <Check
        id="count-the-fifth"
        ask="How many semitones is a perfect fifth?"
        options={['7', '5', '4']}
        answer={0}
        explain="Seven semitones, but five letters — which is why it is called a fifth. The name counts letters and the sound counts semitones, and keeping both is what lets a stave and a keyboard agree."
      />

      <Aside title="Why two ways of counting?">
        <p>
          Because they answer different questions. Semitones tell you what it sounds like;
          letters tell you how it is written and how it behaves. C to F sharp and C to G flat
          are the same six semitones and are not the same interval — one is an augmented
          fourth and the other a diminished fifth, and they resolve in opposite directions.
        </p>
        <p>
          A system that only counted semitones could not tell those apart, which is why this
          site spells every note rather than storing a number.
        </p>
      </Aside>
    </Lesson>
  )
}
