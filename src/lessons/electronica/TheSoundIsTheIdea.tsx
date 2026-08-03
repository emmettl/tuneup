import { useState } from 'react'
import { Aside, Caption, Check, Control, Controls, Headline, Lesson, Say, Try } from '../../ui/lesson/index.js'
import Timbre from '../../widgets/Timbre.tsx'
import { type TimbreSettings } from '../../audio/timbre.js'
import { midiOf, note } from '../../theory/index.js'

// Presets named by FEEL rather than by parameter. "Glass" tells a beginner what to expect;
// "sine, 6kHz, Q 1" tells them what the machine is doing, which is a different lesson and not
// this one. The parameters are on screen anyway, so the mapping is there to be noticed.
const PRESETS: { name: string; blurb: string; settings: Partial<TimbreSettings> }[] = [
  { name: 'Glass', blurb: 'Pure and thin. Almost no harmonics above the fundamental.', settings: { wave: 'sine', cutoff: 8000, resonance: 1, drive: 0, detune: 0 } },
  { name: 'Rubber', blurb: 'Rounded and soft — the top has been filtered away.', settings: { wave: 'triangle', cutoff: 900, resonance: 3, drive: 0, detune: 6 } },
  { name: 'Bark', blurb: 'Bright and rude. Every harmonic present, then pushed.', settings: { wave: 'sawtooth', cutoff: 4200, resonance: 6, drive: 0.5, detune: 12 } },
  { name: 'Breath', blurb: 'Hollow. A square with the odd harmonics only, opened up.', settings: { wave: 'square', cutoff: 2400, resonance: 11, drive: 0.1, detune: 3 } },
]

export default function TheSoundIsTheIdea() {
  const [preset, setPreset] = useState(0)
  const chosen = PRESETS[preset]!

  return (
    <Lesson>
      <Headline>The sound is the idea</Headline>

      <Say>
        Every lesson so far has been about which notes to play. In electronic music the notes
        are often the least interesting decision — a track can sit on one note for a minute and
        hold your attention entirely through what that note sounds like.
      </Say>

      <Try caption="One note, four completely different instruments. Hold it and switch between them.">
        <Timbre
          pitches={[midiOf(note('A2'))]}
          initial={chosen.settings}
          controls={['wave', 'cutoff', 'resonance', 'drive', 'detune']}
          key={preset}
        />
        <Controls>
          {PRESETS.map((entry, index) => (
            <Control key={entry.name} toggle active={index === preset} onPress={() => setPreset(index)}>
              {entry.name}
            </Control>
          ))}
        </Controls>
      </Try>

      <Caption>{chosen.blurb}</Caption>

      <Say>
        Four controls did all of that. The <strong>shape</strong> decides which harmonics exist,
        the <strong>cutoff</strong> decides how many of them you hear, <strong>resonance</strong>{' '}
        emphasises the ones right at the cutoff, and <strong>drive</strong> manufactures new ones.
        Watch the spectrum while you move each — every one of those claims is visible.
      </Say>

      <Check
        id="filter-does-what"
        ask="What does turning the cutoff down actually do?"
        options={[
          'Removes the higher harmonics, leaving the fundamental',
          'Makes the note lower in pitch',
          'Makes the note quieter overall',
        ]}
        answer={0}
        explain="The pitch never changes — the fundamental stays exactly where it was. Only the harmonics above the cutoff are removed, which the ear reads as darker rather than lower."
      />

      <Aside title="Why does a sine sound like nothing and a saw sound like everything?">
        <p>
          A sine wave is a single frequency with no harmonics at all, which is why it sounds
          hollow and slightly artificial — almost nothing in the physical world produces one.
        </p>
        <p>
          A sawtooth contains every harmonic, each quieter than the last. That is why it is the
          starting point for most synth sounds: a filter can only remove, so beginning with
          everything gives you the most to carve away. Square waves contain only the odd
          harmonics, which is what gives them their hollow, clarinet-ish character.
        </p>
      </Aside>
    </Lesson>
  )
}
