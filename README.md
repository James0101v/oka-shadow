# Shadow Partner

Muay Thai shadow analysis and coaching application. Record shadowboxing rounds, receive automated technique analysis, and train with a visualized sparring partner.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Animation:** Framer Motion
- **Icons:** Lucide React
- **State:** Zustand (persisted to localStorage)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in a mobile-width browser window.

## App Structure

```
src/
  app/
    page.tsx                 Home screen
    record/page.tsx          Camera setup + recording flow
    processing/[id]/page.tsx Analysis processing screen
    results/[id]/page.tsx    Annotated video + insights
    drills/[id]/page.tsx     Drill suggestions + timer
    library/page.tsx         Session history
    profile/page.tsx         User preferences
  components/
    layout/                  App shell, tab bar
    ui/                      Score ring, session card, timeline, insight badge
  lib/
    types.ts                 Core type definitions
    store.ts                 Zustand state management
    mock-data.ts             Seed data and analysis simulation
    utils.ts                 Formatters and severity helpers
```

## Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Home | `/` | Greeting, weekly progress, start button, recent sessions |
| Record | `/record` | Camera setup with framing guide, countdown, recording timer |
| Processing | `/processing/[id]` | Animated skeleton with step-by-step analysis progress |
| Results | `/results/[id]` | Video player with fighter silhouette, shadow partner, timeline, score ring, insights |
| Drills | `/drills/[id]` | Suggested drills with built-in round timer |
| Library | `/library` | Full session history |
| Profile | `/profile` | Stance, skill level, weekly goal settings |

## User Flow

Home > Start Round > Camera Setup > Record > Processing > Results > Drills

Total taps from open to recording: 3-4.

## Design Principles

- **Dark-first UI** optimized for mobile viewports
- **Minimal friction** -- record in one tap from home
- **Visual-first coaching** -- show, don't lecture
- **Positive reinforcement** -- highlight good moments alongside corrections

## MVP Scope

### Detection (simulated in MVP)
- Jab, cross, hook, rear roundhouse
- Guard drop, chin lift, feet crossing, weak hip rotation, no rear pivot

### Output
- Animated fighter silhouette with reactive shadow partner
- Color-coded timeline (green/amber/red)
- Coaching captions during playback
- Round score with top issues and drill suggestions

## Future Work

- MediaPipe/TensorFlow.js pose estimation for real analysis
- Real video recording and annotated playback
- Live real-time feedback
- Voice coaching
- Multi-round progress tracking
- Capacitor/iOS native wrapper
