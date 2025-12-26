# NewsLab v1.0 - Project Plan

**Status**: Ready for Implementation  
**Last Updated**: December 2025  
**Target Audience**: AI Agent (Code Lead), Project Lead, Development Team

---

## 1. Project Overview

**NewsLab** is a zero-login, mobile-first, collaborative CMS for journalism training. It enables teams of journalists to create, edit, and publish stories in real-time without authentication barriers, while trainers manage sessions and content.

**Core Philosophy**: No barriers to entry. No passwords. One Room ID per training session. Team-based collaboration. Trainer-controlled access.

---

## 2. Technical Stack (Locked)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Svelte + Vite | Fast, low context, minimal overhead |
| Database | Supabase (PostgreSQL) | Real-time, Postgres reliability, easy Realtime |
| Storage | Cloudinary (unsigned uploads) | Image manipulation, no server-side processing |
| Embeds | YouTube/Vimeo/Audio URLs | External only, no hosting |
| Styling | Tailwind CSS | Mobile-first, high contrast, utilities |
| Client State | localStorage | Identity persistence, offline drafts |
| Offline | Browser Cache + localStorage | No Service Worker initially; may add in Phase 4 |
| PDF Export | jsPDF + html2canvas | Client-side generation, no server cost |
| Deployment | Cloudflare Pages + GitHub | Fast edge deployment, auto-sync from repo |

---

## 3. Core Concepts

### 3.1 NewsLab (Training Session)
- **NewsLab ID**: Alphanumeric string (e.g., `nigeria-0125`). Provided by trainer. Unique per training session.
- **NewsLab Password**: Same as NewsLab ID. Single gate for all journalists.
- **Trainer Password**: Separate (e.g., `trainer-admin`). Grants trainer-only access.
- **Lifecycle**: Created by trainer. Exists for duration of training. Deleted by trainer at end with "Clear NewsLab" button.

### 3.2 Team (Group of Journalists)
- **Team Name**: Agreed upon by journalists. Examples: "Team Lagos", "Photo Team", "Solo".
- **Membership**: Fluid. Journalists select team name in settings.
- **Team Stream**: All stories published by team members in that team.
- **Auto-Deletion**: Team is deleted from Supabase when last member leaves.
- **Trainer View**: Trainer sees all teams in the NewsLab and can remove members.

### 3.3 Journalist (Participant)
- **Identity**: Personal name (e.g., "Zainab"). Unique per room.
- **Persistence**: Name + Team Name saved to localStorage.
- **Access**: Can create, edit (if allowed), and publish stories to their team stream.
- **Edit Lock**: Only one journalist can edit a story at a time. Others see "Story is being edited" message.

### 3.4 Trainer (Administrator)
- **Entry**: Via separate Trainer Password at gatekeeper.
- **View**: All teams, all journalists, all stories across the room.
- **Permissions**:
  - View all team streams (dashboard)
  - Edit any story
  - Delete individual stories
  - Remove journalists from teams
  - Reset Room ID / Trainer Password
  - "Clear Room" (delete all data at end of training)
  - Export PDFs and JSONs
  - View activity log

---

## 4. Database Schema

```sql
-- NewsLabs (training sessions)
CREATE TABLE newslabs (
  id UUID PRIMARY KEY,
  newslab_id TEXT UNIQUE NOT NULL,        -- e.g., "nigeria-0125"
  password TEXT NOT NULL,               -- Same as newslab_id
  trainer_password TEXT NOT NULL,       -- e.g., "trainer-admin"
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Journalists (participants)
CREATE TABLE journalists (
  id UUID PRIMARY KEY,
  newslab_id TEXT NOT NULL,
  name TEXT NOT NULL,
  team_name TEXT,                       -- May be NULL initially
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(newslab_id, name),
  FOREIGN KEY(newslab_id) REFERENCES newslabs(newslab_id) ON DELETE CASCADE
);

-- Teams
CREATE TABLE teams (
  id UUID PRIMARY KEY,
  newslab_id TEXT NOT NULL,
  team_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(newslab_id, team_name),
  FOREIGN KEY(newslab_id) REFERENCES newslabs(newslab_id) ON DELETE CASCADE
);

-- Stories
CREATE TABLE stories (
  id UUID PRIMARY KEY,
  newslab_id TEXT NOT NULL,
  team_name TEXT NOT NULL,
  author_name TEXT NOT NULL,            -- Original creator
  title TEXT,
  summary TEXT,
  featured_image_url TEXT,              -- Cloudinary URL
  content JSONB,                        -- Rich text: { blocks: [{ type, text/url }] }
  status TEXT DEFAULT 'draft',          -- 'draft' or 'published'
  category TEXT,
  is_pinned BOOLEAN DEFAULT FALSE,
  allow_collab BOOLEAN DEFAULT TRUE,    -- If false, only author_name can edit
  locked_by TEXT,                       -- Current editor's name (NULL if unlocked)
  locked_at TIMESTAMP,                  -- When lock was acquired
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY(newslab_id) REFERENCES newslabs(newslab_id) ON DELETE CASCADE
);

-- Activity Log (trainer visibility)
CREATE TABLE activity_log (
  id UUID PRIMARY KEY,
  newslab_id TEXT NOT NULL,
  team_name TEXT,
  journalist_name TEXT,
  action TEXT,                          -- 'published', 'edited', 'joined_team', 'left_team'
  story_id UUID,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY(newslab_id) REFERENCES newslabs(newslab_id) ON DELETE CASCADE
);
```

---

## 5. User Flows

### 5.1 Journalist Entry Flow
1. **NewsLab Entry Screen**: Input NewsLab ID (e.g., "nigeria-0125")
2. **Name Validation**: Input personal name → Check against journalists table
   - ✅ Available: Green tick, proceed
   - ❌ Taken: Red X, "Name in use. Try again"
3. **Team Selection** (Settings after entry):
    - Input team name → Check against teams table
    - If new team: Create team, add journalist. Green tick. Show "Team Members" list (one person).
    - If existing team: Join team. Green tick. Show all team members.
4. **Save to localStorage**: `{ newslabId, name, teamName }`
5. **Redirect**: → `/[newslab-id]/stream`

### 5.2 Story Creation & Publishing Flow
1. **Create Screen**: Journalist taps "+ New Story"
2. **Editor**:
    - Headline (required)
    - Summary (optional)
    - Featured Image (16:9, resized client-side to 800x450px via Canvas before upload to Cloudinary)
    - Body (rich text: bold, subheads, lists)
    - YouTube/Vimeo/Audio URL embeds (optional)
3. **Save as Draft**: Saves to localStorage (every 3s, debounced)
4. **Publish**: Sends to Supabase, status='published', appears in team stream instantly (Realtime subscription)

### 5.3 Concurrent Edit Handling
1. **Journalist A** clicks "Edit Story X"
   - Set `stories.locked_by = "Journalist A"`, `locked_at = NOW()`
   - Editor loads
2. **Journalist B** clicks "Edit Story X"
   - Query returns `locked_by != NULL`
   - Show message: "Story is being edited by [Journalist A]"
   - No editor access
3. **Journalist A** clicks "Save"
   - Update story, set `locked_by = NULL`
   - Broadcast update via Realtime
4. **Auto-Unlock**: If lock is held > 1 min without activity, unlock automatically (cron job or Supabase function)

### 5.4 Team Management Flow
1. **Journalist in Settings**:
   - Personal Name (locked after initial setup)
   - Team Name input (with validation)
   - "Team Members" list shows all journalists in that team
   - Next to each member name: "X" button to remove
   - Tapping "X" next to own name: "Leave Team" confirmation → Remove from team
2. **Joining Different Team**:
   - Tap "X" next to own name (leave current team)
   - Input new team name in Team Name field
   - Confirm → Join new team
3. **Auto-Deletion**:
   - When last journalist leaves a team, team row is deleted from teams table

### 5.5 Trainer Admin Flow
1. **Gatekeeper**: Input Room ID + Trainer Password → Granted access
2. **Trainer Dashboard** (`/trainer/dashboard`):
   - All teams listed with member count
   - All published stories across all teams
   - Activity log (who published what, when)
3. **Settings** (`/trainer/settings`):
   - Reset Room ID / Trainer Password
   - View all teams and members
   - Remove journalists from teams (X next to each name)
   - "Clear Room" button → Confirm → Delete all data (rooms, teams, stories, journalists)
4. **Edit Story**: Trainer can edit any published story (no lock restriction)
5. **Export**:
   - PDF: Individual story or entire team stream (one PDF, stories as sections)
   - JSON: Team streams individually or entire training session

---

## 6. Phase-by-Phase Roadmap

### Phase 0: Environment & Schema (Setup)
**Deliverables**: 
- [ ] Svelte project initialized with Vite, Tailwind CSS
- [ ] Supabase project created, client configured
- [ ] Cloudinary account + unsigned upload preset configured
- [ ] GitHub repo created, linked to Cloudflare Pages
- [ ] Database schema created and deployed
- [ ] `.env.local` with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET`
- [ ] TypeScript strict mode enabled
- [ ] Tailwind color palette finalized (brand colors provided)
- [ ] SVG assets provided and added to `/static`

**Blockers**: Credentials from Supabase, Cloudinary, GitHub, Cloudflare

---

### Phase 1: Identity & Routing
**Deliverables**:
- [ ] NewsLab Entry page: NewsLab ID, Personal Name, Trainer Password inputs
- [ ] Personal name validation (check journalists table)
- [ ] Trainer detection logic
- [ ] localStorage persistence: `{ newslabId, name, role, teamName }`
- [ ] Route guards: `/[newslab-id]/*` requires valid newslab + name in localStorage
- [ ] Redirect logic: Logged-in users → `/[newslab-id]/stream`, Trainers → `/trainer/dashboard`
- [ ] Logout button (clear localStorage)

**Testing**:
- [ ] Invalid NewsLab ID shows error
- [ ] Duplicate name shows red X
- [ ] Refresh page: user stays logged in (localStorage persists)
- [ ] Trainer password grants `/trainer/*` access

---

### Phase 2: Team Management & Settings
**Deliverables**:
- [ ] Settings page: Personal Name (read-only), Team Name input
- [ ] Team name validation (check teams table, create if new)
- [ ] Team Members list (query journalists by team_name + newslab_id)
- [ ] Leave Team button (X next to own name)
- [ ] Auto-deletion: When journalist leaves and becomes sole member, delete team
- [ ] Auto-update: When another journalist joins same team name, Team Members list updates in real-time
- [ ] Trainer view: All teams + all members in dashboard with removal X buttons

**Testing**:
- [ ] Create new team: Available name shows green tick
- [ ] Join existing team: Team Members list updates in real-time
- [ ] Leave team: Removed from journalists table, redirect to settings
- [ ] Last member leaves: Team deleted from teams table
- [ ] Trainer can remove any journalist from any team

---

### Phase 3: Editor & Story Management
**Deliverables**:
- [ ] Story creation page: Headline, Summary, Featured Image, Body (rich text), Embeds
- [ ] Image upload flow:
   - [ ] File input → Canvas resize to 800x450px (16:9)
   - [ ] Cloudinary unsigned upload
   - [ ] Show preview
   - [ ] Error handling: "Need internet to upload images"
- [ ] Rich text editor: Bold, subheads, lists, paragraphs
- [ ] Embed fields: YouTube URL, Vimeo URL, Audio URL → Transform to iframes
- [ ] localStorage auto-save: Every 3s (debounced), saves full story to `draft_[newslabId]_[teamName]`
- [ ] Save as Draft: Explicit button, saves to Supabase with status='draft'
- [ ] Publish: Button saves to Supabase, status='published', locked_by=NULL
- [ ] Edit existing story:
   - [ ] Lock mechanism: Set locked_by, locked_at
   - [ ] Check lock before allowing edit: If locked_by != NULL, show message
   - [ ] Auto-unlock: 1-minute timeout (cron job or Supabase function)
- [ ] Edit Rules:
   - [ ] If allow_collab=true: Any team member can edit
   - [ ] If allow_collab=false: Only author_name can edit (show warning if other team member tries)

**Testing**:
- [ ] Image upload: Resize works, Cloudinary integration, fallback if offline
- [ ] Rich text: All formatting renders correctly
- [ ] Auto-save: localStorage updates every 3s
- [ ] Publish: Story appears in team stream within 1s (Realtime)
- [ ] Lock: User A editing → User B gets "being edited" message
- [ ] Auto-unlock: After 1 min, story becomes editable by others
- [ ] Offline: Draft saves to localStorage, image upload shows error

---

### Phase 4: Team Stream & Real-Time Collaboration
**Deliverables**:
- [ ] Journalist Team Stream page (`/[newslab-id]/stream`):
   - [ ] Display all published stories from own team
   - [ ] Sort: Pinned stories first, then newest first
   - [ ] Each story card: Title, summary, featured image, author name, timestamp
   - [ ] "Edit" button (if user is author or allow_collab=true, and not locked)
   - [ ] "Delete" button (if user is author)
   - [ ] Real-time subscription: New stories appear instantly via Supabase `.on('*')`
- [ ] Trainer Dashboard (`/trainer/dashboard`):
   - [ ] All teams listed (cards or list)
   - [ ] All published stories across all teams
   - [ ] Activity log: Who published what, when (sortable by team, journalist, date)
   - [ ] Team member list for each team (with count)
- [ ] Team Stream Pagination:
   - [ ] Load initial 10 stories, "Load More" button for next 10
   - [ ] Cursor-based pagination (use created_at as cursor)
- [ ] Pin/Unpin stories (trainer only, or team members with permission)
- [ ] Delete story (author or trainer only)

**Testing**:
- [ ] Two journalists: One publishes → Other sees in team stream within 1s
- [ ] Pinned story appears at top of stream
- [ ] Pagination: 10 stories load, "Load More" fetches next 10
- [ ] Trainer sees all teams' stories in one view
- [ ] Activity log is accurate and real-time

---

### Phase 5: Offline Sync & Drafts
**Deliverables**:
- [ ] Offline detection: `navigator.onLine` listener
- [ ] Offline indicator: Red banner at top of app when offline
- [ ] Draft persistence:
  - [ ] Auto-save to localStorage every 3s
  - [ ] Drafts survive app close/refresh
- [ ] Sync on reconnect:
  - [ ] When `window.online` event fires, sync queued drafts to Supabase
  - [ ] Toast notification: "Draft synced!"
  - [ ] Clear localStorage after successful sync
- [ ] Image uploads while offline:
  - [ ] Show "Pending" state
  - [ ] Queue upload for when online
  - [ ] Retry automatically
- [ ] Conflict resolution:
  - [ ] Last-write-wins: Newer timestamp overwrites older
  - [ ] Acceptable for training context (non-critical data)

**Testing**:
- [ ] Go offline, continue editing story → Draft saves to localStorage
- [ ] Go online → Draft syncs to Supabase automatically
- [ ] Go offline, try to upload image → Error message, upload queued
- [ ] Go online → Image uploads automatically
- [ ] Publish offline: Show error, queue for sync

---

### Phase 6: PDF Export
**Deliverables**:
- [ ] Individual story PDF export:
  - [ ] Include title, summary, featured image, body, author, date
  - [ ] Use jsPDF + html2canvas for client-side generation
- [ ] Team stream PDF export:
  - [ ] All published stories from a team (one per page)
  - [ ] Include team name, date range, team members list
- [ ] Trainer export options:
  - [ ] Individual story PDF
  - [ ] Team stream PDF
  - [ ] Entire training session JSON: All teams, all stories, all metadata (nice-to-have; may simplify to team streams JSON only)
- [ ] Testing on different image sizes / content lengths

**Testing**:
- [ ] Single story exports cleanly to PDF
- [ ] Team stream PDF has correct page breaks
- [ ] Images render correctly in PDF
- [ ] JSON export is valid and imports correctly (if implemented)
- [ ] PDF generation works offline (no server call needed)

---

### Phase 7: Trainer Admin & Cleanup
**Deliverables**:
- [ ] Trainer Settings page (`/trainer/settings`):
   - [ ] Display current NewsLab ID, Trainer Password
   - [ ] Reset NewsLab ID button → Generate new ID, update Supabase
   - [ ] Reset Trainer Password button → Generate new password
   - [ ] "Clear NewsLab" button → Confirmation dialog → Delete all data (newslabs, teams, stories, journalists, activity_log)
- [ ] Trainer can edit any story (route guard removes lock restriction)
- [ ] Trainer can delete stories from dashboard
- [ ] Trainer can remove journalists from teams
- [ ] Activity log visible and downloadable (nice-to-have)

**Testing**:
- [ ] Reset NewsLab ID: Old ID no longer grants access, new ID does
- [ ] Reset Trainer Password: Old password no longer works
- [ ] Clear NewsLab: All data deleted, newslab_id can be reused (or archived)
- [ ] Trainer can edit locked story (no "being edited" message)

---

### Phase 8: Polish & Testing
**Deliverables**:
- [ ] TypeScript types: All functions have strict types
- [ ] Error handling: User-friendly messages for all failures
- [ ] Accessibility: WCAG 2.1 AA (focus states, color contrast, aria labels)
- [ ] Mobile testing: iOS Safari, Android Chrome
- [ ] Performance: Lighthouse score > 85
- [ ] Security audit: No XSS, SQL injection, CSRF vulnerabilities
- [ ] E2E tests (Playwright or Cypress):
  - [ ] Full flow: Gatekeeper → Create story → Publish → See in feed
  - [ ] Concurrent edit lock
  - [ ] Team management
  - [ ] Trainer admin (clear room)
- [ ] Documentation: README with setup instructions

---

## 7. Testing Strategy

### Unit Tests
- [ ] Name validation logic
- [ ] Team name validation logic
- [ ] Image resize algorithm
- [ ] Rich text block formatting
- [ ] Offline sync queue logic

### Integration Tests
- [ ] Gatekeeper → Feed flow
- [ ] Story publish → Feed update (Realtime)
- [ ] Team creation → Journalist joins same team
- [ ] Concurrent edit lock

### E2E Tests (Playwright/Cypress)
- [ ] Full journalist flow: Login → Create story → Publish → View in feed
- [ ] Trainer admin: Reset password → Clear room
- [ ] Offline: Edit draft → Go online → Sync
- [ ] Mobile: All flows on iOS Safari, Android Chrome

### Manual Testing Checklist
- [ ] All SVG icons render correctly
- [ ] Color palette applied consistently
- [ ] No layout shifts (Cumulative Layout Shift < 0.1)
- [ ] Tap targets >= 48px on mobile
- [ ] Images load quickly (Cloudinary optimization working)
- [ ] PDF exports render correctly with all content types
- [ ] Activity log is accurate

---

## 8. Deployment Strategy

1. **Development**: Local testing with Supabase local instance (optional) or dev project
2. **Staging**: Deploy to Cloudflare Pages from `staging` branch
3. **Production**: Deploy to Cloudflare Pages from `main` branch
4. **Secrets**: Store credentials in Cloudflare Pages environment variables, never in `.env`

---

## 9. Success Criteria

- ✅ Journalists can create, edit, publish stories with zero friction
- ✅ Teams collaborate in real-time (updates within 1s)
- ✅ Trainer has full visibility and control
- ✅ Offline editing works seamlessly
- ✅ Concurrent edits are blocked (no overwrites)
- ✅ PDFs export correctly
- ✅ Mobile-first UX (no hover, 48px+ tap targets)
- ✅ All user stories from the spec are complete

---

## 10. Known Constraints & Decisions

| Constraint | Decision | Rationale |
|-----------|----------|-----------|
| No moderation | Not included | Added complexity; trainer can monitor manually |
| Concurrent edits | Lock one at a time, 1-min auto-unlock | Prevents data loss, simple to implement |
| Image size | 800x450px (16:9) | Mobile-friendly, Cloudinary optimization |
| Offline sync | Last-write-wins | Acceptable for training (non-critical data) |
| Passwords | Shared room password + separate trainer password | Matches "zero-login" philosophy, simple UX |
| PDF library | jsPDF + html2canvas | Client-side, no server cost, good browser support |
| Service Worker | Not included in Phase 0-6; may add in future | localStorage + browser cache sufficient for training context |
| Team removal | Auto-delete team when last member leaves | Simplifies data model, prevents orphaned teams |

---

## 11. Questions for Project Lead

- [ ] SVG assets ready? (icons, buttons, logo variants)
- [ ] Brand colors / Tailwind palette finalized?
- [ ] Wireframes for key screens (NewsLab entry, editor, team stream, trainer dashboard)?
- [ ] Story templates provided?
- [ ] Supabase/Cloudinary credentials ready for Phase 0?
- [ ] Estimated journalist count per training session? (affects pagination strategy)

---

**End of Plan. Ready for Phase 0 startup.**
