# NewsLab v1.0

**Purpose:** Complete technical reference for AI agents implementing NewsLab.  
**Audience:** Code leads, developers, AI agents  
**Status:** Ready for implementation  
**Last Updated:** December 2025

---

## Quick Start for AI Agents

## About the app
- NewsLab is a simple, non-commercial mobile-first CMS for use by journalists during training courses. It aims to encourage collaboraiton, teamwork and creativity.It is live on CloudFlare Pages at: thenewslab.pages.dev, via GitHub.

### Core Workflows (Fast Reference)

**1. User Login**
- Splash screen (`src/routes/+page.svelte`)
- Step 1: Validate Course ID, Trainer ID, or Guest Editor ID → Returns `role` + `courseId`
- Step 2: Validate byline name (unique per course) → Create journalist record
- Result: Store session in localStorage, redirect to `/[courseId]/home`
- Key functions: `validateCourseId()`, `validateByline()` in `src/lib/auth.ts`

**2. Write & Publish Story**
- Click "Write" → `WriteDrawer.svelte` opens (bottom-up slide)
- Journalist must join a team first (or story stays in drafts)
- Save as draft: Updates `stories` table with `status='draft'`
- Publish: Updates `status='published'`, adds to team stream
- Key functions: `createStory()`, `updateStory()` in `src/lib/stories.ts`

**3. Team Stream (Published Stories)**
- Fetch all published stories for a team, ordered by: `is_pinned DESC`, `pin_timestamp DESC`, `created_at DESC`
- Editors can edit/delete/pin stories in stream
- Non-editors can only view
- Key functions: `getTeamStream()` in `src/lib/stories.ts`

**4. Settings & Permissions**
- Settings page (`src/routes/[courseId]/settings/+page.svelte`)
- Journalists: Change team, edit own published stories
- Editors: Change team settings (colors, logo, name), manage team members
- Trainers: Access Teams & Admin tabs, edit all stories, manage course
- Guest Editors: Access Teams tab, edit all stories (same as trainer for stories)

### Key Permission Boundaries

| User Type | Can Edit | Can Delete | Can Pin | Can Manage Teams |
|-----------|----------|-----------|--------|-----------------|
| Journalist (non-editor) | Own stories only | Own drafts only | ❌ | ❌ |
| Journalist (editor) | All team stories | All team stories | ✅ | ✅ (own team) |
| Trainer | All stories | All stories | ✅ | ✅ (all teams) |
| Guest Editor | All stories | All stories | ✅ | ✅ (view only) |

**Enforcement:** Permission checks happen in component logic and story functions. No server-side API layer currently.

### Critical File Locations

| What | Where |
|------|-------|
| Session & stores | `src/lib/stores.ts` |
| Authentication | `src/lib/auth.ts` |
| Story CRUD | `src/lib/stories.ts` |
| Database setup | `src/lib/supabase.ts` |
| Types | `src/lib/types.ts` |
| Login page | `src/routes/+page.svelte` |
| Home (drafts/published) | `src/routes/[courseId]/home/+page.svelte` |
| Team stream | `src/routes/[courseId]/stream/+page.svelte` |
| Settings | `src/routes/[courseId]/settings/+page.svelte` |
| Public share | `src/routes/share/[teamName]/+page.svelte` |
| Main editor | `src/components/WriteDrawer.svelte` (1336 lines) |

### Common Patterns for AI Agents

**Pattern 1: Fetch & Display List**
```typescript
const { data: stories, error } = await getTeamStream(courseId, teamName)
if (error) showNotification('error', 'Failed to load')
// Display stories with StoryCard component
```

**Pattern 2: Check Permissions**
```typescript
const canEdit = isEditor || isTrainer || isGuestEditor
if (!canEdit) return  // Exit early
// Proceed with edit
```

**Pattern 3: Update Story State**
```typescript
const { data, error } = await updateStory(storyId, { title: 'New Title' })
if (!error) editingStory.markSaved()
showNotification(error ? 'error' : 'success', error || 'Saved')
```

**Pattern 4: Subscribe to Realtime Changes**
```typescript
const subscription = supabase
  .from('stories')
  .on('*', (payload) => {
    if (payload.new.course_id === courseId) {
      // Handle update/insert/delete
    }
  })
  .subscribe()
// Cleanup: subscription.unsubscribe()
```

---

## Table of Contents

1. [Database Schema](#database-schema)
2. [Permission Model](#permission-model)
3. [Authentication Flow](#authentication-flow)
4. [Story Management](#story-management)
5. [Realtime Subscriptions](#realtime-subscriptions)
6. [Rich Text Content](#rich-text-content)
7. [State Management](#state-management)
8. [Component Architecture](#component-architecture)
9. [Error Handling](#error-handling)
10. [Performance Targets](#performance-targets)
11. [Cloudinary Integration](#cloudinary-integration)

---

## Database Schema

### newslabs
```sql
CREATE TABLE newslabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT UNIQUE NOT NULL,                    -- e.g., "nigeria-0126"
  trainer_id TEXT UNIQUE NOT NULL,                   -- Trainer password
  guest_editor_id TEXT UNIQUE,                       -- Optional guest editor password
  fallback_image_url TEXT,                           -- Default thumbnail for stories without images
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_newslabs_course_id ON newslabs(course_id);
CREATE UNIQUE INDEX idx_newslabs_trainer_id ON newslabs(trainer_id);
CREATE UNIQUE INDEX idx_newslabs_guest_editor_id ON newslabs(guest_editor_id) WHERE guest_editor_id IS NOT NULL;
```

**Constraints:** `course_id` (3-20 chars, alphanumeric), `trainer_id` (8-20 chars, unique), `guest_editor_id` (optional, unique if present)

### journalists
```sql
CREATE TABLE journalists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL,
  name TEXT NOT NULL,                                -- Personal name, max 30 characters
  team_name TEXT,                                   -- NULL if not in a team yet
  is_editor BOOLEAN DEFAULT FALSE,                  -- Can edit team settings + all stories in team stream
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(course_id, name),
  FOREIGN KEY(course_id) REFERENCES newslabs(course_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_journalists_course_name ON journalists(course_id, name);
CREATE INDEX idx_journalists_course_team ON journalists(course_id, team_name);
CREATE INDEX idx_journalists_course ON journalists(course_id);
```

**Constraints:** `name` (max 30, unique per course), `team_name` (can be NULL), `is_editor` (boolean flag)

### teams
```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL,
  team_name TEXT NOT NULL,                          -- Unique per course
  primary_color TEXT DEFAULT '5422b0',              -- Hex color (dark theme)
  secondary_color TEXT DEFAULT 'f0e6f7',            -- Hex color (light contrast)
  logo_url TEXT,                                    -- Cloudinary URL, square image
  public_share_token TEXT UNIQUE,                   -- UUID for public read-only URL
  share_enabled BOOLEAN DEFAULT FALSE,              -- Toggle public sharing on/off
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(course_id, team_name),
  FOREIGN KEY(course_id) REFERENCES newslabs(course_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_teams_course_name ON teams(course_id, team_name);
CREATE INDEX idx_teams_course ON teams(course_id);
CREATE UNIQUE INDEX idx_teams_share_token ON teams(public_share_token) WHERE public_share_token IS NOT NULL;
```

**Color Palettes (7 options - select one per team):**
```javascript
export const COLOR_PALETTES = [
  { name: 'Indigo Bloom', primary: '5422b0', secondary: 'f0e6f7' },      // Default
  { name: 'Black Forest', primary: '02441f', secondary: 'f3fde7' },
  { name: 'Yale Blue', primary: '004269', secondary: 'e8f5fd' },
  { name: 'Golden Earth', primary: '935D00', secondary: 'FFF8EB' },
  { name: 'Molten Lava', primary: '801c00', secondary: 'ffedec' },
  { name: 'Inferno', primary: 'ab0000', secondary: 'ffe4e4' },
  { name: 'Graphite', primary: '333333', secondary: 'EFEFEF' }
] as const
```

### stories
```sql
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL,
  team_name TEXT NOT NULL,                          -- Team where story appears
  author_name TEXT NOT NULL,                        -- Creator's name
  title TEXT NOT NULL,                              -- Headline (required)
  summary TEXT,                                     -- Optional summary
  featured_image_url TEXT,                          -- Cloudinary URL
  content JSONB,                                    -- Rich text blocks
  status TEXT DEFAULT 'draft',                      -- 'draft' or 'published'
  is_pinned BOOLEAN DEFAULT FALSE,                  -- Pinned in team stream
  pin_index INTEGER,                                -- Order for pinned stories (0=newest, 2=oldest)
  pin_timestamp TIMESTAMP,                          -- When pinned (for ordering)
  locked_by TEXT,                                   -- Current editor's name (NULL if unlocked)
  locked_at TIMESTAMP,                              -- When lock acquired
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY(course_id) REFERENCES newslabs(course_id) ON DELETE CASCADE
);

CREATE INDEX idx_stories_course_status ON stories(course_id, status);
CREATE INDEX idx_stories_course_team_status ON stories(course_id, team_name, status);
CREATE INDEX idx_stories_author ON stories(course_id, author_name);
CREATE INDEX idx_stories_pinned ON stories(course_id, team_name, is_pinned) WHERE is_pinned = true;
```

**Constraints:** `title` (required, non-empty), `status` ('draft' or 'published'), `content` (JSONB blocks), Max 3 pinned stories per team (enforced in app logic)

**Locking Lifecycle:**
- `locked_by = null` → Story is unlocked, multiple users can view
- `locked_by = 'journalist_name'` → Story is being edited, others see lock warning
- Release lock: Set `locked_by = null` (on save or timeout)
- Timeout: 15 minutes of inactivity (client-side tracking)

### activity_log
```sql
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL,
  team_name TEXT,
  journalist_name TEXT,
  action TEXT,                                      -- 'published', 'unpublished', 'edited', 'pinned', 'unpinned', 'deleted', 'joined_team', 'left_team', 'promoted_editor', 'demoted_editor'
  story_id UUID,
  story_title TEXT,
  details JSONB,                                    -- Additional context as needed
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY(course_id) REFERENCES newslabs(course_id) ON DELETE CASCADE
);

CREATE INDEX idx_activity_course ON activity_log(course_id);
CREATE INDEX idx_activity_course_team ON activity_log(course_id, team_name);
CREATE INDEX idx_activity_created ON activity_log(created_at DESC);
```

---

## Permission Model

**Legend:** ✅ Allowed, ❌ Denied

| Action | Journalist | Editor | Trainer | Guest Editor |
|--------|-----------|--------|---------|--------------|
| View/Edit own drafts | ✅ | ✅ | N/A | N/A |
| View/Edit own published | ✅ | ✅ | N/A | N/A |
| View team stream | ✅ | ✅ | ✅ | ✅ |
| Edit stories in stream | ❌ | ✅ (own team) | ✅ (all) | ✅ (all) |
| Pin/unpin stories | ❌ | ✅ (own team) | ✅ (all) | ✅ (all) |
| Delete stories | ❌ | ✅ (own team) | ✅ (all) | ✅ (all) |
| Edit team settings | ❌ | ✅ (own team) | ✅ (all) | ❌ |
| Promote/demote editors | ❌ | ❌ | ✅ | ❌ |
| Access Teams tab | ❌ | ❌ | ✅ | ✅ |
| Access Admin tab | ❌ | ❌ | ✅ | ❌ |
| View activity log | ❌ | ❌ | ✅ | ❌ |
| Clear course | ❌ | ❌ | ✅ | ❌ |
| View public share | ✅ | ✅ | ✅ | ✅ |

**Notes:**
- "Editor" = journalist with `is_editor = true`
- "Journalist" = journalist with `is_editor = false`
- Editors only manage their own team; trainers manage all
- Guest Editor is password-based (not tied to a team)

**Permission Enforcement:**
- **Client-side:** Components check `$isTrainer`, `$isEditor`, `$isJournalist` from stores
- **Data-side:** Story functions (getDrafts, getTeamStream, etc.) filter by `author_name` or `team_name`
- **UI-side:** Buttons/menus conditionally render based on role

---

## Authentication Flow

### Session Storage
```javascript
// localStorage key: 'newslab_session'
{
  courseId: "nigeria-0126",
  name: "Zainab",
  role: "journalist|trainer|guest_editor",
  teamName: "Team Lagos" || null,
  sessionToken: "uuid",
  loginTimestamp: 1703001600000
}
```

### Login Flow (Steps 1-2)

**Step 1: Course/Role ID Entry** (`src/routes/+page.svelte`)
1. User enters ID (Course ID, Trainer ID, or Guest Editor ID)
2. Query: Check `newslabs` for matches:
   - `course_id = input` → role = 'journalist'
   - `trainer_id = input` → role = 'trainer'
   - `guest_editor_id = input` → role = 'guest_editor'
   - `input = 'trainer'` (fallback) → role = 'trainer' (most recent course)
3. If not found → Show error
4. If found → Show check icon, display byline input

**Step 2: Byline Name Entry**
1. User enters personal byline (max 30 characters)
2. Validate: Check `journalists.name` unique in this course
3. If taken → Show error
4. If available → Show check icon
5. On submit:
   - **Journalist role:** Create journalist record if first-time, else validate existing
   - **Trainer/Guest role:** Create journalist record (trainers may join teams for demo), byline stored in session
   - Store session in localStorage
   - Redirect to `/[courseId]/home`

### Key Functions
```typescript
// src/lib/auth.ts
validateCourseId(input: string) → { success, courseId, role } | { success, error }
validateByline(courseId, name, role) → { success, isReturning } | { success, error }
createSession(courseId, name, role) → Session object
validateSession(session) → boolean (checks if journalist record still exists)
```

### Returning User (Same Device)
- localStorage contains valid session → Skip splash, redirect to home

### Returning User (Different Device)
1. Splash appears
2. Enter Course ID again
3. Enter same byline name
4. System validates (course_id, name) in journalists table
5. Redirect to home with full content preserved

---

## Story Management

### Create Story
```typescript
createStory(input: {
  courseId: string
  teamName: string
  authorName: string
  title: string
  summary?: string
  featuredImageUrl?: string
  content?: { blocks: ContentBlock[] }
  status?: 'draft' | 'published'
})
```

### Update Story
```typescript
updateStory(id: string, updates: {
  title?: string
  summary?: string
  featuredImageUrl?: string
  content?: { blocks: ContentBlock[] }
  status?: 'draft' | 'published'
  teamName?: string
  is_pinned?: boolean
})
```

### Fetch Queries
- `getDrafts(courseId, authorName)` → All drafts for journalist
- `getPublished(courseId, authorName)` → All published for journalist
- `getTeamStream(courseId, teamName)` → Published stories, ordered by pin status + timestamp + creation
- `getStory(id)` → Single story by ID
- `getPublicTeamStream(teamName)` → Public share endpoint (no auth, only if `share_enabled = true`)

### Pinning Stories
```typescript
// Max 3 pinned stories per team (enforced in app)
// Order: pin_index (0=newest) or pin_timestamp DESC
updateStory(id, { is_pinned: true, pin_timestamp: NOW(), pin_index: 0 })

// When unpinning, reorder remaining pinned stories
```

### Team Join/Leave
**Join:** Update `journalists.team_name = 'Team Name'`
**Leave:** 
- Revert all published stories back to drafts (prevent orphaning)
- Set `journalists.team_name = null`
- Delete team if no members remain
- Log activity

### Story Lock & Unlock
- Acquire lock: Set `locked_by = journalist_name`, `locked_at = NOW()`
- Release lock: Set `locked_by = null`
- Check lock before edit: If `locked_by != null` and different user, show warning
- Timeout: 15 minutes (client-side; background job can clean up stale locks)

---

## Realtime Subscriptions

### Pattern: Subscribe to Story Changes
```typescript
supabase
  .from('stories')
  .on('*', (payload) => {
    if (payload.new.course_id === courseId &&
        payload.new.team_name === teamName) {
      // Update story in local state
    }
  })
  .subscribe()
```

### Pattern: Subscribe to Team Members
```typescript
supabase
  .from('journalists')
  .on('*', (payload) => {
    if (payload.new.course_id === courseId &&
        payload.new.team_name === teamName) {
      // Refresh team members list
    }
  })
  .subscribe()
```

### Pattern: Subscribe to Activity Log (Trainer Only)
```typescript
supabase
  .from('activity_log')
  .on('INSERT', (payload) => {
    if (payload.new.course_id === courseId) {
      // Add entry to activity log
    }
  })
  .subscribe()
```

### Cleanup
Always unsubscribe on component destroy:
```typescript
onDestroy(() => {
  subscription?.unsubscribe()
})
```

---

## Rich Text Content

### Block Structure (JSONB)
```javascript
{
  blocks: [
    {
      type: 'paragraph',
      text: 'This is a paragraph.'
    },
    {
      type: 'heading',
      text: 'This is an H2 subheading'
    },
    {
      type: 'bold',
      text: 'Bold text portion'
    },
    {
      type: 'list',
      listType: 'ordered' | 'unordered',
      items: ['First', 'Second', 'Third']
    },
    {
      type: 'separator'
    },
    {
      type: 'image',
      url: 'https://cloudinary.com/image.jpg',
      caption: 'Image caption',
      width: 800,
      height: 450,
      aspectRatio: '16:9'
    },
    {
      type: 'youtube',
      url: 'https://youtube.com/watch?v=xxx',
      title: 'Video title'
    },
    {
      type: 'vimeo',
      url: 'https://vimeo.com/xxx',
      title: 'Video title'
    },
    {
      type: 'link',
      url: 'https://example.com',
      text: 'Link text',
      color: '5422b0'  // Team primary color
    }
  ]
}
```

### Rendering (Published Stories)
Each block type converts to HTML:
- `paragraph` → `<p>`
- `heading` → `<h2>`
- `bold` → `<strong>`
- `list` → `<ul>` or `<ol>`
- `separator` → `<hr>`
- `image` → `<figure><img /></figure>`
- `youtube` → `<iframe>` (embed URL)
- `vimeo` → `<iframe>`
- `link` → `<a>` with team color

---

## State Management

### Core Stores (`src/lib/stores.ts`)

**Session Store:**
```typescript
export const session = createSessionStore()
// Methods: .set(session), .logout(), .subscribe()
// Auto-persists to localStorage
```

**Derived Stores:**
```typescript
export const isLoggedIn     // boolean
export const isTrainer      // boolean
export const isGuestEditor  // boolean
export const isJournalist   // boolean
```

**Drawer State:**
```typescript
export const writeDrawerOpen        // boolean
export const storyReaderDrawerOpen  // boolean
export const previewDrawerOpen      // boolean
```

**Current Story (Viewing):**
```typescript
export const currentViewingStory
// { id, title, story: Story } | null
```

**Editing Story:**
```typescript
export const editingStory
// Methods: .set(story), .loadStory(partial), .markDirty(), .markSaved(), .reset()
// Tracks: isDirty, lastSaved, all content fields
```

**Team Colors:**
```typescript
export const teamColors
// { primary: string, secondary: string }
// Updates when user changes team or team theme
```

**Notification:**
```typescript
showNotification(type: 'success' | 'error' | 'info', message: string, duration = 2000)
// Auto-hides after duration
```

---

## Component Architecture

### Pages (SvelteKit Routes)
- `src/routes/+page.svelte` — Splash/login
- `src/routes/[courseId]/home/+page.svelte` — Home (drafts/published tabs)
- `src/routes/[courseId]/stream/+page.svelte` — Team stream
- `src/routes/[courseId]/settings/+page.svelte` — Settings
- `src/routes/share/[teamName]/+page.svelte` — Public share

### Layout Components
- `FooterNav.svelte` — 4-button footer (home, write, stream, settings)
- `Notification.svelte` — Toast notifications

### Drawers (Full-screen)
- `WriteDrawer.svelte` — Story editor (bottom-up)
- `PreviewDrawer.svelte` — Preview during edit (left-to-right)
- `StoryReaderDrawer.svelte` — Story viewer (bottom-up)

### Forms & Inputs
- `HeadlineInput.svelte` — Title with character count
- `SummaryInput.svelte` — Summary textarea
- `ImageUploader.svelte` — Featured image upload
- `RichTextEditor.svelte` — Content editor blocks
- `TeamNameInput.svelte` — Team name with validation
- `ColorPalette.svelte` — 7-color selector
- `TeamLogoUpload.svelte` — Logo upload (Cloudinary)

### Cards & Lists
- `StoryCard.svelte` — Thumbnail + metadata
- `ThreeDotsMenu.svelte` — Context menu (edit, delete, pin, etc.)
- `TeamMemberItem.svelte` — Member name + remove/promote buttons
- `ActivityLogRow.svelte` — Single activity entry

### Settings Tabs
- `TeamsTab.svelte` — View all teams (trainer/guest editor only)
- `AdminTab.svelte` — Course controls (trainer only)

### Component Communication
- **Props:** Typed data passing
- **Events:** Custom events for actions (edit, delete, pin)
- **Stores:** Shared state (session, notification, editing story)
- **Example:**
  ```javascript
  // StoryCard accepts: story, isEditor, onEdit, onDelete
  // Dispatches: edit, delete events
  // Updates: notification store on action
  ```

---

## Error Handling

### Error Types & User Messages
- **Network error:** "Network error. Please check your connection."
- **Validation error:** "Please fill in all required fields."
- **Auth error:** "Your session has expired. Please log in again." + redirect to splash
- **Story locked:** "Story is being edited by [name]" (warning, not error)
- **Upload error:** "Failed to upload image. Please try again."
- **Unique constraint:** "That name is already taken."
- **Foreign key violation:** "Invalid team. Please select a valid team."

### Try-Catch Pattern
```typescript
try {
  const result = await someAsyncOperation()
} catch (error) {
  console.error('Operation failed:', error)
  if (error.message.includes('UNIQUE')) {
    showNotification('error', 'That name is already taken.')
  } else if (error.message.includes('FOREIGN KEY')) {
    showNotification('error', 'Invalid team.')
  } else {
    showNotification('error', 'Something went wrong. Please try again.')
  }
}
```

---

## Performance Targets

### Lighthouse (Mobile)
- Score: ≥ 85
- First Contentful Paint: < 2s
- Largest Contentful Paint: < 2.5s
- Interaction to Next Paint: < 200ms
- Cumulative Layout Shift: < 0.1

### Images
- Featured images: Max 800px width, lossy compression (q_80)
- Team logos: 1:1 aspect ratio, max 200KB
- Thumbnails: 300px max, lossy compression
- Cloudinary transformations: `w_800,q_80,f_auto`

### Bundle Size
- Initial bundle: < 200KB gzipped
- Minimal dependencies
- Lazy-load drawers and heavy components

### Database Queries
- Story list pagination: 10 stories per page
- Activity log: 100 entries max per load
- Avoid N+1 queries: Use JOINs and single queries

---

## Cloudinary Integration

### Unsigned Upload
```javascript
// Environment variables
VITE_CLOUDINARY_UPLOAD_PRESET=newslab_unsigned
VITE_CLOUDINARY_CLOUD_NAME=xxxxx

// Upload function
async function uploadImage(file) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET)
  formData.append('folder', 'newslab/images')
  formData.append('resource_type', 'image')

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  )

  const data = await response.json()
  return {
    url: data.secure_url,
    width: data.width,
    height: data.height,
    publicId: data.public_id
  }
}
```

---

**End of Technical Specification.**
