import { useState } from 'react'
import { Caption, Headline, Lesson, Say, Try } from '../../ui/lesson/index.js'
import Keyboard from '../../widgets/Keyboard.tsx'
import { noteName, spellMidi } from '../../theory/index.js'

// The audio unlock, doing double duty as the first lesson.
//
// There is deliberately no "click to enable sound" gate anywhere in this app. A gate is one
// more click between a learner and their first sound, and it teaches nothing. Making the
// gesture BE the lesson costs nothing and starts the site with a noise instead of a dialog.

export default function MakeANoise() {
  const [pressed, setPressed] = useState<number[]>([])

  return (
    <Lesson>
      <Headline>Make a noise</Headline>

      <Say>Press something.</Say>

      <Try>
        <Keyboard range={[60, 84]} labels="none" keys onPlay={(midi) => setPressed((p) => [...p, midi])} />
      </Try>

      {pressed.length === 0 ? (
        <Caption>Anywhere. There is nothing to get wrong yet.</Caption>
      ) : pressed.length < 6 ? (
        <Caption>Keep going. Try two at once.</Caption>
      ) : (
        <>
          <Say>
            That is the whole instrument. Every piece of music you have ever heard was made by
            choosing which of these to press, and when.
          </Say>
          <Caption>
            You have pressed {new Set(pressed).size} different notes so far, most recently{' '}
            <span className="mono">{noteName(spellMidi(pressed.at(-1)!), { octave: true })}</span>.
            Next: why there are only twelve of them.
          </Caption>
        </>
      )}
    </Lesson>
  )
}
