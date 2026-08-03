import { useState } from 'react'
import { Aside, Caption, Check, Control, Controls, Headline, Lesson, Say, Try } from '../../ui/lesson/index.js'
import ChordPlayer from '../../widgets/ChordPlayer.tsx'
import { functionOf, key, roman } from '../../theory/index.js'

const FAMILIES = {
  tonic: { label: 'Home', members: ['I', 'iii', 'vi'], note: 'Settled. Where a phrase rests.' },
  subdominant: { label: 'Away', members: ['ii', 'IV'], note: 'Departed, but not tense. The middle of the journey.' },
  dominant: { label: 'Pull', members: ['V', 'vii°'], note: 'Unstable, and pointing straight back home.' },
} as const

const BASE = ['I', 'IV', 'V', 'I']

export default function ThreeJobs() {
  const [bars, setBars] = useState<string[]>(BASE)

  const swap = () => {
    // Swap each chord for a different member of the SAME family. The progression should still
    // work, which is the entire claim being made.
    setBars((current) =>
      current.map((numeral) => {
        const family = FAMILIES[functionOf(roman(numeral).degree)]
        const others = family.members.filter((m) => m !== numeral)
        return others[Math.floor(Math.random() * others.length)] ?? numeral
      }),
    )
  }

  return (
    <Lesson>
      <Headline>Three jobs</Headline>

      <Say>
        The seven chords of a key are not seven separate things. They fall into three families,
        and chords in the same family do the same job — which means you can swap one for
        another and the progression still works.
      </Say>

      <Try caption="Press play, then shuffle. Every chord is replaced by a different one doing the same job.">
        <ChordPlayer musicKey={key('C')} bars={bars} bpm={94} drums />
        <Controls>
          <Control onPress={swap}>Shuffle within families</Control>
          <Control onPress={() => setBars(BASE)}>Back to I–IV–V–I</Control>
        </Controls>
        <p className="mono" style={{ fontSize: 13, color: 'var(--ink-dim)', margin: 0 }}>
          {bars
            .map((numeral) => `${numeral} (${FAMILIES[functionOf(roman(numeral).degree)].label})`)
            .join('  ·  ')}
        </p>
      </Try>

      <Caption>
        Different chords, same three jobs in the same order — and it still sounds like a
        progression rather than a mistake.
      </Caption>

      <Say>
        Home, away, and the pull back. Almost every progression in Western music is some walk
        through those three, and knowing which family a chord belongs to tells you more about
        what it will do than knowing its name.
      </Say>

      <Check
        id="which-family"
        ask="Which chord does the same job as V?"
        options={['vii°', 'IV', 'vi']}
        answer={0}
        explain="Both are the pull back home — they share two notes and both contain the leading note, which is the note doing the pulling. IV is away and vi is home."
      />

      <Aside title="Why do chords in a family behave alike?">
        <p>
          Because they overlap. In C, the tonic chord is C E G and the vi chord is A C E — two
          notes in common out of three. Swap one for the other and most of the sound stays put,
          so the ear hears a shade of the same thing rather than a new destination.
        </p>
        <p>
          It also explains the interrupted cadence from the cadences lesson. V–vi works as a
          surprise precisely because vi is in the home family: it is unexpected and still an
          arrival, which is a far more interesting outcome than simply being wrong.
        </p>
      </Aside>
    </Lesson>
  )
}
