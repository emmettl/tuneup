import { useState } from 'react'
import { Aside, Check, Control, Controls, Headline, Lesson, Say, Try } from '../../ui/lesson/index.js'
import Keyboard from '../../widgets/Keyboard.tsx'
import { chordHighlights } from '../../widgets/highlight.js'
import { player } from '../../audio/index.js'
import { chordNotes, chordSymbol, diatonicTriads, key, midiOf } from '../../theory/index.js'

export default function StackInThirds() {
  const c = key('C')
  const triads = diatonicTriads(c)
  const [degree, setDegree] = useState(0)
  const spec = triads[degree]!
  const notes = chordNotes(spec)

  const strike = (index: number) => {
    setDegree(index)
    player().chord(chordNotes(triads[index]!).map(midiOf), { duration: 1.8, instrument: 'organ' })
  }

  return (
    <Lesson>
      <Headline>Stack in thirds</Headline>

      <Say>
        A chord is what you get by taking a note, skipping the next one, taking the one after,
        skipping again, and taking a third. Every other note of the scale.
      </Say>

      <Try caption="Seven notes in the scale, so seven chords. Try each.">
        <Controls>
          {triads.map((triad, index) => (
            <Control key={index} toggle active={index === degree} onPress={() => strike(index)}>
              {chordSymbol(triad)}
            </Control>
          ))}
        </Controls>
        <Keyboard range={[60, 84]} highlight={chordHighlights(notes)} spellIn={c} labels="note" height={130} />
      </Try>

      <Say>
        Amber is the note you started on, pink is the one two steps up, mint is two steps
        above that. The same skip-one-take-one shape every time — and it produces three major
        chords, three minor ones and one odd one out.
      </Say>

      <Check
        id="stack-shape"
        ask="How is a triad built from a scale?"
        options={[
          'Take a note, skip one, take one, skip one, take one',
          'Take three notes next to each other',
          'Take the first, fourth and fifth notes'
        ]}
        answer={0}
        explain="Every other note. Doing that from each of the seven degrees is where all the chords in a key come from — you never have to decide, the scale decides for you."
      />

      <Aside title="Why thirds, rather than any other gap?">
        <p>
          Stack notes a second apart and they are close enough to fight; stack them a fourth
          apart and the chord spreads too wide to have a clear centre. A third is the widest
          gap that still fuses into one sound, so a stack of them reads as a single chord
          rather than as several notes at once.
        </p>
        <p>
          Keep stacking and you get sevenths, ninths, elevenths and thirteenths — the same
          rule applied more times, which is why the numbers go up in twos.
        </p>
      </Aside>
    </Lesson>
  )
}
