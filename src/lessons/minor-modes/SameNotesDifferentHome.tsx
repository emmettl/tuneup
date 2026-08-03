import { useState } from 'react'
import { Aside, Caption, Check, Headline, Lesson, Say, Try } from '../../ui/lesson/index.js'
import PitchClock from '../../widgets/PitchClock.tsx'
import ChordPlayer from '../../widgets/ChordPlayer.tsx'
import { key, noteName, spellInKey } from '../../theory/index.js'

// Wow moment: the relative minor.
//
// The claim is "same seven notes, different home, completely different mood" — so the ring
// must be seen NOT to change while the mood does. Moving home is a separate gesture from
// rotating the ring precisely so this lesson can show that only one of them happened.

export default function SameNotesDifferentHome() {
  // Where the ring's marker is. The ring owns it and reports it here — this lesson reacts to
  // wherever it lands rather than only to the two values it cares about, because a drag that
  // silently does nothing reads as a broken widget.
  const [home, setHome] = useState(0)
  const minor = home === 9
  const atC = home === 0
  const musicKey = minor ? key('A minor') : key('C')
  const homeName = noteName(spellInKey(60 + home, key('C')))

  return (
    <Lesson>
      <Headline>Same notes, different home</Headline>

      <Say>
        These seven notes are C major. Drag the amber marker round to A — the notes do not
        move, only which one counts as home.
      </Say>

      <Try caption="Drag the home marker to A. Watch the lit segments: not one of them changes.">
        {/* Always C major's seven notes. Home moves within them; the ring works out what the
            result is called. Passing a different scale when home reaches A would change the
            lit set, which is the one thing this lesson promises does not happen. */}
        <PitchClock scale={{ key: key('C'), id: 'major' }} movableHome onRootChange={setHome} labels="note" />
      </Try>

      <Caption>
        {minor
          ? 'Home is now A. The scale is A natural minor — and it is the same seven notes it was a moment ago.'
          : atC
            ? 'Home is C. Drag the marker round to A and watch the lit segments: not one of them moves.'
            : `Home is on ${homeName}, and the ring has named what that makes it. Every one of these is a real scale — that is chapter four. For now, put it on A.`}
      </Caption>

      <Say>
        Now hear it. Both loops use only these seven notes; the only difference is which one
        the music keeps returning to.
      </Say>

      <Try caption="Same notes, same tempo, same instrument. One sounds bright and one sounds sad.">
        <ChordPlayer
          musicKey={musicKey}
          bars={minor ? ['i', 'iv', 'v', 'i'] : ['I', 'IV', 'V', 'I']}
          bpm={84}
        />
      </Try>

      <Check
        id="relative-minor"
        ask="A minor and C major are…"
        options={[
          'The same seven notes with a different home',
          'Two completely different sets of notes',
          'The same notes played at different speeds',
        ]}
        answer={0}
        explain="Identical note sets. That is why they share a key signature — and why every major key has a minor twin three semitones below it."
      />

      <Aside title="If the notes are identical, what actually makes it sound sad?">
        <p>
          The distance from home to the other notes. From C, the third note up is four
          semitones away — a major third, which is bright. From A, using the same seven notes,
          the third note up is only three semitones away — a minor third.
        </p>
        <p>
          Nothing was added or removed. Moving home changed every interval measured FROM home,
          and the third is the one the ear reads as mood — which is the same fact chapter 5
          made with a single chord.
        </p>
      </Aside>
    </Lesson>
  )
}
