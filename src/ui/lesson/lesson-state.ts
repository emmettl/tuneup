import { createContext, useContext } from 'react'

// The lesson context lives here rather than in Lesson.tsx so that file exports only
// components. A module exporting both a component and a hook breaks React fast refresh, which
// oxlint's `react/only-export-components` rule flags — and losing fast refresh while authoring
// fifty lessons is a real cost, not a lint nicety.

export interface LessonState {
  /** Called the first time the learner touches anything. Drives "explored" in progress. */
  markExplored: () => void
  registerCheck: (id: string) => void
  answerCheck: (id: string, correct: boolean) => void
  checks: Record<string, boolean>
}

export const LessonContext = createContext<LessonState | null>(null)

export function useLessonState(): LessonState {
  const state = useContext(LessonContext)
  if (!state) {
    // A <Try> or <Check> rendered outside a <Lesson> would silently record nothing, and the
    // lesson would never complete with no clue why.
    throw new Error('lesson primitives must be used inside <Lesson>')
  }
  return state
}
