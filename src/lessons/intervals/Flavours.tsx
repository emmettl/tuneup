import { useState } from 'react'
import { Aside, Caption, Check, Control, Controls, Headline, Lesson, Say, Try } from '../../ui/lesson/index.js'
import { player } from '../../audio/index.js'
import { COMMON_INTERVALS, interval, intervalName, midiOf, note, semitonesOf } from '../../theory/index.js'

// Chapter 2's sorting exercise.
//
// The standard way to teach interval recognition is famous-song mnemonics, and this site
// cannot use them: everything is synthesised and no melody is reproduced, so naming a tune
// promises something pressing play will not deliver. Sorting by FEEL instead is weaker as a
// memory hook and honest about what it is — and the tally at the end does some of the work a
// shared reference would have done.

const ROOT = midiOf(note('C4'))

type Bin = 'smooth' | 'spiky' | 'neutral'

export default function Flavours() {
  const [sorted, setSorted] = useState<Record<string, Bin>>({})
  const [current, setCurrent] = useState(0)
  const entry = COMMON_INTERVALS[current]!
  const semitones = semitonesOf(interval(entry.shorthand))

  const hear = () => {
    player().chord([ROOT, ROOT + semitones], { duration: 2, strum: 0 })
  }

  const sort = (bin: Bin) => {
    setSorted((current) => ({ ...current, [entry.shorthand]: bin }))
    setCurrent((index) => Math.min(COMMON_INTERVALS.length - 1, index + 1))
  }

  const done = Object.keys(sorted).length
  const smooth = Object.values(sorted).filter((b) => b === 'smooth').length

  return (
    <Lesson>
      <Headline>Flavours</Headline>

      <Say>
        Every interval has a character. Some sit together comfortably, some grind, and a few
        are oddly neutral. There are no right answers here — listen and sort them however they
        strike you.
      </Say>

      <Try caption="Both notes at once. Play it, then decide.">
        <Controls>
          <Control onPress={hear}>Hear {intervalName(interval(entry.shorthand))}</Control>
        </Controls>
        <Controls>
          <Control onPress={() => sort('smooth')}>Smooth</Control>
          <Control onPress={() => sort('neutral')}>Neutral</Control>
          <Control onPress={() => sort('spiky')}>Spiky</Control>
        </Controls>
        <p className="mono" style={{ fontSize: 13, color: 'var(--ink-dim)', margin: 0 }}>
          {done} of {COMMON_INTERVALS.length} sorted
        </p>
      </Try>

      <Caption>{entry.blurb}</Caption>

      {done >= COMMON_INTERVALS.length && (
        <Say>
          You put {smooth} of them in &ldquo;smooth&rdquo;. Most people land on four or five —
          the octave, the fifth, and the two thirds. Those are the intervals with the simplest
          frequency ratios, which is not a coincidence: simple ratios share more harmonics, and
          sharing harmonics is what &ldquo;consonant&rdquo; physically means.
        </Say>
      )}

      <Check
        id="most-consonant"
        ask="Which of these sounds most settled?"
        options={['A perfect fifth', 'A minor second', 'A tritone']}
        answer={0}
        explain="The fifth is a 3:2 frequency ratio — the simplest there is after the octave — so the two notes share most of their harmonics. The minor second and the tritone share almost none."
      />

      <Aside title="Why can't this lesson use famous songs?">
        <p>
          The usual way to learn intervals is to attach each one to the opening of a tune you
          already know. It works well, and this site cannot do it: every sound here is
          synthesised from scratch and no recording or melody is reproduced, so naming a song
          would promise something that pressing play will not deliver.
        </p>
        <p>
          Sorting by feel is a weaker hook, honestly. What makes up for it is repetition and
          the fact that you did the sorting yourself — an interval you have made a judgement
          about is stickier than one you were told the name of.
        </p>
      </Aside>
    </Lesson>
  )
}
