# Agility Trainer — Solo Exercise App (MVP)

## Context and motivation

Build the simplest possible mobile-friendly web app that guides a solo user
through a continuous sequence of randomised physical agility exercises.
No equipment, no partner, minimal floor space required.

---

## What the app does

The app generates a continuous, randomised sequence of movement instructions
and displays (or announces) each one at a configurable pace. The user simply
follows along in real time.

---

## Exercise pool

The app draws from the following movement categories. Start with at least
two or three exercises per category; the pool can be extended later.

**Arms**
Swing arms forward and back, lateral arm raises, alternating punches
forward, cross-body arm swings, circles clockwise, circles counter-clockwise

**Shoulders**
Roll shoulders forward, roll shoulders back, single-arm circle left,
single-arm circle right, shrug and release

**Jumps**
Jump in place, quarter-turn jump left, quarter-turn jump right,
half-turn jump, jumping jacks

**Knees**
High knees in place, knee circles left leg, knee circles right leg,
alternating knee lifts, squat pulse

**Full-body / balance**
Torso twist left, torso twist right, side step left and right,
heel-to-toe walk in place, single-leg stand left, single-leg stand right

---

## Core behaviour

1. User presses **Start**.
2. The app picks a random exercise from the pool and displays it clearly —
   large text, optionally a simple icon or illustration.
3. After a configurable hold duration the app advances to the next random
   exercise, with a brief audio or visual cue marking the transition.
4. The sequence continues indefinitely until the user presses **Pause** or
   **Stop**.
5. The same exercise should not repeat twice in a row.

---

## Configurable parameters (accessible before starting)

- **Pace** — duration per exercise in seconds (range: 2 s to 15 s,
  default: 5 s)
- **Session length** — total number of exercises before auto-stop, or
  unlimited (default: unlimited)
- **Categories enabled** — toggle each movement category on or off so the
  user can focus on a subset

---

## MVP scope

- Single-page web app; runs entirely in the browser, no backend, no
  account, no installation
- Works on a phone held in portrait mode — large readable text is the
  primary UI requirement
- Audio cue on each transition (a short beep is sufficient; use the
  Web Audio API, no external sound files)
- Responsive layout that also works on desktop
- No video, no motion capture, no wearables — text instructions only
  for the initial version

---

## Stack

React or plain HTML/CSS/JS — whichever produces a working result faster.
No framework required if vanilla JS is cleaner. No external dependencies
beyond what ships with the browser.

---

## Out of scope for MVP

User accounts, progress tracking, custom exercise creation, social sharing,
camera-based pose detection, or any form of persistence beyond
`localStorage` for saving the last-used settings.

Additions:
- dogde box like excercises
- language (initial version) English or Italian
- voice (synth native browser voice if possible)
