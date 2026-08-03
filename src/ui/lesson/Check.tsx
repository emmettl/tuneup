import { useEffect, useId, useState } from 'react'
import { useLessonState } from './lesson-state.js'

// A question, with the emphasis on "answer it and find out" rather than on being marked.
//
// Nothing is failed here. A wrong answer shows the explanation and leaves every option live,
// because the point is that the learner ends up understanding it — not that the app has a
// record of how many goes it took. There is no score anywhere in this project, and this is
// the component where that decision would most easily leak.

export interface CheckProps {
  /** Stable within the lesson. Progress is stored against it. */
  id: string
  ask: string
  options: string[]
  /** Index into `options`. */
  answer: number
  /** Shown once answered, right or wrong. The actual teaching. */
  explain: string
}

export function Check({ id, ask, options, answer, explain }: CheckProps) {
  const { registerCheck, answerCheck } = useLessonState()
  const [chosen, setChosen] = useState<number | null>(null)
  const groupId = useId()

  useEffect(() => registerCheck(id), [id, registerCheck])

  const correct = chosen === answer

  return (
    <section className="lesson-check" aria-labelledby={groupId}>
      <p className="lesson-check-ask" id={groupId}>
        {ask}
      </p>
      <div className="lesson-check-options" role="group" aria-labelledby={groupId}>
        {options.map((option, index) => {
          const picked = chosen === index
          const state = chosen === null ? '' : index === answer ? 'is-right' : picked ? 'is-wrong' : ''
          return (
            <button
              key={option}
              type="button"
              className={`lesson-check-option ${state}`}
              // Never disabled after answering. A learner who got it wrong should be able to
              // press the right one and feel it, rather than being locked out of the thing
              // they just learned.
              aria-pressed={picked}
              onClick={() => {
                setChosen(index)
                answerCheck(id, index === answer)
              }}
            >
              {option}
            </button>
          )
        })}
      </div>
      {chosen !== null && (
        // Polite rather than assertive: it must not interrupt a screen reader mid-sentence,
        // and it must be announced, because the colour alone carries the result otherwise.
        <p className="lesson-check-explain" role="status">
          <strong>{correct ? 'Yes. ' : 'Not quite. '}</strong>
          {explain}
        </p>
      )}
    </section>
  )
}
