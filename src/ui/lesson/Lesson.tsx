import { useMemo, useState, type ReactNode } from 'react'
import { LessonContext, useLessonState, type LessonState } from './lesson-state.js'

// The vocabulary lessons are written in.
//
// Two rules the brief turns on, and both are enforced here rather than left to discipline:
//
//   ONE LESSON, ONE "DO". If a lesson has two interactions it is two lessons.
//   NO CLAIM WITHOUT A CONTROL. If the prose asserts a difference, there is a toggle within
//   arm's reach that produces it. If we cannot build the toggle, we cut the claim.
//
// The prose budget is part of the component API rather than a style note: <Say> is capped,
// and anything longer belongs in <Aside>, which is collapsed. Beginners never open it and
// hobbyists always do, which is how one site serves both without patronising either.

export interface LessonProps {
  children: ReactNode
  onExplored?: () => void
  onCheckAnswered?: (id: string, correct: boolean) => void
}

export function Lesson({ children, onExplored, onCheckAnswered }: LessonProps) {
  const [checks, setChecks] = useState<Record<string, boolean>>({})
  const [explored, setExplored] = useState(false)

  const value = useMemo<LessonState>(
    () => ({
      markExplored: () => {
        if (explored) return
        setExplored(true)
        onExplored?.()
      },
      registerCheck: (id) =>
        setChecks((current) => (id in current ? current : { ...current, [id]: false })),
      answerCheck: (id, correct) => {
        setChecks((current) => ({ ...current, [id]: correct || current[id] === true }))
        onCheckAnswered?.(id, correct)
      },
      checks,
    }),
    [checks, explored, onExplored, onCheckAnswered],
  )

  return (
    <LessonContext.Provider value={value}>
      <div className="lesson">{children}</div>
    </LessonContext.Provider>
  )
}

/**
 * A sentence or two. The prose.
 *
 * Deliberately not a general-purpose text block: the whole brief is "nothing text-heavy", and
 * a component that will happily render six paragraphs is an invitation to write six.
 */
export function Say({ children }: { children: ReactNode }) {
  return <p className="lesson-say">{children}</p>
}

/** The headline. One short line, and it is a title rather than a sentence. */
export function Headline({ children }: { children: ReactNode }) {
  return <h2 className="lesson-headline">{children}</h2>
}

/**
 * The thing the learner does.
 *
 * Wrapping the interaction is what lets the shell know a lesson was actually played with
 * rather than scrolled past, without every widget having to report it. `caption` is the label
 * on the control, not an explanation of it — if the widget needs explaining, it is the wrong
 * widget.
 */
export function Try({ caption, children }: { caption?: string; children: ReactNode }) {
  const { markExplored } = useLessonState()
  return (
    <figure
      className="lesson-try"
      onPointerDownCapture={markExplored}
      onKeyDownCapture={markExplored}
    >
      <div className="lesson-try-body">{children}</div>
      {caption && <figcaption className="lesson-caption">{caption}</figcaption>}
    </figure>
  )
}

/**
 * A short note anchored to part of the widget above it.
 *
 * Capped at a sentence by convention — it is a label, not a paragraph.
 */
export function Caption({ children }: { children: ReactNode }) {
  return <p className="lesson-caption">{children}</p>
}

/**
 * The rigour, collapsed.
 *
 * Every exception, every piece of terminology, every "actually, in jazz…" goes here.
 * Beginners never open it; hobbyists always do. This is the mechanism that lets the main
 * thread of a lesson stay four sentences long without the site being wrong.
 */
export function Aside({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="lesson-aside">
      <summary>{title}</summary>
      <div className="lesson-aside-body">{children}</div>
    </details>
  )
}
