import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react'
import { Link } from '../ui/Link.tsx'
import { Lesson } from '../ui/lesson/Lesson.tsx'
import {
  lessonBySlug,
  nextLesson,
  previousLesson,
  type LessonMeta,
} from '../lessons/index.js'
import {
  loadProgress,
  markCheck,
  markExplored,
  markVisited,
  saveProgress,
} from '../progress.js'
import { player } from '../audio/player.js'

export default function LessonPage({ slug }: { slug: string }) {
  const meta = lessonBySlug(slug)
  if (!meta) return <NotFound slug={slug} />
  // Keyed on the slug so moving between lessons remounts rather than reusing state — a stale
  // "explored" flag or a leftover answer bleeding into the next lesson would be baffling.
  return <LoadedLesson key={meta.slug} meta={meta} />
}

function LoadedLesson({ meta }: { meta: LessonMeta }) {
  const Body = useMemo(() => lazy(meta.load), [meta])
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    saveProgress(markVisited(loadProgress(), meta.slug))
    window.scrollTo(0, 0)
    // Every lesson makes sound, and leaving the previous one's notes ringing under the next
    // one is disorienting in a way that reads as a bug.
    return () => player().allOff()
  }, [meta.slug])

  const previous = previousLesson(meta.slug)
  const next = nextLesson(meta.slug)

  return (
    <article className="page">
      <nav className="lesson-breadcrumb">
        <Link to={{ name: 'home' }}>← All lessons</Link>
      </nav>

      {meta.after && meta.after.length > 0 && (
        <p className="lesson-builds">
          Builds on{' '}
          {meta.after.map((slug, index) => {
            const source = lessonBySlug(slug)
            if (!source) return null
            return (
              <span key={slug}>
                {index > 0 && ', '}
                {/* A hint, never a lock. Someone arriving here from a shared link must be
                    able to play the lesson without being sent away first. */}
                <Link to={{ name: 'lesson', slug }}>{source.title}</Link>
              </span>
            )
          })}
          . You can read it anyway.
        </p>
      )}

      {failed ? (
        <p className="lesson-say">
          This lesson failed to load. <button type="button" className="button" onClick={() => location.reload()}>Reload</button>
        </p>
      ) : (
        <Suspense fallback={<p className="lesson-loading mono">loading…</p>}>
          <Lesson
            onExplored={() => saveProgress(markExplored(loadProgress(), meta.slug))}
            onCheckAnswered={(id, correct) =>
              saveProgress(markCheck(loadProgress(), meta.slug, id, correct))
            }
          >
            <ErrorBoundary onError={() => setFailed(true)}>
              <Body />
            </ErrorBoundary>
          </Lesson>
        </Suspense>
      )}

      <nav className="lesson-nav">
        {previous ? (
          <Link to={{ name: 'lesson', slug: previous.slug }} className="button">
            ← {previous.title}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link to={{ name: 'lesson', slug: next.slug }} className="button is-primary">
            {next.title} →
          </Link>
        )}
      </nav>
    </article>
  )
}

function NotFound({ slug }: { slug: string }) {
  return (
    <div className="page">
      <h1 className="page-title">No such lesson</h1>
      <p className="page-lede">
        Nothing here is called <span className="mono">{slug}</span>. It may have been renamed.
      </p>
      <Link to={{ name: 'home' }} className="button is-primary">
        See all lessons
      </Link>
    </div>
  )
}

// A lazily imported lesson that throws takes the whole app down with it, and a blank page is
// the least debuggable outcome there is. React has no hook form of this, so it stays a class.
class ErrorBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { crashed: boolean }
> {
  state = { crashed: false }

  static getDerivedStateFromError() {
    return { crashed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('lesson crashed', error, info)
    this.props.onError()
  }

  render() {
    return this.state.crashed ? null : this.props.children
  }
}
