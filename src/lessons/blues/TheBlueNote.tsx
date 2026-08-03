import { useState } from 'react'
import {
  Aside,
  Caption,
  Check,
  Control,
  Controls,
  Headline,
  Lesson,
  Say,
  Try,
} from '../../ui/lesson/index.js'
import Keyboard from '../../widgets/Keyboard.tsx'
import { player } from '../../audio/index.js'
import { key, midiOf, note, noteName, scaleNotes, scalePitches } from '../../theory/index.js'

// Wow moment: the blue note.
//
// One extra note turns five safe ones into the blues, and the lesson is built so the learner
// hears that rather than reads it. The two demonstration licks are ORIGINAL — written for this
// site. That constraint is not incidental: the obvious way to teach this is to quote a famous
// riff, and everything here is synthesised from scratch with no recording or melody
// reproduced, so a quoted riff is both unavailable and a promise the app cannot keep.

// Derived, not typed out. Hand-written MIDI numbers in a lesson are numbers nothing checks,
// and the one place they must agree with the theory core is the lesson that teaches them.
const ROOT = midiOf(note('A3'))
const A_MINOR_PENTATONIC = scalePitches(ROOT, 'minor-pentatonic', 1)
/** The flattened fifth: the one degree the blues scale adds to the minor pentatonic. */
const BLUE = ROOT + 6

// Both licks are ORIGINAL, written for this lesson, and expressed as semitones above the
// root so they transpose with it rather than being loose MIDI numbers nobody can read.
/** Passing THROUGH the blue note: it never lands, it is always on the way somewhere. */
const PASSING_LICK = [10, 7, 6, 5, 3, 0].map((step) => ROOT + step)
/** Landing ON it and sitting there. Deliberately unpleasant — that is the point being made. */
const LANDING_LICK = [10, 7, 6, 6, 6].map((step) => ROOT + step)

export default function TheBlueNote() {
  const [withBlue, setWithBlue] = useState(false)
  const scale = withBlue ? [...A_MINOR_PENTATONIC, BLUE].sort((a, b) => a - b) : A_MINOR_PENTATONIC

  const playLick = (lick: number[], hold = false) => {
    const origin = player().now()
    lick.forEach((midi, index) => {
      const gap = 0.22
      player().play(midi, {
        at: origin + index * gap,
        duration: hold && index === lick.length - 1 ? 1.6 : gap * 0.95,
        instrument: 'guitar',
      })
    })
  }

  const blueNote = scaleNotes(note('A'), 'blues')[3]!

  return (
    <Lesson>
      <Headline>The blue note</Headline>

      <Say>
        These five notes are the minor pentatonic. Play them in any order over a blues and
        nothing sounds wrong — which is also why nothing sounds like the blues yet.
      </Say>

      <Try caption="Five notes. Mash them about; there is no wrong answer.">
        <Keyboard
          range={[57, 81]}
          // The root is amber wherever it appears. Without it every pentatonic note looks
          // equally important, and "which one is home" — the thing that decides whether a
          // phrase sounds finished — is invisible.
          highlight={scale.map((midi) => ({
            pitchClass: midi % 12,
            tone:
              midi === BLUE
                ? ('blue' as const)
                : midi % 12 === ROOT % 12
                  ? ('root' as const)
                  : ('scale' as const),
          }))}
          // The blues scale spells its own notes: E♭, not D♯. See Keyboard's spellNotes.
          spellNotes={scaleNotes(note('A'), 'blues')}
          spellIn={key('A minor')}
          labels="note"
          instrument="guitar"
          keys
        />
        <Controls>
          <Control toggle active={!withBlue} onPress={() => setWithBlue(false)}>
            Five notes
          </Control>
          <Control toggle active={withBlue} onPress={() => setWithBlue(true)}>
            Add the blue note
          </Control>
        </Controls>
      </Try>

      <Say>
        Now add one more, squeezed into the biggest gap: {' '}
        <span className="mono">{noteName(blueNote)}</span>, the flattened fifth. It sits right
        next to the fifth, and it is the entire genre.
      </Say>

      <Try caption="The same fingers. One extra note, and it stops being a scale and starts being the blues.">
        <Controls>
          <Control onPress={() => playLick(PASSING_LICK)}>Pass through it</Control>
          <Control onPress={() => playLick(LANDING_LICK, true)}>Land on it and hold</Control>
        </Controls>
      </Try>

      <Caption>
        The second one sounds wrong, and it is meant to. The blue note is a note you move
        through, not one you stop on.
      </Caption>

      <Check
        id="blue-note-role"
        ask="What makes the blue note work?"
        options={[
          'Passing through it on the way to another note',
          'Holding it as the last note of a phrase',
          'Playing it at the same time as the fifth',
        ]}
        answer={0}
        explain="It is a semitone from the fifth, so held on its own it just sounds out of tune. Moving through it turns that tension into the slide and grit the blues is made of."
      />

      <Aside title="Why is it written as a flattened fifth?">
        <p>
          The same key can be called a raised fourth instead, and plenty of printed music does
          exactly that. It is the same sound either way; only the spelling differs.
        </p>
        <p>
          Calling it a flattened fifth keeps it on the same letter as the fifth it sits beside
          — <span className="mono">E♭</span> and <span className="mono">E</span> in A. That
          adjacency is the thing worth seeing, because it is what makes the note behave the way
          it does: it is not a new colour so much as the fifth, bent.
        </p>
      </Aside>
    </Lesson>
  )
}
