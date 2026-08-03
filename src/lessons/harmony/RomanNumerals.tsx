import { useState } from 'react'
import { Aside, Caption, Check, Headline, Lesson, Say, Try, Control, Controls } from '../../ui/lesson/index.js'
import ChordPlayer from '../../widgets/ChordPlayer.tsx'
import { chordSymbol, key, keyName, progressionChords, progressionById, writableKeys } from '../../theory/index.js'

export default function RomanNumerals() {
  const [inKey, setInKey] = useState('C')
  const musicKey = key(inKey)
  const pop = progressionById('pop-four')!
  const letters = progressionChords(pop, musicKey).map((spec) => chordSymbol(spec))

  return (
    <Lesson>
      <Headline>Roman numerals</Headline>

      <Say>
        Musicians rarely talk in letters. They say &ldquo;one, five, six, four&rdquo; — the
        chords by their position in the key rather than by name — because that describes a
        relationship, and a relationship survives changing key.
      </Say>

      <Try caption="Press play, then change key. The numerals never move; every letter does.">
        <ChordPlayer musicKey={musicKey} bars={pop.numerals} bpm={94} drums />
        <Controls>
          {writableKeys('major')
            .filter((k) => ['C', 'G', 'D', 'F', 'B♭', 'E♭'].includes(keyName(k).replace(' major', '')))
            .map((k) => (
              <Control
                key={keyName(k)}
                toggle
                active={keyName(k) === keyName(musicKey)}
                onPress={() => setInKey(keyName(k).replace(' major', ''))}
              >
                {keyName(k).replace(' major', '')}
              </Control>
            ))}
        </Controls>
      </Try>

      <Caption>
        In {keyName(musicKey)} those four numerals are{' '}
        <span className="mono">{letters.join(' · ')}</span>. Same tune, same feeling, no notes
        in common with the last key you tried.
      </Caption>

      <Say>
        Capitals are major and lower case is minor, so the shape tells you the sound before you
        have worked out a single note. <span className="mono">I–V–vi–IV</span> is bright,
        bright, sad, bright — in any key on earth.
      </Say>

      <Check
        id="numeral-case"
        ask="What does a lower-case numeral like vi mean?"
        options={['A minor chord on that degree', 'A quieter chord', 'A chord played lower down']}
        answer={0}
        explain="Case carries the quality. That is why vi and VI are different chords on the same degree, and why you can read the mood of a progression off the page without naming a note."
      />

      <Aside title="Why not just learn the letters?">
        <p>
          Because you would have to learn them again for every key, and there are fifteen. A
          singer who needs a song lower does not want a different song — and a band told
          &ldquo;one, four, five in E&rdquo; can all play it immediately without anyone writing
          anything down.
        </p>
        <p>
          It also makes patterns visible. Once you notice how many songs are I–V–vi–IV, you
          cannot stop noticing, and no amount of staring at chord letters would ever have shown
          you that.
        </p>
      </Aside>
    </Lesson>
  )
}
