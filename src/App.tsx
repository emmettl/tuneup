// The scratch page.
//
// This is phase 2's "stop and listen" bench, not the app. The real shell — router, lesson
// registry, nav — arrives in phase 4 and replaces this file entirely. It exists because the
// whole product rests on a from-scratch instrument being pleasant to play, and that is worth
// finding out before anything is built on top of it.

import { useEffect, useState } from 'react'
import { INSTRUMENT_IDS, PATCHES, player, type InstrumentId } from './audio/index.js'
import { DRUM_IDS, DRUM_NAMES } from './audio/instruments/kit.js'
import { probe, type ProbeReport } from './audio/probe.js'
import { key, midiOf, note, progressionById, progressionChords, scalePitches } from './theory/index.js'
import { voiceProgression } from './theory/voicing.js'
import Keyboard from './widgets/Keyboard.tsx'
import AudioStatus from './ui/AudioStatus.tsx'
import { scaleNotes } from './theory/scale.js'
import { chordNotes, chord as parseChordText } from './theory/chord.js'
import { callOut, chordHighlights } from './widgets/highlight.js'

export default function App() {
  const [instrument, setInstrument] = useState<InstrumentId>('rhodes')
  const [report, setReport] = useState<ProbeReport | null>(null)
  const [measuring, setMeasuring] = useState(false)

  useEffect(() => {
    player().instrument = instrument
  }, [instrument])

  const play = (action: () => void) => () => {
    player().prepare()
    action()
  }

  const scale = () =>
    player().sequence(scalePitches(midiOf(note('C4')), 'major', 1), { noteSeconds: 0.16 })

  const triad = () => player().chord([60, 64, 67], { duration: 1.6 })
  const seventh = () => player().chord([60, 64, 67, 71], { duration: 1.6 })

  // Both of these lay out chords against ONE origin read from the audio clock. Scheduling
  // each chord with no `at` plays them all immediately — four chords stacked into one crash,
  // which is exactly what the first version of this page did.
  const progression = (id: string, inKey: string, barSeconds: number, bars?: number) => () => {
    const p = progressionById(id)!
    const voicings = voiceProgression(progressionChords(p, key(inKey)), 60)
    const origin = player().now()
    voicings.slice(0, bars ?? voicings.length).forEach((voicing, index) => {
      player().chord(voicing, { at: origin + index * barSeconds, duration: barSeconds * 0.92 })
    })
  }

  const groove = () => {
    // Four on the floor, to hear the kit in time rather than one hit at a time.
    const origin = player().now()
    const step = 60 / 110 / 4
    for (let index = 0; index < 32; index++) {
      const at = origin + index * step
      if (index % 4 === 0) player().drum('kick', { at })
      if (index % 8 === 4) player().drum('clap', { at })
      if (index % 2 === 1) player().drum('hat', { at, velocity: index % 4 === 1 ? 0.7 : 0.45 })
    }
  }

  // Deliberately slow. At 130bpm a highlight driven by the SCHEDULER rather than by the audio
  // clock looks almost right; at 50bpm it runs a visible fraction of a beat ahead of the
  // sound, which is the whole reason sounding.ts works the way it does.
  const slowArpeggio = (root: number) => {
    const origin = player().now()
    const step = 60 / 50
    ;[0, 4, 7, 12, 7, 4].forEach((semitones, index) => {
      player().play(root + semitones, { at: origin + index * step, duration: step * 0.9 })
    })
  }

  const runProbe = async () => {
    setMeasuring(true)
    setReport(await probe())
    setMeasuring(false)
  }

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '8vh 24px 12vh' }}>
      <h1 style={{ fontSize: 40, margin: 0 }}>tuneup</h1>
      <p style={{ color: 'var(--ink-dim)', marginTop: 4 }}>
        Scratch bench — phase 2. Does the synth sound like an instrument?
      </p>

      <Section title="Sound check">
        <AudioStatus />
      </Section>

      <Section title="Instrument">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {INSTRUMENT_IDS.map((id) => (
            <button
              key={id}
              onPointerDown={() => setInstrument(id)}
              style={chip(id === instrument)}
              title={PATCHES[id].blurb}
            >
              {PATCHES[id].name}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Play">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button style={chip(false)} onPointerDown={play(scale)}>C major scale</button>
          <button style={chip(false)} onPointerDown={play(triad)}>C major triad</button>
          <button style={chip(false)} onPointerDown={play(seventh)}>Cmaj7</button>
          <button style={chip(false)} onPointerDown={play(progression('pop-four', 'C', 0.9))}>
            I–V–vi–IV
          </button>
          <button style={chip(false)} onPointerDown={play(progression('twelve-bar', 'E', 0.75, 6))}>
            Blues in E
          </button>
          <button style={chip(false)} onPointerDown={play(progression('house-pads', 'A minor', 1.6))}>
            House pads
          </button>
          <button style={chip(false)} onPointerDown={play(() => player().chord([48, 55, 64, 67, 72]))}>
            Wide voicing
          </button>
        </div>
      </Section>

      <Section title="Keyboard">
        <Keyboard range={[60, 84]} scale={{ key: key('C'), id: 'major' }} labels="note" keys />
        <p style={{ color: 'var(--ink-dim)', fontSize: 13, marginTop: 8 }}>
          Click, drag across for a glissando, or use the computer keyboard (home row = white
          keys). Coloured by scale degree: amber root, pink third, mint fifth.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          <button style={chip(false)} onPointerDown={play(() => slowArpeggio(60))}>
            Slow arpeggio at 50bpm (check the lights track the sound)
          </button>
        </div>
      </Section>

      <Section title="Chord highlight">
        <Keyboard
          range={[60, 84]}
          highlight={chordHighlights(chordNotes(parseChordText('Cmaj7')))}
          labels="note"
          height={120}
        />
      </Section>

      <Section title="The blues scale, with the blue note called out">
        <Keyboard
          range={[57, 81]}
          scale={{ key: key('A minor'), id: 'blues' }}
          highlight={[callOut(scaleNotes(note('A'), 'blues')[3]!, 'blue')]}
          labels="note"
          height={120}
        />
      </Section>

      <Section title="Drums">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {DRUM_IDS.map((id) => (
            <button key={id} style={chip(false)} onPointerDown={play(() => player().drum(id))}>
              {DRUM_NAMES[id]}
            </button>
          ))}
          <button style={chip(false)} onPointerDown={play(groove)}>Four on the floor</button>
        </div>
      </Section>

      <Section title="Measure">
        <button style={chip(false)} onPointerDown={() => void runProbe()} disabled={measuring}>
          {measuring ? 'Rendering…' : 'Render every voice offline and measure'}
        </button>
        {report && (
          <pre
            style={{
              marginTop: 12,
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              lineHeight: 1.6,
              background: 'var(--panel)',
              color: 'var(--ink)',
              padding: 14,
              borderRadius: 10,
              overflowX: 'auto',
            }}
          >
            {[...report.instruments, ...report.drums]
              .map(
                (m) =>
                  `${m.id.padEnd(9)} peak ${m.peak.toFixed(3)}  rms ${m.rms.toFixed(4)}  tail ${m.tail.toFixed(2)}s`,
              )
              .join('\n')}
            {`\n\nspread ${report.spread.toFixed(1)}x`}
            {report.problems.length ? `\n\n${report.problems.join('\n')}` : '\n\nno problems'}
          </pre>
        )}
      </Section>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-dim)' }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

function chip(active: boolean): React.CSSProperties {
  return {
    font: 'inherit',
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    padding: '8px 12px',
    borderRadius: 8,
    cursor: 'pointer',
    background: active ? 'var(--root)' : 'var(--panel)',
    color: active ? '#1b1430' : 'var(--ink)',
    border: `1px solid ${active ? 'var(--root)' : 'var(--panel-edge)'}`,
    touchAction: 'none',
    userSelect: 'none',
  }
}
