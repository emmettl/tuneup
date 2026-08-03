import { useState } from 'react'
import { Aside, Caption, Check, Control, Controls, Headline, Lesson, Say, Try } from '../../ui/lesson/index.js'
import Timbre from '../../widgets/Timbre.tsx'
import { chord, chordNotes, midiOf } from '../../theory/index.js'

// Wow moment: take the third out.
//
// Three stages, and the third one is the payoff: a clean triad is obviously happy, the same
// triad distorted is a mess, and root-plus-fifth distorted is instantly recognisable rock —
// and has no mood at all, because the note that carries mood is gone.
//
// The note is HELD throughout and the controls change under it, so what the learner hears is
// the change rather than three separate sounds they have to remember and compare.

type Stage = 'clean-triad' | 'dirty-triad' | 'power'

const STAGES: Record<Stage, { pitches: number[]; drive: number; note: string }> = {
  'clean-triad': {
    pitches: chordNotes(chord('E')).map(midiOf).map((m) => m - 12),
    drive: 0,
    note: 'A plain major chord. Three notes, unmistakably bright.',
  },
  'dirty-triad': {
    pitches: chordNotes(chord('E')).map(midiOf).map((m) => m - 12),
    drive: 0.85,
    note: 'The same three notes with the gain up. Muddy, and the spectrum is a forest — the third is generating clashing partials with everything else.',
  },
  power: {
    pitches: chordNotes(chord('E5')).map(midiOf).map((m) => m - 12),
    drive: 0.85,
    note: 'Third removed. Same gain, and suddenly it is clean and enormous — and it is neither major nor minor.',
  },
}

export default function TakeTheThirdOut() {
  const [stage, setStage] = useState<Stage>('clean-triad')
  const current = STAGES[stage]

  return (
    <Lesson>
      <Headline>Take the third out</Headline>

      <Say>
        Rock guitar almost never plays full chords. To hear why, hold a note and turn the gain
        up on an ordinary major chord.
      </Say>

      <Try caption="Hold the note, then step through. The sound changes under you rather than restarting.">
        <Timbre
          pitches={current.pitches}
          initial={{ wave: 'sawtooth', cutoff: 2600, resonance: 1.5, drive: current.drive }}
          controls={['drive', 'cutoff']}
          key={stage}
        />
        <Controls>
          {(Object.keys(STAGES) as Stage[]).map((id) => (
            <Control key={id} toggle active={stage === id} onPress={() => setStage(id)}>
              {id === 'clean-triad' ? 'Clean chord' : id === 'dirty-triad' ? 'Turn it up' : 'Remove the third'}
            </Control>
          ))}
        </Controls>
      </Try>

      <Caption>{current.note}</Caption>

      <Say>
        Two notes — the root and the fifth — is a <strong>power chord</strong>. It has no third,
        so it has no mood: it is neither happy nor sad, and it works over either. That is the
        point. The riff supplies the mood, and the chord gets out of the way.
      </Say>

      <Check
        id="power-chord-mood"
        ask="Why does a power chord work under both major and minor riffs?"
        options={[
          'It has no third, and the third is what decides major or minor',
          'It is played louder than other chords',
          'It uses only the lowest strings',
        ]}
        answer={0}
        explain="The third is the only note in a triad that decides its quality — chapter five made that with one semitone. Remove it and the chord genuinely has no quality to clash with anything."
      />

      <Aside title="Why does distortion specifically dislike thirds?">
        <p>
          Distortion generates new frequencies from sums and differences of the ones going in.
          Two notes a perfect fifth apart are in a simple 3:2 ratio, so those new frequencies
          mostly land on harmonics that were already there and reinforce them.
        </p>
        <p>
          A major third is roughly 5:4, which is a far messier ratio in equal temperament — the
          tempered third is noticeably out compared to the pure one. Distorted, its sums and
          differences land between the existing harmonics rather than on them, and that is what
          you can see in the spectrum and hear as mud.
        </p>
      </Aside>
    </Lesson>
  )
}
