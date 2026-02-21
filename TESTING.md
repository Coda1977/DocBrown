# DocBrown - QA Report & Testing Task List

## QA Testing Report (2026-02-21)

**Tester:** Claude (browser automation via Chrome MCP)
**Environment:** localhost:3000 (Next.js dev) + Convex dev backend

### Summary

Tested all major features across facilitator, participant, and presentation views. The app is solid overall with a polished FigJam-style design. Found **1 critical bug** (fixed), **1 medium bug**, and **several UX improvements**.

### Bugs

#### BUG-001: "End Voting & Show Results" doesn't reveal results [CRITICAL - FIXED]
- **File:** `src/components/VotingConfigPanel.tsx:309-315`
- **Problem:** Button only called `advancePhase()` without `revealResults()`. Session moved to Results phase with `isRevealed: false`, showing "Results will appear when revealed" instead of actual results.
- **Fix:** Changed onClick to `await revealResults()` then `await advancePhase()` sequentially.

#### BUG-002: "Move to Folder" click navigates away [MEDIUM - OPEN]
- **File:** `src/components/SessionActions.tsx` + dashboard page
- **Problem:** Clicking "Move to Folder" in the session actions dropdown navigates to the session page instead of expanding the folder picker submenu. The click event propagates through to the parent `<Link>` wrapping the session card, despite `e.stopPropagation()`.
- **Fix suggestion:** Extract SessionActions from inside the `<Link>`, or use a portal for the dropdown.

### UX Improvements

| # | Priority | Issue | Location |
|---|----------|-------|----------|
| 1 | High | Empty state says "No sessions yet" regardless of filter tab (should say "No completed sessions" etc.) | `dashboard/page.tsx:157-159` |
| 2 | High | No way to mark sessions "Completed" - the Completed filter tab is dead | Session actions / schema |
| 3 | High | Two-step reveal is confusing: "Reveal Results" vs "End Voting & Show Results" | `VotingConfigPanel.tsx` |
| 4 | Medium | Matrix scatter dots too small for projection | `ResultsPanel.tsx:410` - ZAxis range `[60,200]` -> `[120,300]` |
| 5 | Medium | Duplicate briefly flashes old session content before showing empty Collect | Next.js hydration timing |
| 6 | Low | Timer color thresholds may differ between facilitator and participant views | `TimerDisplay.tsx` |
| 7 | Low | Chart bar contrast may be low on washed-out projectors | `ResultsPanel.tsx` chart fill color |
| 8 | Low | Participants see "Session Complete" on results phase - could show results directly | `join/[code]/page.tsx` |

### Feature Test Matrix

| Feature | Status | Notes |
|---------|--------|-------|
| Landing page | PASS | Clean FigJam design, feature cards, CTA |
| Auth redirect | PASS | /login redirects authenticated users to dashboard |
| Dashboard session list | PASS | Status badges, phase, short codes, dates |
| Search | PASS | Real-time filtering by question text |
| Status filter tabs | PASS | All/Active/Completed/Archived work |
| Folder sidebar | PASS | All Sessions, Archived, folder list with CRUD |
| Create folder | PASS | Inline input, confirm/cancel |
| Session actions: Duplicate | PASS | New session in Collect phase with new short code |
| Session actions: Archive/Unarchive | PASS | Moves between views, badge changes |
| Session actions: Move to Folder | **BUG** | Click propagates to parent Link |
| Session creation | PASS | Question input, auto short code |
| Phase transitions forward | PASS | All 4 phases work |
| Phase revert + confirmation | PASS | Dialog warns about data loss |
| Canvas: dot grid + post-its | PASS | Random colors, shadows, rounded |
| Canvas: drag to move | PASS | Position persisted |
| Canvas: zoom controls | PASS | -/100%/+ buttons |
| Canvas: empty state | PASS | Decorative post-its + waiting message |
| Post-it: add (facilitator) | PASS | Inline input, Enter/Escape, rapid entry |
| Post-it: inline edit | PASS | Double-click, Save/Delete |
| QR/Share overlay | PASS | QR code, short code, join+present URLs, copy |
| Timer: presets + start/stop | PASS | 1/2/3/5/10 min presets |
| Timer: display on both views | PASS | MM:SS, color shift teal->coral |
| Participant join | PASS | /join/[code], submit response, "(you)" tag |
| Real-time sync | PASS | Post-its appear instantly, count updates |
| Voting setup: 3 modes | PASS | Dot/Stock/Matrix with mode-specific config |
| Dot voting (participant) | PASS | +/- buttons, points remaining, submit |
| Voting progress bar | PASS | X of Y voted |
| Results: full-page (NEW) | PASS | Charts take full width, no canvas |
| Results: bar chart (dot) | PASS | Horizontal bars, readable labels |
| Results: scatter (matrix) | PASS | 2D plot with axis labels |
| Results: ranked list | PASS | 2-column grid with scores |
| Results: round tabs | PASS | Switch between multiple rounds |
| Export: CSV | PASS | Download triggers |
| Export: PDF | PASS | Download triggers |
| Present view | PASS | Minimal header, full-page results |
| Visibility toggle | PASS | Eye/EyeOff icon |
| Participant: results phase | PASS | "Session Complete" message |
| Co-admin | NOT TESTED | Requires separate browser context |
| Stock rank (participant) | NOT TESTED | Requires separate participant session |
| Matrix voting (participant) | NOT TESTED | Requires separate participant session |
| Login/signup forms | NOT TESTED | Already authenticated |
| Delete session + confirm | NOT TESTED | Avoided to preserve test data |

### Files Modified

1. `src/components/VotingConfigPanel.tsx` - Fixed BUG-001
2. `src/app/(facilitator)/sessions/[sessionId]/page.tsx` - Full-page results
3. `src/app/present/[code]/page.tsx` - Full-page results
4. `src/components/ResultsPanel.tsx` - fullWidth styling
5. `tsconfig.json` - Excluded vitest.config.ts

**Build:** PASS (`npm run build` succeeds)

---

# Testing Task List

Master test task file. Each section contains test IDs, file paths, and specific test cases to implement.

**Infrastructure**: vitest + convex-test (unit/component), Playwright (e2e)

**Run commands:**
```bash
npm test              # vitest watch mode
npm run test:run      # vitest single run (all)
npm run test:convex   # convex backend tests only
npm run test:components  # React component tests only
npm run test:e2e      # Playwright e2e tests
```

---

## HIGH PRIORITY -- Backend Unit Tests

### H1: shortCode generator
**File:** `convex/lib/shortCode.test.ts`
**Source:** `convex/lib/shortCode.ts`

- [ ] Returns a 6-character string
- [ ] Only contains characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789`
- [ ] Never contains ambiguous chars: `0`, `O`, `1`, `I`, `L`
- [ ] 1000 generated codes are all 6 chars and valid charset
- [ ] At least 900/1000 codes are unique (probabilistic, generous threshold)

### H2: CSV export utilities
**File:** `src/lib/exportCsv.test.ts`
**Source:** `src/lib/exportCsv.ts`

**escapeCsv (internal, test via output):**
- [ ] Plain text passes through unchanged
- [ ] Text with commas gets quoted: `"hello, world"`
- [ ] Text with double quotes gets escaped: `"say ""hi"""`
- [ ] Text with newlines gets quoted
- [ ] Text with all three (comma + quote + newline) handles correctly

**generateDotVotingCsv:**
- [ ] Header row: `Rank,Text,Cluster,Points`
- [ ] Rows sorted by rank (1, 2, 3...)
- [ ] Missing cluster shows empty string
- [ ] Missing postIt shows "Unknown"
- [ ] Empty results array returns header only

**generateStockRankCsv:**
- [ ] Header row: `Rank,Text,Cluster,Avg Rank,Times Ranked`
- [ ] Avg rank rounded to 1 decimal
- [ ] Empty results returns header only

**generateMatrixCsv:**
- [ ] Header row includes dynamic axis labels: `Text,Cluster,Avg {xLabel},Avg {yLabel},Responses`
- [ ] Avg X and Avg Y rounded to 1 decimal
- [ ] Empty results returns header only

### H3: authSession helper
**File:** `convex/lib/authSession.test.ts`
**Source:** `convex/lib/authSession.ts`
**Framework:** `convex-test`

- [ ] Owner (authenticated user who created session) gets access
- [ ] Active co-admin with valid token gets access
- [ ] Inactive co-admin (isActive=false) is rejected with "Not authorized"
- [ ] Co-admin token for a different session is rejected
- [ ] No auth (no userId, no coAdminToken) throws "Not authorized"
- [ ] Non-existent session throws "Session not found"

### H4: sessions -- phase transitions
**File:** `convex/sessions.test.ts`
**Source:** `convex/sessions.ts`
**Framework:** `convex-test`

**advancePhase:**
- [ ] collect -> organize
- [ ] organize -> vote
- [ ] vote -> results
- [ ] results -> throws "Already at final phase"
- [ ] Co-admin with valid token can advance
- [ ] Unauthorized user is rejected

**revertPhase:**
- [ ] results -> organize deletes all votes and votingRounds
- [ ] results -> collect deletes all votes and votingRounds
- [ ] vote -> organize deletes all votes and votingRounds
- [ ] vote -> collect deletes all votes and votingRounds
- [ ] Cannot revert to same or later phase (throws)
- [ ] Post-its are NOT deleted on revert (only votes/rounds)

### H5: votes -- all three modes
**File:** `convex/votes.test.ts`
**Source:** `convex/votes.ts`
**Framework:** `convex-test`

**submitDotVotes + aggregateDotVotes:**
- [ ] Submit creates vote records with numeric value
- [ ] Aggregate returns {postItId, total} sorted descending by total
- [ ] Zero-point votes are not inserted
- [ ] Re-submit replaces previous votes (deletes old, inserts new)

**submitStockRankVotes + aggregateStockRankVotes:**
- [ ] Submit creates vote records with {rank: N} value
- [ ] Aggregate returns {postItId, avgRank, timesRanked} sorted ascending by avgRank
- [ ] Multiple participants: avgRank = sum(ranks) / count
- [ ] Re-submit replaces previous rankings

**submitMatrixVotes + aggregateMatrixVotes:**
- [ ] Submit creates vote records with {x, y} value
- [ ] Aggregate returns {postItId, avgX, avgY, count} sorted descending by count
- [ ] Multiple participants: avgX/avgY computed correctly
- [ ] Re-submit replaces previous ratings

**votingProgress:**
- [ ] Returns {total: N, voted: M} where total = participant count, voted = unique voters
- [ ] Participant who voted counts once even with multiple vote records

**participantVoteStatus:**
- [ ] hasVoted=false when no votes exist for participant+round
- [ ] hasVoted=true after submitting, returns the votes array

### H6: clusters -- remove cascade
**File:** `convex/clusters.test.ts`
**Source:** `convex/clusters.ts`
**Framework:** `convex-test`

- [ ] remove unassigns postIts (sets clusterId=undefined) that belonged to the cluster
- [ ] remove does NOT delete the postIts themselves
- [ ] PostIts assigned to other clusters are unaffected
- [ ] PostIts with no cluster are unaffected
- [ ] Non-existent cluster ID is a no-op (no throw)

### H7: folders -- remove cascade
**File:** `convex/folders.test.ts`
**Source:** `convex/folders.ts`
**Framework:** `convex-test`

- [ ] remove unassigns sessions (sets folderId=undefined) that were in the folder
- [ ] remove does NOT delete the sessions themselves
- [ ] Sessions in other folders are unaffected
- [ ] Ownership check: non-owner cannot remove folder (throws)
- [ ] Ownership check: non-owner cannot update folder (throws)
- [ ] Unauthenticated user cannot create/update/remove (throws)

### H8: sessions -- CRUD
**File:** `convex/sessions.test.ts` (same file as H4, separate describe block)
**Source:** `convex/sessions.ts`
**Framework:** `convex-test`

**create:**
- [ ] Creates session with phase="collect", status="active"
- [ ] Generates a 6-char shortCode
- [ ] Default participantVisibility=true when not provided
- [ ] Accepts optional folderId
- [ ] Unauthenticated user throws

**duplicate:**
- [ ] Copies question, participantVisibility, revealMode, folderId
- [ ] Generates NEW shortCode (different from original)
- [ ] Resets phase to "collect"
- [ ] Resets status to "active"
- [ ] Does NOT copy postIts, votes, or rounds

**update:**
- [ ] Owner can update question, status, etc.
- [ ] Non-owner throws "Session not found"
- [ ] Undefined fields are not patched

**list:**
- [ ] Returns only authenticated user's sessions
- [ ] Filters by folderId when provided
- [ ] Filters by status when provided
- [ ] Excludes archived by default (unless includeArchived=true)

**remove:**
- [ ] Owner can delete session
- [ ] Non-owner throws

### H9: postIts -- auto-grid + CRUD
**File:** `convex/postIts.test.ts`
**Source:** `convex/postIts.ts`
**Framework:** `convex-test`

**create (auto-grid):**
- [ ] First postIt at position (40, 40)
- [ ] Second postIt at (240, 40) -- col 1 (40 + 1*(180+20))
- [ ] 5th postIt at (840, 40) -- col 4
- [ ] 6th postIt wraps to row 1: (40, 200) -- (40 + 0*(200), 40 + 1*(160))
- [ ] Color is one of the 6 FigJam palette colors
- [ ] Non-existent session throws "Session not found"

**CRUD:**
- [ ] updateText patches text
- [ ] move patches positionX and positionY
- [ ] setCluster patches clusterId (and can set to undefined)
- [ ] remove deletes the postIt

### H10: coAdmins
**File:** `convex/coAdmins.test.ts`
**Source:** `convex/coAdmins.ts`
**Framework:** `convex-test`

- [ ] createInvite returns a token string starting with "ca_"
- [ ] createInvite is idempotent: calling twice returns same token
- [ ] createInvite by non-owner throws
- [ ] join sets isActive=true and displayName
- [ ] join with invalid token throws "Invalid invite link"
- [ ] join returns sessionId
- [ ] revoke deletes the coAdmin record
- [ ] revoke by non-owner throws
- [ ] getBySession returns the coAdmin for a session
- [ ] getByToken returns the coAdmin by invite token

### H11: participants
**File:** `convex/participants.test.ts`
**Source:** `convex/participants.ts`
**Framework:** `convex-test`

- [ ] join creates a participant with displayToken and sessionId
- [ ] join is idempotent: same token + same session returns same participant ID
- [ ] join with different token creates a new participant
- [ ] join to inactive session throws "Session not found or not active"
- [ ] reconnect finds existing participant by token + sessionId
- [ ] reconnect returns null if token exists but for different session
- [ ] reconnect returns null if token doesn't exist
- [ ] bySession returns all participants for a session

### H12: votingRounds
**File:** `convex/votingRounds.test.ts`
**Source:** `convex/votingRounds.ts`
**Framework:** `convex-test`

- [ ] create sets roundNumber=1 for first round
- [ ] create sets roundNumber=2 for second round (auto-increments)
- [ ] create sets isRevealed=false
- [ ] create requires auth (owner or co-admin)
- [ ] getActive returns the most recently created round (desc order)
- [ ] getActive returns null when no rounds exist
- [ ] bySession returns all rounds for a session
- [ ] reveal sets isRevealed=true
- [ ] reveal requires auth (owner or co-admin)

---

## MEDIUM PRIORITY -- Component Tests

### M1: PostItCard
**File:** `src/components/PostItCard.test.tsx`
**Source:** `src/components/PostItCard.tsx`

- [ ] Renders text content
- [ ] Heatmap glow opacity: 0 when maxVotes=0, proportional when votes>0
- [ ] Shows vote badge when votes > 0
- [ ] Double-click enters edit mode (shows textarea)
- [ ] Enter key saves edited text and exits edit mode
- [ ] Escape key cancels edit and restores original text
- [ ] Delete/remove button calls onRemove callback
- [ ] readOnly mode: no edit on double-click, no delete button

### M2: PhaseStepper
**File:** `src/components/PhaseStepper.test.tsx`
**Source:** `src/components/PhaseStepper.tsx`

- [ ] Renders all 4 phase labels: Collect, Organize, Vote, Results
- [ ] Active phase has highlighted/active styling
- [ ] Completed (past) phases are clickable, trigger onRevert with target phase
- [ ] Future phases are not clickable
- [ ] Next phase button triggers onAdvance

### M3: TimerDisplay
**File:** `src/components/TimerDisplay.test.tsx`
**Source:** `src/components/TimerDisplay.tsx`

- [ ] Displays time in MM:SS format (e.g., "02:30")
- [ ] Seconds are zero-padded (e.g., "1:05" not "1:5")
- [ ] Adds pulse animation class when remaining <= 10 seconds
- [ ] Shows "Time's up!" text when timer reaches 0
- [ ] Calls onExpire callback when timer reaches 0
- [ ] Color shifts from teal to coral as time decreases

### M4: QRCodeOverlay
**File:** `src/components/QRCodeOverlay.test.tsx`
**Source:** `src/components/QRCodeOverlay.tsx`

- [ ] Join URL format: `{baseUrl}/join/{code}`
- [ ] Present URL format: `{baseUrl}/present/{code}`
- [ ] Replaces localhost with NEXT_PUBLIC_LOCAL_IP when set
- [ ] Copy buttons exist for both URLs
- [ ] Close button calls onClose callback
- [ ] Renders QR code component

### M5: Canvas
**File:** `src/components/Canvas.test.tsx`
**Source:** `src/components/Canvas.tsx`

- [ ] Zoom clamps between 0.3x and 3x
- [ ] Zoom in button increases zoom level
- [ ] Zoom out button decreases zoom level
- [ ] Computes maxVotes from postIts vote data
- [ ] readOnly prop disables drag interactions

### M6: utils -- cn()
**File:** `src/lib/utils.test.ts`
**Source:** `src/lib/utils.ts`

- [ ] Merges multiple class strings: `cn("foo", "bar")` -> `"foo bar"`
- [ ] Handles conditional classes: `cn("foo", false && "bar")` -> `"foo"`
- [ ] Handles undefined/null inputs without crashing
- [ ] Merges conflicting Tailwind classes: `cn("p-2", "p-4")` -> `"p-4"`
- [ ] Handles arrays: `cn(["foo", "bar"])` -> `"foo bar"`

---

## LOWER PRIORITY -- E2E Tests (Playwright)

### E1: Full workshop flow
**File:** `e2e/workshop-flow.spec.ts`
**Contexts:** Desktop (facilitator) + Mobile (participant)

1. Facilitator signs up / logs in
2. Creates a new session with a question
3. Verifies short code and QR overlay appear
4. Participant opens join URL on mobile viewport
5. Participant submits an answer -> postIt appears on facilitator canvas
6. Facilitator advances to organize phase
7. Facilitator advances to vote phase
8. Participant completes dot voting
9. Facilitator reveals results
10. Results bar chart is visible on both facilitator and participant views

### E2: Participant reconnection
**File:** `e2e/reconnect.spec.ts`
**Contexts:** Mobile (participant)

1. Participant joins session and submits an answer
2. Close the tab / navigate away
3. Re-open the join URL
4. Verify participant is recognized (cookie-based) and sees their previous submission
5. Can submit another answer without re-joining

### E3: Phase revert with vote cleanup
**File:** `e2e/phase-revert.spec.ts`
**Contexts:** Desktop (facilitator) + Mobile (participant)

1. Facilitator creates session, advances to vote phase
2. Participant submits votes
3. Facilitator clicks revert to organize
4. Confirmation dialog appears warning about vote deletion
5. Confirm revert
6. Verify phase is organize, votes are deleted
7. Advance to vote again -> voting round is fresh (no previous votes)

### E4: Multi-mode voting rounds
**File:** `e2e/multi-round.spec.ts`
**Contexts:** Desktop (facilitator) + Mobile (participant)

1. Facilitator creates session with postIts, advances to vote
2. Round 1: dot voting -> participant votes -> facilitator reveals
3. Round 2: facilitator starts stock rank round -> participant ranks -> reveal
4. Results panel shows round tabs (Round 1, Round 2)
5. Clicking Round 1 tab shows dot voting results (bar chart)
6. Clicking Round 2 tab shows stock rank results (avg rank chart)

---

## Test Count Summary

| Priority | Category | Tasks | Test cases |
|----------|----------|-------|------------|
| HIGH | Backend unit | 12 | ~80 |
| MEDIUM | Component | 6 | ~35 |
| LOWER | E2E | 4 | ~25 |
| **Total** | | **22** | **~140** |

## Implementation Notes

### convex-test setup pattern
```ts
import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";

describe("myModule", () => {
  test("does something", async () => {
    const t = convexTest(schema);
    // For authenticated operations:
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {});
    });
    const asUser = t.withIdentity({ subject: userId });
    // Call mutations/queries:
    await asUser.mutation(api.sessions.create, { question: "Test?" });
    const sessions = await asUser.query(api.sessions.list, {});
    expect(sessions).toHaveLength(1);
  });
});
```

### Component test pattern
```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, test, expect, vi } from "vitest";

// Mock Convex hooks
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));
```

### E2E test pattern
```ts
import { test, expect } from "@playwright/test";

test("full workshop flow", async ({ browser }) => {
  const facilitator = await browser.newContext();
  const participant = await browser.newContext({
    ...devices["iPhone 13"],
  });
  // ... test steps
});
```
