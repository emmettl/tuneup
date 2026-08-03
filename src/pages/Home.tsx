import { Link } from '../ui/Link.tsx'
import { LESSONS, lessonsInUnit, populatedUnits } from '../lessons/index.js'
import { loadProgress, statusOf } from '../progress.js'

export default function Home() {
  const progress = loadProgress()
  const resume = progress.last ? LESSONS.find((l) => l.slug === progress.last) : undefined

  return (
    <div className="page">
      <header className="page-head">
        <h1 className="page-title">tuneup</h1>
        <p className="page-lede">
          Music theory you can play with. Every example makes a sound, and every sound is
          synthesised in your browser — there are no recordings here.
        </p>
        <div className="page-actions">
          <Link to={{ name: 'lesson', slug: LESSONS[0]!.slug }} className="button is-primary">
            Start at the beginning
          </Link>
          {resume && resume.slug !== LESSONS[0]!.slug && (
            <Link to={{ name: 'lesson', slug: resume.slug }} className="button">
              Continue: {resume.title}
            </Link>
          )}
        </div>
      </header>

      {populatedUnits().map((unit) => (
        <section key={unit.id} className="unit">
          <h2 className="unit-title">{unit.title}</h2>
          <p className="unit-blurb">{unit.blurb}</p>
          <ul className="lesson-list">
            {lessonsInUnit(unit.id).map((lesson) => {
              const status = statusOf(progress, lesson.slug)
              return (
                <li key={lesson.slug}>
                  <Link to={{ name: 'lesson', slug: lesson.slug }} className="lesson-card">
                    <span className="lesson-card-title">
                      {lesson.title}
                      {/* Status is a word as well as a colour — a tick alone is invisible to
                          anyone who cannot see it, and meaningless to anyone who can but does
                          not know the convention. */}
                      {status !== 'untouched' && (
                        <span className={`lesson-chip is-${status}`}>{status}</span>
                      )}
                    </span>
                    <span className="lesson-card-summary">{lesson.summary}</span>
                    <span className="lesson-card-meta mono">{lesson.minutes} min</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
