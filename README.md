# Catmoji

<p align="center">
  <img src="./assets/readme/catmoji-readme-hero.png" alt="Catmoji, a real-time hand gesture and emotion experience" width="1280">
</p>

<p align="center">
  An interactive computer vision experience where hand gestures become expressive Moji cat stickers and voice responses in real time.
</p>

Catmoji turns a webcam into a playful, accessible interaction surface. A user shows a hand gesture, the browser interprets its landmark pattern with a local kNN classifier, and Moji responds with a matching emotion, visual state, and sound.

Built as a portfolio project by Henry Nugraha, Catmoji combines machine learning, frontend interaction design, accessible UI engineering, and product-level polish in a browser-first experience.

## The Experience

![How Catmoji works](./assets/readme/catmoji-how-it-works.png)

1. Show a gesture to the webcam.
2. The app reads hand landmarks and classifies the gesture as an emotion.
3. Moji responds instantly with a sticker and voice feedback.

## Why It Is Different

| Area | What Catmoji demonstrates |
| --- | --- |
| Human-centered interaction | A webcam experience designed to feel clear, playful, and understandable instead of technical or intimidating. |
| Applied machine learning | MediaPipe hand landmarks classified in-browser with a distance-weighted kNN model trained on 2,460 samples. |
| Product UX | Three distinct modes: free exploration, a face-aware interactive introduction, and a challenge mode with feedback loops. |
| Visual craft | A cohesive neubrutalism system with custom Moji assets, hard-shadow components, responsive layouts, and motion with purpose. |
| Resilience | Gemini TTS is enhanced with a browser speech fallback, while camera-free preview and service worker caching support smoother access. |

## Core Features

- Five gesture-driven emotions: happy, sad, angry, surprised, and excited.
- Real-time hand tracking with MediaPipe Hands.
- A face-first introduction flow that recognizes the project owner before launching the interactive presentation.
- Guided face enrollment with multi-angle capture for more reliable owner recognition.
- Gemini TTS narration with a graceful Web Speech API fallback.
- Challenge mode with lives, gesture targets, and immediate corrective feedback.
- Installable PWA shell with maskable icons, offline app-shell caching, and polished share previews.
- Keyboard support, visible focus states, reduced-motion support, and WCAG-aware contrast choices.

## Privacy by Design

Catmoji is designed around an intentionally small data surface. Hand gesture inference runs in the browser. Intro details entered by a visitor are used only for the active session and are not treated as a stored profile. The application does not require a user account or a database to try the experience.

## Technical Architecture

```text
Webcam frame
  -> MediaPipe Hands landmark detection
  -> Normalized feature vector
  -> Distance-weighted kNN classification
  -> Emotion state, Moji sticker, challenge feedback, and TTS response
```

| Layer | Technology |
| --- | --- |
| Frontend | Vanilla HTML, CSS, and JavaScript |
| Hand tracking | MediaPipe Hands |
| Gesture model | In-browser distance-weighted kNN, K=7, 7-frame smoothing |
| Face recognition | `@vladmandic/human` |
| Voice | Gemini TTS through a Vercel serverless proxy, with Web Speech fallback |
| Delivery | Vercel static hosting, PWA manifest, and service worker |

## Run Locally

```bash
node dev-server.js
```

Open `http://localhost:8000`. The local server supports the same TTS route used in deployment when Gemini environment variables are configured. Use `?nocam` to preview the interface without requesting camera access.

## Project Structure

```text
assets/
  brand/       # PWA icons, favicon source, social preview, Open Graph image
  readme/      # repository hero and experience diagram
  stickers/    # Moji emotion and pose assets
  ui/          # interface states and decorative accents
api/tts.js     # serverless voice proxy
face.js        # owner recognition and guided enrollment
index.html     # main interactive experience
manifest.webmanifest
sw.js
training/      # model training utilities and local data pipeline
```

## Project Context

Catmoji was created to explore how an ML-backed interaction can remain approachable, visually memorable, and ready to be shared as a complete web product. It is a practical demonstration of Henry's work across frontend engineering, interaction design, computer vision integration, and product presentation.

## License

Copyright 2026 Henry Nugraha. Built as a personal portfolio project.
