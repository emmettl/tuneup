import { useState } from 'react'
import { Aside, Check, Control, Controls, Headline, Lesson, Say, Try } from '../../ui/lesson/index.js'
import Keyboard from '../../widgets/Keyboard.tsx'
import { chordHighlights } from '../../widgets/highlight.js'
import { player } from '../../audio/index.js'
import { chord, chordNotes, chordSymbol, midiOf, noteName } from '../../theory/index.js'

// Wow moment: the third decides.
//
// Almost all sound, almost no prose. The claim is "one note, moved by one semitone, is the
// entire difference between happy and sad" — and the control that produces it is a single
// toggle sitting right next to the sentence. That is the "no claim without a control" rule at
// its most literal.

export default function TheThirdDecides() {
  const [minor, setMinor] = useState(false)
  const spec = chord(minor ? 'Cm' : 'C')
  const notes = chordNotes(spec)

  const strike = (which: 'major' | 'minor') => {
    setMinor(which === 'minor')
    player().chord(chordNotes(chord(which === 'minor' ? 'Cm' : 'C')).map(midiOf), {
      duration: 1.8,
    })
  }

  return (
    <Lesson>
      <Headline>The third decides</Headline>

      <Say>
        Three notes make a chord. Play both of these and listen to the middle one — it is the
        only thing that changes.
      </Say>

      <Try caption="Same root, same top note. One semitone in the middle.">
        <Controls>
          <Control toggle active={!minor} onPress={() => strike('major')}>
            C major
          </Control>
          <Control toggle active={minor} onPress={() => strike('minor')}>
            C minor
          </Control>
        </Controls>
        <Keyboard
          range={[60, 72]}
          highlight={chordHighlights(notes)}
          labels="note"
          height={130}
          onPlay={() => undefined}
        />
        <p className="mono" style={{ fontSize: 13, color: 'var(--ink-dim)', margin: 0 }}>
          {chordSymbol(spec)} — {notes.map((note) => noteName(note)).join('  ')}
        </p>
      </Try>

      <Say>
        That middle note is called the <strong>third</strong>. Moved down one key it is a
        minor chord; put back it is major. Nothing else moved, and the mood is completely
        different.
      </Say>

      <Check
        id="which-note"
        ask="Which note changes between C major and C minor?"
        options={['The middle one — the third', 'The lowest one — the root', 'The highest one — the fifth']}
        answer={0}
        explain="The root and the fifth are identical in both. Only the third moves, by a single semitone, and it carries the whole difference between the two chords."
      />

      <Aside title="Why the third and not the fifth?">
        <p>
          A chord is built by stacking every other note of a scale: first, third, fifth. The
          fifth is the most acoustically stable interval there is, so it does very little for
          the character of the chord — take it away entirely and the chord still sounds major
          or minor. That is exactly what a power chord does, and why it sounds like neither.
        </p>
        <p>
          The third has no such stability. It sits close enough to both of its neighbours to
          be heard as leaning one way or the other, and that lean is what the ear reads as
          brightness or sadness. It is doing the emotional work in almost every chord you will
          meet.
        </p>
      </Aside>
    </Lesson>
  )
}
