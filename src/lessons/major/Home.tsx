import { useState } from 'react'
import { Aside, Caption, Check, Control, Controls, Headline, Lesson, Say, Try } from '../../ui/lesson/index.js'
import Keyboard from '../../widgets/Keyboard.tsx'
import { player } from '../../audio/index.js'
import { key, midiOf, note, scalePitches } from '../../theory/index.js'

const ROOT = midiOf(note('C4'))
// An original phrase, deliberately ordinary, that stops one note short of home.
const PHRASE = [4, 3, 2, 4, 3, 1]

export default function Home() {
  const [guess, setGuess] = useState<number | null>(null)
  const pitches = scalePitches(ROOT, 'major', 2)

  const playPhrase = (finish?: number) => {
    const origin = player().now()
    PHRASE.forEach((degree, index) => {
      player().play(pitches[degree]!, { at: origin + index * 0.34, duration: 0.32 })
    })
    if (finish !== undefined) {
      player().play(finish, { at: origin + PHRASE.length * 0.34, duration: 1.4 })
    }
  }

  const tryNote = (midi: number) => {
    setGuess(midi)
    playPhrase(midi)
  }

  const correct = guess !== null && guess % 12 === ROOT % 12

  return (
    <Lesson>
      <Headline>Home</Headline>

      <Say>
        One note in every key feels like home — the one a tune wants to end on. You already
        know which it is, even if nobody has told you. Listen to this and finish it.
      </Say>

      <Try caption="Play the phrase, then press the key you think it wants next.">
        <Controls>
          <Control onPress={() => playPhrase()}>Play the phrase</Control>
          {guess !== null && <Control onPress={() => setGuess(null)}>Try another</Control>}
        </Controls>
        <Keyboard
          range={[60, 72]}
          scale={{ key: key('C'), id: 'major' }}
          spellIn={key('C')}
          labels="note"
          silent
          onPlay={tryNote}
          height={130}
        />
      </Try>

      <Caption>
        {guess === null
          ? 'Any key in the scale. There is a right answer and your ear already has it.'
          : correct
            ? 'That is it. C — the note the scale is named after, and the one everything else leans towards.'
            : 'That did not settle, did it? It sounds like the phrase is still waiting. Try another.'}
      </Caption>

      <Say>
        That note is the <strong>tonic</strong>, and a key is named after it. Nothing about it
        is louder or longer — it simply is the note the other six are measured against, and
        arriving there is what &ldquo;finished&rdquo; sounds like.
      </Say>

      <Check
        id="what-is-tonic"
        ask="What makes a note the tonic?"
        options={[
          'The other notes of the scale lean towards it',
          'It is the lowest note available',
          'It is played most often',
        ]}
        answer={0}
        explain="It is a relationship, not a property of the note itself. The same C is home in C major and merely the third degree in A minor — the note has not changed, the context has."
      />

      <Aside title="Why does the seventh lean so hard?">
        <p>
          Because it is only a semitone below home, and the semitone is the tightest gap in the
          system. The ear reads it as almost-there, so leaving a phrase on it feels like a
          sentence stopped mid-word.
        </p>
        <p>
          That is why it is called the leading note, and why every lesson about cadences comes
          back to it. Most of the sense of arrival in Western music is one semitone doing an
          enormous amount of work.
        </p>
      </Aside>
    </Lesson>
  )
}
