# tuneup

Music theory you can play with. Forty short lessons from "press something" to the blues,
rock and electronica — every example is playable, and every sound is synthesised in the
browser. There are no audio files in this repository.

**<https://emmettl.github.io/tuneup/>**

## Running it

```bash
npm install
npm run dev        # the site
npm test           # vitest
npm run lint       # oxlint
npm run typecheck  # tsc -b
npm run build      # dist/
```

## How it is put together

Three layers with one-way dependencies, enforced by `src/architecture.test.ts`:

| layer | may import | notes |
|---|---|---|
| `src/theory/` | only itself | Pure music theory. No DOM, no Web Audio, no React. |
| `src/audio/` | `theory/` | Web Audio. No React. |
| `src/ui/`, `src/widgets/`, `src/lessons/` | everything | React. |

The boundary is not tidiness. The theory core is where being wrong means teaching someone
something false, and it is exhaustively tested precisely because it is pure — no audio device,
no DOM, no async. One `document.` reference and a chunk of that becomes untestable.

### Notes are spelled, not numbered

A note is `(letter, alter, octave)` and MIDI is derived from it, never the reverse. A MIDI
integer cannot say whether 61 is C♯ or D♭, and key signatures, roman numerals, the staff
renderer and scale spelling all need that answer. It is the one decision in the project that
is not retrofittable.

The consequence shows up everywhere: `scale.ts` carries a `letters` array per scale rather
than deriving one letter per degree, because the blues scale has six notes over five letters
(C E♭ F G♭ G B♭ puts two of them on G) and deriving it produces a scale with no G natural.

### Timers never trigger sounds

`audio/timing.ts` and `audio/transport.ts` follow the standard lookahead pattern: timers decide
only *when to look ahead*, and every note is scheduled against the audio clock ahead of time.
The scheduler's heartbeat runs in a Worker, because background tabs clamp `setInterval` to
about a second — far longer than the lookahead window.

The UI reads `audio/sounding.ts`, which activates notes when the audio clock *reaches* them
rather than when they were scheduled. Highlighting at schedule time runs the lights up to a
full lookahead window ahead of the music, which is glaring at slow tempos.

### Colour means function

Each hue has exactly one musical meaning site-wide: amber is the root, pink the third, mint
the fifth, violet the seventh, cyan a note borrowed from outside the key, grey outside the
scale. State is carried by *brightness within* that hue, never by a different hue — a sounding
third is a brighter pink, not amber.

Anything drawn on a dark instrument panel uses `--panel-ink`, which does not flip with the
colour scheme. `--ink` does, and panels deliberately stay dark in light mode.

## Nothing here is sampled or quoted

Every sound is synthesised from oscillators, envelopes and filters. No recordings, no
melodies, no lyrics. Demonstration licks and riffs are original or public-domain idiom, and
progressions are described by function and feel rather than by song title — there is a test
enforcing the last of those. `theory/progression.ts` explains why.

## Licence

MIT.
