import { useState } from 'react'
import { Aside, Check, Headline, Lesson, Say, Try } from '../../ui/lesson/index.js'
import ChordPlayer from '../../widgets/ChordPlayer.tsx'
import { diatonicNumerals, key, romanText } from '../../theory/index.js'

export default function SevenChordsFree() {
  const c = key('C')
  const palette = diatonicNumerals(c).map((rn) => romanText(rn))
  const [bars, setBars] = useState(['I', 'V', 'vi', 'IV'])

  return (
    <Lesson>
      <Headline>Seven chords, free</Headline>

      <Say>
        Pick a key and it hands you seven chords that all work together. You did not choose
        them — stacking thirds on each note of the scale produced them, and any order you put
        them in will sound like music.
      </Say>

      <Try caption="Press play, then tap any bar to change it. Nothing you can pick will sound wrong.">
        <ChordPlayer
          musicKey={c}
          bars={bars}
          onBarsChange={setBars}
          editable={[0, 1, 2, 3]}
          palette={palette}
          bpm={92}
          drums
        />
      </Try>

      <Say>
        The roman numerals matter more than the letters. <span className="mono">I–V–vi–IV</span>{' '}
        describes a relationship, so it means the same thing in every key — which is why
        musicians talk in numbers and not in note names.
      </Say>

      <Check
        id="why-numerals"
        ask="Why write chords as I, V, vi rather than C, G, Am?"
        options={[
          'The numbers work in any key; the letters only work in one',
          'The numbers are shorter to write',
          'The letters are only for beginners',
        ]}
        answer={0}
        explain="I–V–vi–IV is C–G–Am–F in C and E♭–B♭–Cm–A♭ in E flat. Same numbers, same sound, completely different letters."
      />

      <Aside title="The odd one out">
        <p>
          Six of the seven are ordinary major or minor chords. The seventh — built on the note
          just below home — is diminished, with both upper notes squeezed down, and it sounds
          unstable enough that it is rarely used on its own. It is far more often heard as the
          top of the V chord, where that instability is doing useful work.
        </p>
      </Aside>
    </Lesson>
  )
}
