import { useState } from 'react'
import { Aside, Caption, Check, Control, Controls, Headline, Lesson, Say, Try } from '../../ui/lesson/index.js'
import ChordPlayer from '../../widgets/ChordPlayer.tsx'
import { identifyTwelveBar, key, twelveBar } from '../../theory/index.js'

export default function TwelveBars() {
  const [bars, setBars] = useState<string[]>(twelveBar('quick-change'))
  const variant = identifyTwelveBar(bars)

  return (
    <Lesson>
      <Headline>Twelve bars</Headline>

      <Say>
        The blues is a fixed shape: twelve bars, three chords, and everyone in the room knows
        where it goes next. That shared knowledge is what lets strangers play together without
        rehearsing.
      </Say>

      <Try caption="Press play. Then change any bar — the app will tell you which version you have made.">
        <ChordPlayer
          musicKey={key('E')}
          bars={bars}
          onBarsChange={setBars}
          editable={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]}
          palette={['I7', 'IV7', 'V7']}
          bpm={88}
          drums
        />
        <Controls>
          <Control onPress={() => setBars(twelveBar('basic'))}>The plain one</Control>
          <Control onPress={() => setBars(twelveBar('quick-change'))}>Quick change</Control>
          <Control onPress={() => setBars(twelveBar('turnaround'))}>With a turnaround</Control>
        </Controls>
      </Try>

      <Caption>
        {variant === 'quick-change'
          ? 'Quick change: the IV arrives early, in bar two. By far the commonest shape.'
          : variant === 'basic'
            ? 'The plain form: four whole bars of home before it goes anywhere.'
            : variant === 'turnaround'
              ? 'A turnaround: the last bar goes to V, so the form pulls round into itself instead of stopping.'
              : 'Not a standard shape — which is fine. Every one of these was somebody deviating first.'}
      </Caption>

      <Say>
        The bars that never move are 5 and 9: the IV arrives at bar five and the V at bar nine,
        every time. Everything else is negotiable, and the negotiations are what the different
        versions are.
      </Say>

      <Check
        id="bar-nine"
        ask="What is happening in bar 9 of a twelve-bar blues?"
        options={['The V chord arrives', 'It returns home to I', 'The IV chord arrives']}
        answer={0}
        explain="Bar 9 is the V, bar 10 drops back to IV, and bars 11 and 12 come home. That descent is the part everyone is listening for."
      />

      <Aside title="Why is every chord a seventh?">
        <p>
          In ordinary harmony only one chord in a key is a dominant seventh, and it is unstable
          on purpose — it exists to pull you home. The blues makes all three chords dominant
          sevenths, which by the rules of the previous chapter should be chaos.
        </p>
        <p>
          It works because nothing is trying to resolve. Every chord is equally restless, so
          none of them is a departure from anywhere — the tension stops being a journey and
          becomes the texture. That is a genuinely different idea about what harmony is for.
        </p>
      </Aside>
    </Lesson>
  )
}
