import { useRoute } from './ui/useRoute.js'
import Home from './pages/Home.tsx'
import LessonPage from './pages/LessonPage.tsx'
import { Link } from './ui/Link.tsx'
import AudioStatus from './ui/AudioStatus.tsx'
import Settings from './ui/Settings.tsx'
import './ui/lesson/lesson.css'

export default function App() {
  const route = useRoute()

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <main id="main">
        {route.name === 'home' && <Home />}
        {route.name === 'lesson' && <LessonPage slug={route.slug} />}
        {(route.name === 'not-found' || route.name === 'curriculum' || route.name === 'sandbox') && (
          <div className="page">
            <h1 className="page-title">Nothing here</h1>
            <p className="page-lede">That address does not point at anything yet.</p>
            <Link to={{ name: 'home' }} className="button is-primary">
              See all lessons
            </Link>
          </div>
        )}
      </main>
      <footer className="site-footer">
        <Settings />
        <AudioStatus />
      </footer>
    </>
  )
}
