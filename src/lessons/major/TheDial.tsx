import { useState } from 'react'
import { Aside, Caption, Check, Headline, Lesson, Say, Try } from '../../ui/lesson/index.js'
import CircleOfFifths from '../../widgets/CircleOfFifths.tsx'
import Keyboard from '../../widgets/Keyboard.tsx'
import { type Key, key, keyName, keySignature, keyScale, noteName } from '../../theory/index.js'

export default function TheDial() {
  const [musicKey, setMusicKey] = useState<Key>(key('C'))
  const signature = keySignature(musicKey)
  const altered = keyScale(musicKey).filter((n) => n.alter !== 0)

  return (
    <Lesson>
      <Headline>The dial</Headline>

      <Say>
        Twelve keys, arranged so that neighbours are as closely related as possible. Drag round
        it slowly and watch the keyboard: each step changes <strong>exactly one note</strong>.
      </Say>

      <Try caption="Drag round the outer ring. The inner ring is each key's relative minor.">
        <CircleOfFifths musicKey={musicKey} onKeyChange={setMusicKey} />
      </Try>

      <Try caption="The same key on a keyboard. Coloured keys are in it; the rest are not.">
        <Keyboard
          range={[60, 84]}
          scale={{ key: musicKey, id: musicKey.mode === 'minor' ? 'natural-minor' : 'major' }}
          spellIn={musicKey}
          labels="note"
          height={130}
        />
      </Try>

      <Caption>
        {keyName(musicKey)}:{' '}
        {altered.length === 0
          ? 'no sharps or flats at all — the only key like that.'
          : `${altered.length} ${signature.kind}${altered.length === 1 ? '' : 's'} — ${altered
              .map((n) => noteName(n))
              .join(', ')}.`}
      </Caption>

      <Say>
        Going clockwise adds a sharp each time; anticlockwise adds a flat. That is not a rule
        to memorise — it is what happens when you move the scale shape up a fifth, because a
        fifth is exactly the distance that keeps six of the seven notes in place.
      </Say>

      <Check
        id="one-note"
        ask="How many notes change between neighbouring keys on the circle?"
        options={['One', 'Three', 'All seven']}
        answer={0}
        explain="Exactly one, every time. That is what makes them neighbours — and why modulating to a neighbouring key is almost unnoticeable while jumping across the circle is a jolt."
      />

      <Aside title="Why fifths, and not just C D E F G?">
        <p>
          Arrange the keys alphabetically and neighbours differ by two or five notes, which
          tells you nothing useful. Arrange them by fifths and neighbours differ by exactly
          one — so the layout itself encodes how closely related any two keys are, measured by
          how much a listener would notice the move.
        </p>
        <p>
          It is also why the accidental count runs 0, 1, 2, 3 round the circle rather than
          jumping about. The count IS the position; they are the same number seen two ways,
          which is how this project stores it.
        </p>
      </Aside>
    </Lesson>
  )
}
