import { useState } from 'react'
import { Aside, Caption, Check, Headline, Lesson, Say, Try } from '../../ui/lesson/index.js'
import Keyboard from '../../widgets/Keyboard.tsx'
import ChordPlayer from '../../widgets/ChordPlayer.tsx'
import { key, midiOf, note, scalePitches } from '../../theory/index.js'

const ROOT = midiOf(note('A3'))

export default function FiveNotesNoWrongAnswers() {
  const [played, setPlayed] = useState<number[]>([])
  const pentatonic = new Set(scalePitches(ROOT, 'minor-pentatonic', 3).map((m) => m % 12))

  return (
    <Lesson>
      <Headline>Five notes, no wrong answers</Headline>

      <Say>
        Start the backing loop, then play. Every coloured key belongs to the minor pentatonic,
        and there is no combination of them that will sound wrong over this — not a single one.
      </Say>

      <Try caption="Press play first, then improvise. Use the computer keyboard if you have one.">
        <ChordPlayer musicKey={key('A minor')} bars={['i', 'bVII', 'bVI', 'bVII']} bpm={92} drums />
      </Try>

      <Try caption="Coloured keys are safe. The grey ones are not in the scale — try one and hear the difference.">
        <Keyboard
          range={[57, 84]}
          highlight={[...pentatonic].map((pitchClass) => ({
            pitchClass,
            tone: pitchClass === ROOT % 12 ? ('root' as const) : ('scale' as const),
          }))}
          spellIn={key('A minor')}
          labels="note"
          instrument="guitar"
          keys
          onPlay={(midi) => setPlayed((current) => [...current.slice(-40), midi])}
        />
      </Try>

      <Caption>
        {played.length === 0
          ? 'Nothing yet. Mash the coloured keys — you genuinely cannot get this wrong.'
          : `${played.length} notes so far, ${new Set(played.map((m) => m % 12)).size} different ones. ${
              played.filter((m) => !pentatonic.has(m % 12)).length === 0
                ? 'All inside the scale.'
                : 'Some of those were outside it — you probably heard which.'
            }`}
      </Caption>

      <Say>
        This is why the pentatonic is where almost everyone starts improvising. The scale has
        removed the decisions that can go wrong, so the only things left to think about are
        rhythm and shape — which are the things worth thinking about anyway.
      </Say>

      <Check
        id="why-safe"
        ask="Why can't you play a wrong note here?"
        options={[
          'No two notes in the scale are a semitone apart',
          'The backing loop is very quiet',
          'The notes are all from the same chord',
        ]}
        answer={0}
        explain="The semitone is the sharpest clash available, and the pentatonic contains none. Remove every semitone and no combination of the remaining notes can produce that particular grinding."
      />

      <Aside title="Is it really impossible to sound bad?">
        <p>
          Impossible to sound <em>wrong</em>, which is not quite the same thing. Every note
          will fit; a phrase can still be shapeless, or land in a place that undercuts the beat.
        </p>
        <p>
          That is the actual value of it, though. Removing the pitch decisions leaves you
          nothing to hide behind on rhythm and phrasing, which is where the interesting part of
          improvising lives and where a beginner otherwise never gets to.
        </p>
      </Aside>
    </Lesson>
  )
}
