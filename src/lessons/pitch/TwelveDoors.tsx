import { useState } from 'react'
import { Aside, Caption, Check, Headline, Lesson, Say, Try } from '../../ui/lesson/index.js'
import Keyboard from '../../widgets/Keyboard.tsx'
import { noteName, spellMidi } from '../../theory/index.js'

export default function TwelveDoors() {
  const [pressed, setPressed] = useState<number[]>([])
  const last = pressed.at(-1)

  // Whether they have found the same letter twice, an octave apart. The lesson's "do" is
  // discovering that by ear and by eye rather than being told it.
  const foundOctave = pressed.some(
    (midi, index) => pressed.slice(0, index).some((other) => other !== midi && other % 12 === midi % 12),
  )

  return (
    <Lesson>
      <Headline>Twelve doors</Headline>

      <Say>
        Press anything. The names run A to G and then start again — there are only twelve
        notes in the whole system, and every piece of music you have ever heard picks from
        these.
      </Say>

      <Try caption="Every C is amber. Notice how far apart they are.">
        <Keyboard
          range={[60, 84]}
          highlight={[{ pitchClass: 0, tone: 'root' }]}
          labels="note"
          keys
          onPlay={(midi) => setPressed((current) => [...current.slice(-7), midi])}
        />
        <p className="mono" style={{ fontSize: 13, color: 'var(--ink-dim)', margin: 0 }}>
          {last === undefined
            ? 'you have not pressed anything yet'
            : `last: ${noteName(spellMidi(last), { octave: true })}`}
          {pressed.length > 1 && `  ·  before that: ${pressed
            .slice(0, -1)
            .reverse()
            .map((midi) => noteName(spellMidi(midi)))
            .join(' ')}`}
        </p>
      </Try>

      <Say>
        The black keys come in twos and threes, and that pattern never changes. It is how you
        find your way: <strong>C is always the white key just left of a pair of blacks.</strong>
      </Say>

      <Caption>
        {foundOctave
          ? 'You just played the same note twice, an octave apart. Same letter, same colour, different height — that is the next lesson.'
          : 'Try pressing two keys with the same letter, one high and one low.'}
      </Caption>

      <Check
        id="find-c"
        ask="Where is C?"
        options={[
          'Just left of a pair of black keys',
          'Just left of a group of three black keys',
          'The lowest white key on any keyboard',
        ]}
        answer={0}
        explain="The two-black-key group is the landmark. C sits immediately to its left, every time, on every keyboard ever built."
      />

      <Aside title="Why twelve, and why these names?">
        <p>
          Twelve is a choice, not a law of physics — it is the division of the octave that
          Western music settled on, and other traditions divide it differently. What makes it
          workable is that twelve equal steps happen to land very close to several simple
          frequency ratios, which is why chords built from them sound settled rather than sour.
        </p>
        <p>
          The letters only go up to G because they were named long before anyone thought of
          the black keys as notes in their own right. The black keys are still described in
          terms of their white neighbours today — <span className="mono">C♯</span> means
          &ldquo;C, raised&rdquo; and <span className="mono">D♭</span> means &ldquo;D,
          lowered&rdquo;. Those two are the same key. Which name is correct depends on the
          music around it, and that turns out to matter a great deal later.
        </p>
      </Aside>
    </Lesson>
  )
}
