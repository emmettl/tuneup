import { useState } from 'react'
import { Aside, Caption, Check, Control, Controls, Headline, Lesson, Say, Try } from '../../ui/lesson/index.js'
import Keyboard from '../../widgets/Keyboard.tsx'
import { player } from '../../audio/index.js'
import { enharmonics, midiOf, note, noteName, spellMidi } from '../../theory/index.js'

const BLACK = midiOf(note('C#4'))

export default function SharpsAndFlats() {
  const [prefer, setPrefer] = useState<'sharp' | 'flat'>('sharp')
  const spelled = spellMidi(BLACK, prefer)
  const others = enharmonics(spelled).filter((n) => noteName(n) !== noteName(spelled))

  return (
    <Lesson>
      <Headline>Sharps, flats, and two names for one key</Headline>

      <Say>
        The black keys have no letters of their own. Each one is named after a white neighbour
        — raised, or lowered — which means every black key has at least two names.
      </Say>

      <Try caption="The same key, both ways round. Play it and confirm nothing about the sound changes.">
        <Controls>
          <Control toggle active={prefer === 'sharp'} onPress={() => setPrefer('sharp')}>
            Call it C♯
          </Control>
          <Control toggle active={prefer === 'flat'} onPress={() => setPrefer('flat')}>
            Call it D♭
          </Control>
          <Control onPress={() => player().play(BLACK, { duration: 1.2 })}>Play it</Control>
        </Controls>
        <Keyboard
          range={[60, 72]}
          highlight={[{ midi: BLACK, tone: 'blue' }]}
          spellNotes={[spelled]}
          labels="note"
          height={130}
        />
      </Try>

      <Caption>
        Both names are <span className="mono">{noteName(spelled)}</span>&rsquo;s key. Two names,
        one sound — and a third if you want it:{' '}
        <span className="mono">{others.map((n) => noteName(n)).join(', ')}</span>.
      </Caption>

      <Say>
        Two names for one sound is called an <strong>enharmonic</strong>. Which one is correct
        is not a matter of taste — it depends entirely on the music around it, and getting it
        right is what makes written music readable.
      </Say>

      <Check
        id="enharmonic-same"
        ask="How do C♯ and D♭ differ?"
        options={[
          'Not at all in sound — only in how they are written and used',
          'D♭ is very slightly lower',
          'They are different keys on the keyboard',
        ]}
        answer={0}
        explain="Identical sound, identical key. The names carry information about context — which scale you are in and where the note is going — and that is information the sound alone cannot express."
      />

      <Aside title="If they sound the same, why bother?">
        <p>
          Because a scale has to use each letter once. B flat major spells its fourth as E flat;
          calling it D sharp would give the scale two Ds and no Es, and the result is unreadable
          even though it sounds identical.
        </p>
        <p>
          It also carries direction. A sharp usually means a note on its way up and a flat one
          on its way down, so the spelling tells a player what the composer intended before
          they have worked anything out.
        </p>
      </Aside>
    </Lesson>
  )
}
