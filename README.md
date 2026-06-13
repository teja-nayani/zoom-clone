# Zoom Clone — Fullstack Video Conferencing Platform

A pixel-faithful, production-grade clone of the Zoom Web Portal built with Next.js, FastAPI, WebRTC, and WebSockets. Supports multi-party video/audio calls, screen sharing, in-meeting chat, host controls, and a fully functional meeting dashboard.

---

## Screenshots

| Dashboard (3-column portal layout) | Meeting Room |
|---|---|
| Matches Zoom's left-sidebar + center meetings + right action-tiles layout | Dark-stage grid, control bar, participants panel, chat panel |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript |
| **Styling** | Tailwind CSS v4, custom Zoom design tokens (HSL channels) |
| **UI Components** | shadcn/ui primitives, Lucide React icons |
| **Backend** | Python 3.11+, FastAPI, Uvicorn |
| **Database** | SQLite via SQLAlchemy ORM (Pydantic v2 schemas) |
| **Real-time** | WebSockets (FastAPI), WebRTC Mesh (browser-native) |

---

## Project Structure

```
zoom-clone/
├── app/
│   ├── dashboard/page.tsx      # 3-column portal dashboard
│   ├── meeting/[id]/
│   │   ├── page.tsx            # Server shell → loads MeetingRoom client component
│   │   └── meeting-room.tsx    # Full meeting room UI + hooks integration
│   ├── globals.css             # Zoom design tokens + Tailwind utilities
│   └── layout.tsx
├── hooks/
│   ├── useMediaDevices.ts      # Camera/mic/screen-share track management
│   ├── useWebSocket.ts         # WS connection, message pub/sub
│   └── useWebRTC.ts            # Full mesh WebRTC lifecycle
├── backend/
│   ├── main.py                 # FastAPI app, CORS, startup seed
│   ├── database.py             # SQLite engine + session factory
│   ├── models.py               # SQLAlchemy ORM models
│   ├── schemas.py              # Pydantic v2 request/response schemas
│   ├── routers/
│   │   ├── meetings.py         # REST CRUD for meetings + participants
│   │   └── participants.py     # Participant management stubs
│   └── websocket/
│       ├── manager.py          # In-memory room state (ConnectionManager)
│       └── signaling.py        # WS endpoint + full event router
├── docs/
│   └── Zoom Clone - Technical Architecture & Implementation Guide.md
├── README.md
└── AI_WORKFLOW.md
```

---

## Features

- **Dashboard** — Zoom Web Portal–style 3-column layout: left nav, center meetings (Upcoming/Previous tabs), right action tiles
- **Instant Meeting** — One-click start; generates a unique 9-digit meeting code
- **Schedule Meeting** — Form modal with title, date/time, duration; persisted to SQLite
- **Join Meeting** — Accepts meeting ID or full invite link
- **Video Grid** — Responsive tile layout (1→2→3 columns based on participant count)
- **WebRTC Mesh** — Full offer/answer/ICE exchange; new joiners are always the offerer (eliminates collision on refresh)
- **Screen Share** — `getDisplayMedia` with automatic track replacement in all WebRTC senders; native "Stop sharing" button handled
- **Chat** — Real-time broadcast via WebSocket; right-aligned own bubbles, unread badge
- **Participants Panel** — Live mute status, Host badge, Mute/Remove host controls
- **Host Controls** — Remote mute and kick-from-meeting via targeted WS messages

---

## Local Development Setup

### Prerequisites

- **Node.js** ≥ 18 and **npm** ≥ 9
- **Python** ≥ 3.11

---

### 1 — Clone the repository

```bash
git clone <your-repo-url>
cd zoom-clone
```

### 2 — Backend setup

```bash
cd backend

# Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate      # macOS / Linux
# .venv\Scripts\activate       # Windows

# Install dependencies
pip install -r requirements.txt

# Start the development server
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.
Interactive docs: `http://localhost:8000/docs`

> The default user (ID 1 — "Demo User") is seeded automatically on first startup.

### 3 — Frontend setup

Open a **second terminal** in the project root:

```bash
# Install dependencies (first time only)
npm install

# Start the Next.js dev server
npm run dev
```

The app will be available at `http://localhost:3000`.

---

### 4 — Test a video call

1. Open `http://localhost:3000` in **Browser A** — click **New Meeting**. Allow camera/mic.
2. Copy the 9-digit meeting code from the URL bar.
3. Open `http://localhost:3000` in **Browser B** (or a different browser/incognito) — click **Join**, paste the code.
4. Both browsers should see each other's video within 2–3 seconds.

---

## Architecture & Design Decisions

### WebRTC — Mesh topology (no SFU/MCU)

We use a pure browser-native WebRTC mesh where every participant holds a direct `RTCPeerConnection` to every other participant.

**Why mesh for this MVP?**

| Factor | Mesh | SFU (e.g. mediasoup) |
|---|---|---|
| Infrastructure | Zero — runs entirely in the browser | Requires a dedicated media server |
| Setup complexity | None | Docker + mediasoup/Janus/LiveKit setup |
| Scalability ceiling | ~6–8 peers (CPU/bandwidth limited) | Hundreds of participants |
| Latency | Lowest possible (peer-to-peer) | Slightly higher (via relay) |

For small team calls (the primary use-case of this MVP), mesh is ideal. An SFU would add weeks of infrastructure work with no UX benefit at ≤8 participants.

**Offer-collision fix** — new joiners are always the OFFERER. Existing participants receive `existing-participants` (a targeted snapshot from the server) and are always the ANSWERER. This eliminates the race condition where both sides simultaneously call `createOffer`.

### WebSockets — In-memory room state

Room membership and connection state are stored in a Python dict on the FastAPI process. No Redis, no Celery, no external broker.

**Why in-memory for MVP?**

- Zero operational overhead
- Sufficient for single-process development and demos
- Stateless room cleanup on disconnect is trivially handled in the `finally` block

The trade-off is that the state is lost on server restart (acceptable for a dev MVP) and does not scale horizontally (a single Uvicorn worker is assumed). Upgrading to Redis pub/sub is a one-file change when needed.

### Authentication — Default user (ID: 1)

The backend seeds a single `Demo User` with `id=1` on startup. Every API call assumes this user.

**Why no JWT/OAuth?**

The specification explicitly scopes authentication out of this MVP. Adding Auth.js or a JWT layer is a well-understood problem that would double the implementation time without adding any value to the real-time video infrastructure — which is the interesting technical challenge here.

### SQLite

SQLite is embedded, zero-config, and sufficient for local development and small deployments. The SQLAlchemy ORM layer means swapping to PostgreSQL in production requires only a one-line connection string change.

---

## API Reference

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/meetings/instant` | Create and immediately start a meeting |
| `POST` | `/meetings/schedule` | Schedule a future meeting |
| `GET` | `/meetings/upcoming` | List upcoming meetings for user 1 |
| `GET` | `/meetings/recent` | List recent meetings for user 1 |
| `GET` | `/meetings/{code}` | Get a meeting by its 9-digit code |
| `POST` | `/meetings/{code}/join` | Register as a participant |
| `WS` | `/ws/{code}/{client_id}` | WebSocket signaling endpoint |

Full interactive docs at `http://localhost:8000/docs` when the backend is running.

---

## WebSocket Event Reference

### Server → Client

| Event | Description |
|---|---|
| `existing-participants` | Sent to the **new joiner only** — list of who's already in the room |
| `participant-joined` | Broadcast to existing clients when someone new connects |
| `participant-left` | Broadcast when a participant disconnects |
| `offer` / `answer` / `ice-candidate` | Forwarded peer-to-peer signaling payloads |
| `participant-audio-updated` | Broadcast when any participant toggles their mic |
| `participant-video-updated` | Broadcast when any participant toggles their camera |
| `screen-share-started` / `stopped` | Broadcast when screen sharing changes |
| `chat-message` | Broadcast to all (including sender) when a chat message is sent |
| `host-muted-you` | Targeted — host muted this specific participant |
| `removed-from-meeting` | Targeted — host removed this participant |

### Client → Server

| Event | Description |
|---|---|
| `offer` / `answer` / `ice-candidate` | Target a specific peer via `payload.target` |
| `toggle-audio` / `toggle-video` | Notify room of local state changes |
| `screen-share-started` / `stopped` | Notify room of screen share state |
| `chat-message` | Send a text message to the room |
| `mute-participant` | Host action — mute a remote participant |
| `remove-participant` | Host action — kick a remote participant |
| `sync-room` | Request a fresh `existing-participants` snapshot (used after reconnect) |
| `leave-room` | Clean disconnect before closing the tab |

---

## License

MIT
