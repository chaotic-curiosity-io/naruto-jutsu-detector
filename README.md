# 忍術 Naruto Hand Sign Jutsu Detector

A real-time webcam-based hand sign detection system that recognizes the 12 Naruto hand signs and triggers visual jutsu effects when you perform the correct sign sequences.

![Ninja Theme](https://img.shields.io/badge/theme-ninja-red) ![MediaPipe](https://img.shields.io/badge/powered%20by-MediaPipe-blue) ![No Build](https://img.shields.io/badge/build-none%20needed-green)

## Features

- **Real-time hand tracking** using MediaPipe Hands (21 landmarks per hand)
- **12 Naruto hand sign recognition**: Tiger, Snake, Ram, Monkey, Boar, Horse, Bird, Dog, Dragon, Ox, Hare, Rat
- **4 jutsu sequences** with visual effects:
  - 🔥 **Fireball Jutsu** (Katon: Gōkakyū no Jutsu) — Snake → Ram → Monkey → Boar → Horse → Tiger
  - ⚡ **Chidori** — Ox → Hare → Monkey
  - 👥 **Shadow Clone Jutsu** (Kage Bunshin no Jutsu) — Ram → Snake → Tiger
  - 🌊 **Water Dragon Jutsu** (Suiton: Suiryūdan no Jutsu) — Ox → Monkey → Hare → Rat → Boar → Bird
- **Particle-based visual effects** with physics, glow, and smooth 60fps animations
- **Dark ninja-themed UI** with confidence indicators and sequence progress
- **Debug mode** showing landmark data and classification scores

## Quick Start

1. Open `index.html` in a modern browser (Chrome, Edge, Firefox)
2. Click "Activate Sharingan" to start
3. Allow camera access when prompted
4. Perform hand signs in front of your webcam!

**No build step required** — just open the HTML file directly.

## Hand Signs (Single-Hand Approximations)

Since the original Naruto signs use two hands, each sign is mapped to a distinctive single-hand gesture:

| Sign | Gesture | Description |
|------|---------|-------------|
| 🐅 Tiger | ✌️ Peace sign (fingers touching) | Index + middle extended together, ring + pinky curled |
| 🐍 Snake | ✊ Fist | All fingers tightly curled into fist |
| 🐏 Ram | ✌️ Peace sign (fingers spread) | Index + middle extended and spread apart |
| 🐒 Monkey | 🖐️ Flat hand (thumb tucked) | All fingers extended, thumb tucked in |
| 🐗 Boar | 🖐️ Open hand (spread) | All fingers + thumb extended and spread |
| 🐴 Horse | ☝️ Pointing up | Only index finger extended, thumb out |
| 🐦 Bird | 🤙 Ring+pinky out | Ring + pinky extended, index + middle curled |
| 🐕 Dog | ✋ Karate chop | All fingers extended, close together |
| 🐉 Dragon | Index + partial curl | Index extended, middle/ring partially bent |
| 🐂 Ox | 🤘 Horns | Index + pinky extended, middle + ring curled |
| 🐇 Hare | 🤙 Pinky only | Only pinky extended |
| 🐀 Rat | 👍 Thumbs up | Thumb up, all fingers curled |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `D` | Toggle debug panel |
| `J` | Toggle jutsu reference panel |
| `R` | Reset current sequence |
| `1` | Test Fireball effect |
| `2` | Test Chidori effect |
| `3` | Test Shadow Clone effect |
| `4` | Test Water Dragon effect |

## File Structure

```
naruto-jutsu-app/
├── index.html          # Main app entry point
├── style.css           # Ninja-themed styling
├── app.js              # Main app logic, MediaPipe setup, UI management
├── hand-signs.js       # Hand sign classification using landmark geometry
├── jutsu-detector.js   # Jutsu sequence detection and matching
├── effects.js          # Particle-based visual effects engine
└── README.md           # This file
```

## Technical Details

### Hand Sign Classification

Signs are classified using:
- **Finger curl ratios** — how bent each finger is (0 = straight, 1 = fully curled)
- **Inter-finger distances** — spread between adjacent fingertips
- **Thumb position** — relative to palm center and other fingers
- **Joint angles** — at PIP joints for precise bend detection
- **Composite features** — "horns shape", "all curled", "all extended", etc.

Each sign has a scoring function that evaluates these features. The sign with the highest score above the confidence threshold (45%) is selected. A sign must be held for 8 consecutive frames before being registered.

### Sequence Detection

- Signs must be performed in exact order
- Same sign can't be registered twice consecutively
- 5-second timeout between signs resets the sequence
- Multiple jutsus can partially match simultaneously
- UI shows the best-matching jutsu's full sequence with progress

### Visual Effects

All effects use a custom particle system with:
- Position, velocity, and acceleration (gravity)
- Size decay and alpha fade
- Turbulence (random velocity perturbation)
- Trail rendering for sparks
- Glow effects via canvas `shadowBlur`
- Multiple particle types: circles, sparks, lightning bolts, water drops, smoke, rings

## Browser Requirements

- Modern browser with WebGL support
- Camera/webcam access
- JavaScript enabled
- Recommended: Chrome 90+ or Edge 90+

## Credits

- Hand tracking: [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands.html)
- Inspired by: Naruto / Naruto Shippūden by Masashi Kishimoto
