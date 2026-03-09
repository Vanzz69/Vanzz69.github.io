# ◈ Momentum

> A full-featured habit tracker, task manager, and journal — built with vanilla JavaScript and Firebase. No frameworks. No fluff. No paywall.

**[Live App →](https://vanzz69.github.io)**

---

## What it is

Momentum is a personal productivity PWA I built for myself because I wasn't happy with existing habit apps. Most of them reduce everything to a streak counter that resets when you miss a day, or lock the useful analytics behind a subscription.

Momentum is different. It tracks habits with real data — consistency, velocity, pace toward a lifetime goal. It has a priority system so you can decide what actually matters on a given day and see over time whether you followed through. And it's completely free, with no ads and no premium tier.

Built entirely solo, from scratch, with no frontend framework.

---

## Features

### ⬡ Habits

Two habit types:
- **Daily** — designed for once-per-day habits. Marks done and locks for the day. Undo available.
- **Flexible** — designed for habits you do multiple times (e.g. drink water, meditate). Increments a counter with no daily lock.

Each habit card shows:
- Type badge, habit name
- 7-day dot trail — the last 7 days visualised as filled/empty dots
- Current streak and personal best streak
- Total completions vs lifetime goal
- Goal progress bar with percentage

**Priority system** — long-press any habit card to mark it as today's priority or tomorrow's priority. Priority habits are highlighted in pink. The dashboard tracks your follow-through rate across every day you set a priority — telling you more about your actual discipline than any streak number.

**Drag to reorder** — desktop uses HTML5 drag. Mobile uses a custom touch drag implementation via the ⠿ handle (HTML5 drag API doesn't work on mobile).

Full create / edit / delete flow with a modal.

---

### 📊 Dashboard

Per-habit deep analytics — select any habit from a dropdown.

**5 stat cards:**
- **Journey Progress** — 5 milestone stages evenly spaced across your actual lifetime goal. Badges: 🌱 → ⭐ → 🔥 → 💎 → 🏆. Always a next target.
- **Strength Index** — composite score out of 100: completion rate (40%), consistency (30%), streak ratio vs personal best (30%)
- **Current Streak** — with a mini bar showing current vs personal best
- **Velocity** — this week vs last week as a percentage. Green if up, red if down.
- **Priority Focus** — out of all days you marked this habit as priority, how many did you actually complete it. Colour coded: green ≥70%, amber ≥40%, red below.

**3 charts:**
- **Success Rate** — 14-day line chart. 100% on completion days, 0% on missed days.
- **Weekly Comparison** — side-by-side bar chart, this week vs last week, day by day
- **All-Time Trend** — line chart of total completions from day one to now

**Activity Calendar** — current month grid. Purple = completed, outlined ring = today, faded = future.

**Goal Pace Tracker** — completions vs goal, average pace per day, days remaining at current pace, projected finish date. No arbitrary "on track / behind" judgement — just numbers.

---

### ◎ Global Stats (Habits view)

Three live numbers above the habit list:
- **⚡ Aura Intensity** — sum of all current streaks across all habits
- **◎ Daily Alignment** — % of your habits completed today
- **◈ Discipline Depth** — total unique days you've logged anything, ever

---

### ☑ Tasks

Three panes:

**Today** — tasks due today. Add with optional time. Completed tasks sink below a divider. Drag to reorder incomplete tasks. Browser/service worker push notifications at set time. Task History button shows all past tasks grouped by date with done/missed status.

**Upcoming** — tasks scheduled for future dates. Grouped by date with readable headers. Automatically move to Today on their due date.

**Someday (backlog)** — no date, no time. Park tasks you want to do eventually without cluttering Today. One tap moves any someday task to Today.

---

### 📓 Journal

- Write entries with optional title and required body
- Entries listed newest-first with date, time, and a 120-character preview
- Tap any card to read the full entry, delete from within the modal
- Synced to cloud, accessible from any device

---

### 🔐 Auth & Sync

- Google sign-in (Android + desktop; iOS Safari shown email sign-in suggestion instead due to popup restrictions)
- Email and password sign-up / login with password reset via email
- **Offline mode** — use without an account, data stays in localStorage
- When signed in: real-time Firestore sync across all devices via `onSnapshot`
- Works fully offline — localStorage fallback, syncs to cloud on reconnect

---

### 📲 PWA

- Installs to home screen on Android (Chrome) and iPhone (Safari)
- Runs full screen once installed, no browser chrome
- Works completely offline after first load
- Service Worker with network-first caching strategy
- In-app install banner for eligible devices

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla JavaScript (ES Modules), HTML5, CSS3 |
| Auth | Firebase Authentication (Google + Email/Password) |
| Database | Cloud Firestore |
| Offline | Service Worker + localStorage |
| Charts | Chart.js |
| Hosting | GitHub Pages |
| Notifications | Web Notifications API + Service Worker |
| Install | PWA — Web App Manifest |

**No React. No Vue. No Webpack. No npm. No build step.**

---

## Architecture

```
momentum/
├── index.html          # Single page app shell — all views and modals
├── app.js              # All app logic (~1850 lines)
│   ├── LocalStorage    # Offline read/write layer
│   ├── DateUtils       # Date helpers (local ISO, streak windows, etc.)
│   ├── HabitLogic      # Streak calc, stats, priority system
│   ├── State           # Single global state object
│   ├── Render          # All UI rendering functions
│   ├── Charts          # Chart.js wrappers + calendar + pace tracker
│   └── Init            # Auth flow + event binding
├── firebase.js         # Firebase Auth + Firestore module
├── styles.css          # CSS custom properties throughout
├── service-worker.js   # Network-first PWA caching
└── manifest.json       # PWA install config
```

---

## Notable Implementation Details

**Streak algorithm** — recalculates from raw completion history on every save instead of storing a streak counter. Never desyncs. Handles gaps, flexible habits, and same-day multiple completions correctly.

**Priority system** — long-press (700ms, 8px movement threshold) opens a priority menu. Priority history is logged per day as a separate array from completions, so the dashboard can show correlation between priority days and actual follow-through.

**Drag vs long-press conflict on mobile** — HTML5 drag API doesn't fire on mobile. Built touch drag from scratch using touch events. Conflict resolved by restricting touch drag to the ⠿ handle only — `touchstart` on the handle cancels the long-press timer. Long-press fires anywhere else on the card.

**Offline sync** — localStorage is the primary data layer, Firestore is the sync layer. On load: try Firebase first, fall back to localStorage silently. `onSnapshot` keeps data live when online. Zero user-facing errors when offline.

**UTC date bug** — `toISOString()` returns UTC, which is a different calendar date than local time in IST (+5:30). All date construction uses local `getFullYear()`/`getMonth()`/`getDate()` — never `toISOString()`.

**Firebase Auth on iOS Safari** — `signInWithPopup` gets blocked. `signInWithRedirect` loses state on GitHub Pages. Solution: detect iOS Safari upfront and show a "use email sign-in instead" message before any auth attempt.

---

## Running Locally

No build step needed.

```bash
git clone https://github.com/Vanzz69/Vanzz69.github.io
cd Vanzz69.github.io
```

Serve with any static file server:

```bash
# Python
python -m http.server 8000

# Node
npx serve .
```

Open `http://localhost:8000`.

To use your own Firebase backend:
1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication — Google and Email/Password
3. Enable Firestore Database
4. Replace the config object in `firebase.js` with your own

---

## What I learned

- PWA fundamentals — service workers, caching strategies, manifest, offline-first architecture
- Firebase Auth edge cases — popup vs redirect, mobile browser restrictions, graceful degradation
- Firestore data modelling — single document per user vs subcollections, read/write cost trade-offs
- Touch event handling — how to implement drag-to-reorder from scratch without libraries
- Writing a streak algorithm that handles all edge cases without stored state
- CSS architecture at scale without a framework — custom properties, consistent spacing/colour systems
- The difference between an app that works and an app that feels good to use

---

## Support

Momentum is free and always will be. Firebase has real costs. If it's helped you:

- **[Ko-fi →](https://ko-fi.com/vanzz69)** — card or PayPal, any currency
- **UPI** — `vanzz-momentum@ibl`

---

## License

MIT — see [LICENSE](LICENSE)

---

*Built by [@Vanzz69](https://github.com/Vanzz69)*
