# DocBrown - Project Instructions

## What This Is

DocBrown is a real-time collaborative workshop tool - a hybrid of Miro's canvas + Mentimeter's voting, built for facilitators running workshops with up to 25 participants. FigJam-style design aesthetic (warm, playful, colorful, rounded).

Full spec: `docbrown-system-prompt.md` (813 lines)

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind 4
- **Backend**: Convex (real-time, serverless) - deployment `reliable-fox-341`
- **Auth**: Convex Auth (Password provider)
- **UI**: Radix primitives, CVA, Lucide icons, Recharts, qrcode.react, @dnd-kit, @react-pdf/renderer
- **Design tokens**: FigJam palette defined in `src/app/globals.css` (postit-yellow, coral, teal, purple, blue, pink)

## Project Structure

```
convex/
  schema.ts          # Full schema (sessions, participants, postIts, clusters, votingRounds, votes, coAdmins, aiResults, folders)
  auth.ts            # Password auth + currentUser query
  auth.config.ts     # Convex Auth config
  http.ts            # HTTP router for auth routes
  sessions.ts        # CRUD, advancePhase, revertPhase, duplicate, moveToFolder, timer (start/stop/reset)
  participants.ts    # join (cookie-based token), reconnect, bySession
  postIts.ts         # create (auto-grid + random color), updateText, move, setCluster, remove
  clusters.ts        # create, update, remove (unassigns post-its)
  votingRounds.ts    # create, getActive, bySession, reveal (co-admin aware)
  votes.ts           # submitDotVotes, submitStockRankVotes, submitMatrixVotes, aggregate queries, votingProgress
  folders.ts         # Folder CRUD: list, create, update, remove (cascade unassign)
  coAdmins.ts        # Co-admin CRUD: getBySession, getByToken, createInvite, join, revoke
  lib/shortCode.ts   # 6-char code generator (no ambiguous chars)
  lib/authSession.ts # Shared auth helper: getAuthorizedSession (owner OR co-admin token)

src/app/
  page.tsx                           # Landing page
  layout.tsx                         # Root layout with ConvexClientProvider
  globals.css                        # FigJam design tokens + postit shadows + canvas grid
  (auth)/login/page.tsx              # Facilitator sign-in
  (auth)/signup/page.tsx             # Facilitator registration
  (facilitator)/layout.tsx           # Auth guard for facilitator routes
  (facilitator)/dashboard/page.tsx   # Session list with folder sidebar, search, status tabs, session actions
  (facilitator)/sessions/new/page.tsx        # Create session (question + visibility + folder picker)
  (facilitator)/sessions/[sessionId]/page.tsx # Main facilitator canvas view + timer controls + round tabs
  join/[code]/page.tsx               # Participant mobile experience (all phases, VotingRouter)
  present/[code]/page.tsx            # Presentation view (public, full-screen, phase-adaptive, round tabs)
  admin/[token]/page.tsx             # Co-admin session view (join form + full facilitator view)

src/components/
  Canvas.tsx           # Zoom/pan canvas with drag-to-move, dot grid background
  PostItCard.tsx       # Post-it with inline editing, heatmap glow, random colors
  PhaseStepper.tsx     # Phase navigation (collect/organize/vote/results)
  QRCodeOverlay.tsx    # QR code + short code + join/present URLs with copy buttons
  DotVotingMobile.tsx  # Mobile dot voting: clustered items, +/- points, submit
  StockRankMobile.tsx  # Mobile stock rank: tap to add, drag to reorder, submit
  MatrixVotingMobile.tsx # Mobile 2x2 matrix: dual sliders per item, submit
  VotingRouter.tsx     # Routes to correct voting component by round mode
  VotingConfigPanel.tsx # Voting type picker (dot/stock/matrix), mode-specific config, progress, reveal, "Start Another Round"
  ResultsPanel.tsx     # Multi-mode results with round tabs: bar charts (dot/stock), scatter plot (matrix), ranked lists
  CoAdminInvite.tsx    # Generate/share co-admin invite link, show active status, revoke
  TimerDisplay.tsx     # Countdown MM:SS, color shift teal->coral, pulsing last 10s
  TimerControls.tsx    # Facilitator timer: presets (1/2/3/5/10 min), custom, start/stop/reset
  FolderSidebar.tsx    # Dashboard sidebar: All Sessions, Archived, folder list with CRUD
  SessionActions.tsx   # Three-dot dropdown: duplicate, move to folder, archive, delete
  ExportButtons.tsx    # CSV + PDF export buttons
  ExportSection.tsx    # Queries aggregate data and wires to ExportButtons
  providers/ConvexClientProvider.tsx
  ui/button.tsx, card.tsx, input.tsx, label.tsx

src/lib/
  utils.ts             # cn() helper
  exportCsv.ts         # CSV generation for all 3 voting modes
  exportPdf.tsx        # @react-pdf/renderer PDF documents for all 3 voting modes
```

## What's Done (MVP Phases 1-5)

### Phase 1: Scaffolding [DONE]
- Next.js + Convex project, full schema deployed, auth configured, FigJam design tokens

### Phase 2: Auth + Session CRUD [DONE]
- Facilitator signup/login, dashboard with session list, session creation with short codes

### Phase 3: Join Flow + Collect Phase [DONE]
- Participants join via QR/short link, submit answers, post-its appear live on facilitator canvas
- Cookie-based participant identity (24h cookie + sessionStorage backup)
- Canvas with zoom/pan, auto-grid layout for new post-its

### Phase 4: Organize Phase [DONE]
- Facilitator can drag post-its on canvas, create/edit/delete post-its
- Cluster support (create, update, remove with post-it unassignment)
- Phase transitions: forward (collect->organize->vote->results) and backward with vote cleanup

### Phase 5: Dot Voting + Results [DONE]
- Voting type picker (dot voting active; stock rank + 2x2 matrix placeholders)
- Mobile dot voting: items grouped by cluster, +/- points, remaining counter, sticky submit
- Voting progress bar, reveal mode, horizontal bar chart results, ranked list
- Heatmap glow on post-its based on vote count

## What's Done (Post-MVP Features)

### Session Management [DONE]
- Folder CRUD (create, rename, delete with cascade unassign)
- Dashboard rework: folder sidebar (240px), search input, status filter tabs (All/Active/Completed/Archived)
- Session actions: duplicate (copies question+settings, new short code, resets to collect), move to folder, archive/unarchive, delete with confirmation
- Folder picker on new session creation
- `sessions.list` query accepts `folderId`, `status`, `includeArchived` filters

### Timer [DONE]
- Facilitator timer controls: preset durations (1/2/3/5/10 min) + custom input, start/stop/reset
- TimerDisplay: countdown MM:SS, color shifts teal->coral as time runs low, pulsing animation last 10s, "Time's up!" on expire
- Timer visible on both facilitator session header and participant join page
- Server-set `timerStartedAt` via `Date.now()` in Convex mutation; all clients compute remaining reactively

### Presentation View [DONE]
- `/present/[code]` public route (no auth required), resolves session via `getByShortCode`
- Phase-adaptive display: canvas + response count (collect/organize), canvas + voting progress (vote), canvas + full results panel (results)
- Timer display when active, participant count, minimal header
- QRCodeOverlay updated with both join and present URLs with separate copy buttons

### Stock Rank Voting [DONE]
- VotingRouter component routes to correct voting UI based on `activeRound.mode`
- StockRankMobile: tap unranked items to add to ranked list, drag to reorder, remove button, rank counter (N/topN)
- `submitStockRankVotes` mutation stores `{rank: number}` per vote
- `aggregateStockRankVotes` query computes average rank + times-ranked, sorted by lowest avg
- VotingConfigPanel: stock rank enabled with "Number of items to rank" config (3-20)
- ResultsPanel: average rank bar chart + ranked list with avg position scores

### 2x2 Matrix Voting [DONE]
- MatrixVotingMobile: two range sliders (1-5) per item for X and Y axes, grouped by cluster, skip option, progress counter
- `submitMatrixVotes` mutation stores `{x, y}` per vote
- `aggregateMatrixVotes` query computes avg X, avg Y, count per post-it
- VotingConfigPanel: matrix enabled with X-axis and Y-axis label inputs
- ResultsPanel: Recharts ScatterChart with quadrant reference lines at 3,3, axis labels from config

### PDF/CSV Export [DONE]
- CSV export for all 3 voting modes with proper escaping, triggered via Blob download
- PDF export via `@react-pdf/renderer`: title page info + tabular results (mode-specific columns)
- ExportButtons (CSV + PDF) appear at bottom of ResultsPanel when session metadata is provided
- ExportSection queries the correct aggregate data based on round mode

### Co-Admin [DONE]
- `/admin/[token]` route: join form with name input, cookie-based session persistence
- Shared auth helper `getAuthorizedSession()` checks session owner OR active co-admin token
- Co-admin gets full facilitator view: phase controls, timer, voting config, post-it management
- `CoAdminInvite` component: generate invite link, copy URL, show active status, revoke access
- `coAdmins.ts` backend: `getBySession`, `getByToken`, `createInvite`, `join`, `revoke`
- All admin mutations (advancePhase, revertPhase, timer, voting rounds) accept optional `coAdminToken`

### Multiple Voting Rounds [DONE]
- VotingConfigPanel: after revealing results, "Start Another Round" button shows inline setup for a new round
- ResultsPanel: round tabs appear when multiple revealed rounds exist, allowing switching between rounds
- Round tabs shown on facilitator, co-admin, and presentation views
- Each round tracked with `roundNumber`, different modes allowed per round

## What's Left

| # | Feature | Effort | Status |
|---|---------|--------|--------|
| 1 | **AI Features** | Medium | Not started - Auto-cluster (Convex Action -> Claude API -> preview overlay) + Theme summary |
| 2 | **Google OAuth** | Small | Not started - Add Google provider to Convex Auth |

## Known Issues / Risk Areas

1. **Canvas performance** - Not yet tested with 100+ post-its. May need `will-change: transform`, position-update-on-drag-end-only, virtualization.
2. **Mobile touch drag** - Stock Rank uses HTML5 drag events; may need `@dnd-kit` sortable with 250ms touch delay for better mobile support.
3. **Phase transitions** - Reverting past vote phase deletes all votes atomically in Convex mutations. Confirmation dialog warns about data loss.
4. **Mobile Safari cookies (ITP)** - Using cookie + sessionStorage dual-store for participant identity.
5. **QR/Share link** - Uses `NEXT_PUBLIC_LOCAL_IP` env var to replace localhost with network IP for mobile access. Set in `.env.local`.
6. **PDF rendering** - Uses `@react-pdf/renderer` client-side. Large sessions (50+ items) may be slow to generate. Tables only, no chart images.

## Dev Commands

**IMPORTANT: You must run BOTH servers simultaneously for the app to work.**

```bash
# Terminal 1 - Convex backend (real-time sync, DB, auth)
npx convex dev

# Terminal 2 - Next.js frontend
npm run dev
```

Both must be running at the same time. The Next.js frontend connects to Convex for all data and auth. If only one server is running, the app will either show no data (missing Convex) or not be accessible (missing Next.js).

```bash
npm run build     # Production build (must pass before committing)
npm run lint      # ESLint
```

## Conventions

- All Convex admin functions use `getAuthorizedSession()` which checks owner OR co-admin token
- Participants are anonymous (cookie-based token, no account)
- Post-it colors randomly assigned from 6-color FigJam palette
- Short codes: 6 chars from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no ambiguous chars)
- Phase order: collect -> organize -> vote -> results (forward and backward transitions supported)
- Voting modes: `dot_voting`, `stock_rank`, `matrix_2x2` - all use `v.any()` for flexible config/value storage
- VotingRouter on participant side dispatches to correct mobile voting component based on active round mode
- ResultsPanel is multi-mode: renders charts and lists appropriate to the voting mode
- Export (CSV/PDF) available on results phase when sessionMeta is passed to ResultsPanel
