import { useEffect, useRef, useState } from 'react'
import { audioContext } from '../audio/context.js'
import { DEFAULT_TIMBRE, TimbreVoice, type TimbreSettings, type Wave } from '../audio/timbre.js'
import './Timbre.css'

// The sound lab.
//
// A held note plus knobs, and a spectrum so the change can be seen as well as heard. The
// spectrum is not decoration: the whole claim of the distortion lesson is that drive ADDS
// harmonics, and "adds harmonics" is an abstraction until you watch new spikes appear.

export interface TimbreProps {
  /** What to hold. A single note, or a chord for the power-chord lesson. */
  pitches: number[]
  /** Which controls to show. Omitting a control also removes it from the sound's variables,
   *  which is how a lesson keeps one idea at a time in play. */
  controls?: (keyof TimbreSettings)[]
  initial?: Partial<TimbreSettings>
  spectrum?: boolean
  onChange?: (settings: TimbreSettings) => void
}

const WAVES: Wave[] = ['sine', 'triangle', 'sawtooth', 'square']

export default function Timbre({
  pitches,
  controls = ['wave', 'cutoff', 'resonance', 'drive'],
  initial,
  spectrum = true,
  onChange,
}: TimbreProps) {
  const [settings, setSettings] = useState<TimbreSettings>({ ...DEFAULT_TIMBRE, ...initial })
  const [holding, setHolding] = useState(false)
  const voice = useRef<TimbreVoice | null>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const analyser = useRef<AnalyserNode | null>(null)

  useEffect(() => {
    return () => {
      voice.current?.dispose()
      voice.current = null
    }
  }, [])

  const ensure = (): TimbreVoice => {
    if (!voice.current) {
      voice.current = new TimbreVoice(settings)
      if (spectrum) {
        const node = audioContext().createAnalyser()
        node.fftSize = 2048
        node.smoothingTimeConstant = 0.75
        voice.current.connectAnalyser(node)
        analyser.current = node
      }
    }
    return voice.current
  }

  const toggle = () => {
    const v = ensure()
    if (holding) {
      v.stop()
      setHolding(false)
    } else {
      v.play(pitches)
      setHolding(true)
    }
  }

  // Re-pitch a sounding note when the lesson changes what it should be playing — the
  // power-chord lesson removes the third while the note is held, and stopping to restart
  // would destroy the comparison.
  useEffect(() => {
    if (holding && voice.current) voice.current.play(pitches)
  }, [pitches, holding])

  const change = (patch: Partial<TimbreSettings>) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    voice.current?.update(patch)
    onChange?.(next)
  }

  useEffect(() => {
    if (!spectrum || !holding) return
    let frame = 0
    const draw = () => {
      frame = requestAnimationFrame(draw)
      const node = analyser.current
      const surface = canvas.current
      if (!node || !surface) return
      const context = surface.getContext('2d')
      if (!context) return

      const bins = new Uint8Array(node.frequencyBinCount)
      node.getByteFrequencyData(bins)
      const { width, height } = surface
      context.clearRect(0, 0, width, height)

      // Only the bottom eighth of the spectrum: everything musical lives below ~5kHz at these
      // pitches, and drawing the empty top half makes the interesting part unreadably narrow.
      const shown = Math.floor(bins.length / 8)
      context.fillStyle = '#ff7ad9'
      for (let index = 0; index < shown; index++) {
        const value = bins[index]! / 255
        const x = (index / shown) * width
        const barHeight = value * height
        context.fillRect(x, height - barHeight, Math.max(1, width / shown - 1), barHeight)
      }
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [spectrum, holding])

  return (
    <div className="timbre">
      {spectrum && (
        <canvas
          ref={canvas}
          className="timbre-spectrum"
          width={600}
          height={110}
          role="img"
          aria-label={
            holding
              ? `Spectrum of the held note. Drive ${Math.round(settings.drive * 100)} per cent, cutoff ${Math.round(settings.cutoff)} hertz.`
              : 'Spectrum display, silent'
          }
        />
      )}

      <div className="timbre-controls">
        <button type="button" className={`control ${holding ? 'is-on' : ''}`} onPointerDown={toggle}>
          {holding ? 'Stop' : 'Hold the note'}
        </button>

        {controls.includes('wave') && (
          <label className="timbre-field">
            <span className="timbre-label mono">shape</span>
            <select
              value={settings.wave}
              onChange={(event) => change({ wave: event.target.value as Wave })}
            >
              {WAVES.map((wave) => (
                <option key={wave} value={wave}>
                  {wave}
                </option>
              ))}
            </select>
          </label>
        )}

        {controls.includes('cutoff') && (
          <Slider
            label="cutoff"
            min={120}
            max={9000}
            step={20}
            value={settings.cutoff}
            format={(v) => `${Math.round(v)} Hz`}
            onChange={(cutoff) => change({ cutoff })}
          />
        )}

        {controls.includes('resonance') && (
          <Slider
            label="resonance"
            min={0.5}
            max={18}
            step={0.5}
            value={settings.resonance}
            format={(v) => v.toFixed(1)}
            onChange={(resonance) => change({ resonance })}
          />
        )}

        {controls.includes('drive') && (
          <Slider
            label="drive"
            min={0}
            max={1}
            step={0.02}
            value={settings.drive}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(drive) => change({ drive })}
          />
        )}

        {controls.includes('detune') && (
          <Slider
            label="detune"
            min={0}
            max={30}
            step={1}
            value={settings.detune}
            format={(v) => `${Math.round(v)} cents`}
            onChange={(detune) => change({ detune })}
          />
        )}
      </div>
    </div>
  )
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  format,
  onChange,
}: {
  label: string
  min: number
  max: number
  step: number
  value: number
  format: (value: number) => string
  onChange: (value: number) => void
}) {
  return (
    <label className="timbre-field">
      <span className="timbre-label mono">
        {label} <span className="timbre-value">{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        // A native range input, deliberately: it is keyboard-operable, screen-reader
        // announced and touch-friendly for free, and a hand-rolled knob would have to
        // reimplement all three to look slightly better.
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}
