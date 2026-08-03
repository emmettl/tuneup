import { useState } from 'react'
import { Aside, Caption, Check, Control, Controls, Headline, Lesson, Say, Try } from '../../ui/lesson/index.js'
import StepGrid from '../../widgets/StepGrid.tsx'
import { player } from '../../audio/index.js'
import { tempoFromTaps } from '../../audio/timing.js'
import { laneFrom } from '../../widgets/step-grid.js'

export default function Pulse() {
  const [taps, setTaps] = useState<number[]>([])
  const [bpm, setBpm] = useState(100)
  const detected = tempoFromTaps(taps)

  const tap = () => {
    const now = player().now()
    player().drum('rim')
    setTaps((current) => {
      // Only the last few, so slowing down mid-tap is followed rather than averaged away.
      const next = [...current, now].slice(-5)
      const found = tempoFromTaps(next)
      if (found) setBpm(Math.round(found))
      return next
    })
  }

  return (
    <Lesson>
      <Headline>Pulse</Headline>

      <Say>
        Before pitch, before chords, there is a pulse — the thing you tap along to. Everything
        else in rhythm is measured against it, and it is the one part of music almost everyone
        can already do.
      </Say>

      <Try caption="Tap along to a song in your head. Four or five taps is enough.">
        <Controls>
          <Control onPress={tap}>Tap</Control>
          <Control onPress={() => setTaps([])}>Start again</Control>
        </Controls>
        <p className="mono" style={{ fontSize: 13, color: 'var(--ink-dim)', margin: 0 }}>
          {taps.length < 2
            ? `${taps.length} tap${taps.length === 1 ? '' : 's'} — keep going`
            : detected
              ? `${Math.round(detected)} beats per minute`
              : 'that was too fast or too slow to read — try again'}
        </p>
      </Try>

      <Say>
        That number is the <strong>tempo</strong>: how many beats fit into a minute. It is the
        one number every musician in a room has to agree on before anything else can happen.
      </Say>

      <Try caption="Your tempo, playing. The taller cells are the beats.">
        <StepGrid
          pattern={[laneFrom('kick', 'Kick', 16, [0, 4, 8, 12])]}
          bpm={bpm}
          editable={false}
        />
      </Try>

      <Caption>
        {bpm} bpm. Most pop sits between 90 and 130; dance music around 120 to 130; a ballad
        might be 70.
      </Caption>

      <Check
        id="what-is-bpm"
        ask="What does 120 bpm mean?"
        options={['120 beats in a minute', '120 notes in a bar', '120 bars in a minute']}
        answer={0}
        explain="Beats per minute — so 120 bpm is two beats a second, and one beat is half a second long. Every other duration in the piece is a fraction or multiple of that."
      />

      <Aside title="Why does tempo change how a piece feels so much?">
        <p>
          Partly because of what it does to everything else: at 60 bpm there is time to hear
          each note decay, and at 160 there is not, so the same notes become a texture rather
          than a sequence.
        </p>
        <p>
          And partly because of us. Resting heart rates sit around 60 to 100, walking pace
          around 100 to 120, and music in that range feels natural in a way that music at 40 or
          200 does not — those have to work harder to convince you they have a pulse at all.
        </p>
      </Aside>
    </Lesson>
  )
}
