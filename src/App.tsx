// The shell is phase 4. For now this is the placeholder that proves the pipeline: it renders,
// it builds, and it deploys. Everything real arrives under src/theory and src/audio first,
// because both are pure and neither needs a page to be correct.

export default function App() {
  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '18vh 24px' }}>
      <h1 style={{ fontSize: 44, margin: 0 }}>tuneup</h1>
      <p style={{ color: 'var(--ink-dim)', fontSize: 20, marginTop: 8 }}>
        Music theory you can play with.
      </p>
      <p style={{ color: 'var(--ink-dim)', marginTop: 32, fontSize: 15 }}>
        Under construction — the theory core and the synth come first.
      </p>
    </main>
  )
}
