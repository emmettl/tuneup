import { Aside, Check, Headline, Lesson, Say, Try } from '../../ui/lesson/index.js'
import PitchClock from '../../widgets/PitchClock.tsx'
import Keyboard from '../../widgets/Keyboard.tsx'
import { key } from '../../theory/index.js'

export default function SevenFromTwelve() {
  const c = key('C')

  return (
    <Lesson>
      <Headline>Seven from twelve</Headline>

      <Say>
        Twelve notes is too many to write a tune with. Almost all music picks seven and mostly
        stays there. Which seven is the only decision that matters.
      </Say>

      <Try caption="The twelve notes as a clock face. The lit ones are the major scale; tap any of them.">
        <PitchClock scale={{ key: c, id: 'major' }} labels="note" />
      </Try>

      <Say>
        Look at the gaps. Most steps skip a segment — a whole tone — but two of them are
        single steps: between the third and fourth notes, and between the seventh and the
        octave. That lopsided pattern <span className="mono">T T S T T T S</span> is the major
        scale. It is not a list of notes; it is a shape.
      </Say>

      <Try caption="The same seven notes on a keyboard. In C they are the white keys — which is a coincidence of C, not a rule.">
        <Keyboard range={[60, 84]} scale={{ key: c, id: 'major' }} labels="degree" keys />
      </Try>

      <Check
        id="half-steps"
        ask="Where are the two small steps in a major scale?"
        options={['Between 3–4 and 7–8', 'Between 1–2 and 5–6', 'Between 2–3 and 6–7']}
        answer={0}
        explain="Third to fourth, and seventh to octave. That seventh-to-eighth squeeze is why the scale sounds like it is arriving when it reaches the top."
      />

      <Aside title="Why seven, and why this shape?">
        <p>
          Stack seven perfect fifths from any note, drop them all into one octave, and you get
          exactly this scale. That is not a coincidence — the fifth is the most consonant
          interval after the octave, so a scale built from a chain of them is a scale built
          from the most stable relationships available.
        </p>
        <p>
          The lopsidedness is the useful part. A scale of even steps has no landmarks, so
          every note sounds equally like home and none of them sounds like arriving. The two
          small steps are what give the other five somewhere to point.
        </p>
      </Aside>
    </Lesson>
  )
}
