# NewsLab v1.0 - Feature Checklist & UI Components

**Purpose**: Roadmap of all features, pages, and UI components. Use this to guide wireframe creation, UI design, and development prioritization.

---

## Core Pages & Flows

### 1. NewsLab Entry (Entry Point)
**Path**: `/`  
**Description**: Initial login screen. No authentication required. Users enter NewsLab ID (or trainer enters Trainer ID) to access a training session.  
**Components**:
- [ ] NewsLab ID input field
- [ ] "Enter Training" button (validates NewsLab ID exists in Supabase)
- [ ] Error message: "NewsLab not found. Check your ID."
- [ ] Error message: "Trainer access detected—redirecting..." (if trainer ID entered)
- [ ] Help text: "NewsLab ID provided by your trainer"

**Behavior**:
- Valid NewsLab ID → Route to Name Validation screen
- Invalid NewsLab ID → Show error, stay on entry screen
- Trainer ID detected → Route to `/trainer/dashboard` after name validation

---

### 2. Name Validation (Sub-flow of Gatekeeper)
**Path**: `/` (modal or inline)  
**Description**: Journalists provide personal name. Must be unique per room.  
**Components**:
- [ ] Personal Name input field (text)
- [ ] Validation indicator:
  - [ ] Green tick: "Name available"
  - [ ] Red X: "Name in use. Try again."
- [ ] "Continue" button (enabled only if name is available)
- [ ] Requirement text: "Unique per training session"

**Behavior**:
- Type name → Check against journalists table in real-time
- Name available → Green tick, enable "Continue"
- Name taken → Red X, disable "Continue"
- Click "Continue" → Save name to localStorage, redirect to `/[room-id]/settings` (to set team)

---

### 3. Settings (Team Management)
**Path**: `/[newslab-id]/settings`  
**Description**: Configure personal identity and team membership. Journalists set or change team name here.  
**Components**:
- [ ] Personal Name display (read-only, locked after initial setup)
- [ ] Team Name input field
- [ ] Validation indicator:
   - [ ] Green tick: "Team available" or "Team exists—joining..."
   - [ ] Red X: "Team name issue"
- [ ] "Team Members" header
- [ ] Team Members list:
   - [ ] Each member name with "X" button next to it
   - [ ] Tapping "X" next to own name: Confirm "Leave Team?" → Remove from team
- [ ] "Go to Team Stream" button (or auto-navigate after team setup)
- [ ] "Logout" button (clear localStorage)

**Behavior**:
- First time: Team Name input active, Team Members list empty
- After entering new team name: Show list with own name
- Other journalists join same team name: Team Members list updates in real-time
- Tapping "X" next to own name: Confirm dialog → Remove from team → If last member, delete team
- If journalist was only member: Team Name input clears, team is deleted
- If moving to new team: Tap "X", enter new team name, Team Members updates

---

### 4. Team Stream (Stories)
**Path**: `/[newslab-id]/stream`  
**Description**: Main view showing all published stories from the journalist's team. Real-time updates when teammates publish.  
**Components**:
- [ ] Header: "Team: [Team Name]" and member count
- [ ] Story cards (infinite scroll or "Load More" button):
   - [ ] Featured image (16:9 aspect ratio, 800x450px)
   - [ ] Title
   - [ ] Summary (truncated to ~2 lines)
   - [ ] Author name
   - [ ] Publish timestamp (e.g., "2 hours ago")
   - [ ] Pinned badge (if is_pinned=true)
   - [ ] "Edit" button (disabled if locked by another journalist)
   - [ ] "Delete" button (if user is author)
   - [ ] "Read Full Story" link/button
- [ ] "+ New Story" button (floating or top-bar)
- [ ] Settings icon (gear) → Navigate to `/[newslab-id]/settings`
- [ ] Logout button
- [ ] Offline indicator (red banner if !navigator.onLine)

**Behavior**:
- Load team stream on entry
- Real-time subscription: New stories appear at top within 1s
- Pinned stories always appear first
- Pagination: Load 10 stories, "Load More" button for next 10
- Tapping story card: Navigate to story detail page
- Tapping "Edit": If story not locked, route to editor; if locked, show "Story is being edited by [Name]"
- Tapping "Delete": Confirm → Delete story
- Tapping "+ New Story": Route to `/[newslab-id]/create`

---

### 5. Create Story (Editor)
**Path**: `/[newslab-id]/create`  
**Description**: Multi-section form for journalists to write and publish stories.  
**Components**:
- [ ] Headline input (required, text)
- [ ] Summary input (optional, textarea, ~50 words)
- [ ] Featured Image section:
   - [ ] Image upload button ("Choose Image" or camera icon)
   - [ ] Image preview (16:9 aspect ratio)
   - [ ] Resize/crop indication: "Images resized to 16:9"
   - [ ] Remove image button (X icon)
   - [ ] Error message: "Need internet to upload images" (if offline)
- [ ] Story Body (rich text editor):
   - [ ] Formatting buttons: Bold (B), Italic (I), Subheading (H2), Bullet List, Numbered List
   - [ ] Text area (multiline)
   - [ ] Character count (optional)
- [ ] Media Embeds section:
   - [ ] YouTube URL input
   - [ ] Vimeo URL input
   - [ ] Audio URL input
   - [ ] Preview of embed (if URL valid)
- [ ] Collaboration toggle (if user is author):
   - [ ] "Allow team members to edit this story?" (checkbox)
   - [ ] Description: "If OFF, only you can edit"
- [ ] Action buttons:
   - [ ] "Save as Draft" button
   - [ ] "Publish" button
   - [ ] "Cancel" button (confirm before discarding)
- [ ] Auto-save indicator: "Saving..." or "Saved" (quiet, bottom-right)
- [ ] Offline indicator (red banner)

**Behavior**:
- Auto-save every 3s to localStorage (debounced)
- Featured image: Canvas resize to 800x450px before upload
- Cloudinary upload: Show progress, error handling
- Embed URLs: Transform to iframes on publish (YouTube, Vimeo, Audio)
- "Save as Draft": Story saved to Supabase with status='draft' (not visible in feed)
- "Publish": Story saved with status='published', locked_by=NULL, appears in feed within 1s
- Offline: Save draft to localStorage, prevent publish, show "Need internet to publish"
- Page refresh: Draft restored from localStorage
- Cancel: Confirm dialog before leaving unsaved changes

---

### 6. Edit Story (Same as Create, but with Pre-filled Data)
**Path**: `/[newslab-id]/edit/[story-id]`  
**Description**: Edit an existing published or draft story. Implements concurrency lock.  
**Components**: Same as Create Story (section 5) + Lock indicator
- [ ] Lock warning banner (if story currently locked):
   - [ ] "Story is being edited by [Journalist Name]"
   - [ ] "Try again in a few moments."
   - [ ] Red background or warning style
- [ ] All form fields pre-filled with story data
- [ ] "Save Changes" button (instead of "Publish")
- [ ] "Delete Story" button (if user is author)

**Behavior**:
- On page load: Check if story.locked_by != NULL
- If locked by another journalist: Show lock warning, disable all inputs, show "Go Back" button
- If not locked: Load editor, set locked_by=[current journalist], set locked_at=NOW()
- If locked by self (from previous session): Unlock automatically, allow edit
- On save: Update story, set locked_by=NULL
- On timeout (1 min without save): Auto-unlock (Supabase function or cron)
- If user is author and allow_collab=false: Only author can edit
- If allow_collab=true: Any team member can edit (but only one at a time due to lock)

---

### 7. Story Detail (Read-Only View)
**Path**: `/[newslab-id]/story/[story-id]`  
**Description**: Full story view with formatted content, images, and embeds.  
**Components**:
- [ ] Headline
- [ ] Author name and publish timestamp
- [ ] Featured image (full width, 16:9)
- [ ] Summary (if provided)
- [ ] Story body (rich text rendered)
- [ ] Embedded media (iframes for YouTube, Vimeo, audio player)
- [ ] "Edit" button (if user is author or allow_collab=true, and not locked)
- [ ] "Delete" button (if user is author)
- [ ] "Back to Team Stream" button
- [ ] Share options (optional: copy link, email)

**Behavior**:
- Load story from Supabase
- Render rich text blocks (paragraphs, subheadings, lists, bold/italic)
- Render embeds as iframes
- Tapping "Edit": Navigate to edit screen, check lock
- Tapping "Delete": Confirm → Delete story

---

### 8. Trainer Dashboard
**Path**: `/trainer/dashboard`  
**Description**: Trainer's central view. See all teams, all stories, activity log. Filter and monitor training session progress.  
**Components**:
- [ ] Header: "Trainer Dashboard — NewsLab: [newslab-id]"
- [ ] Teams section:
   - [ ] Team cards (grid or list):
     - [ ] Team name
     - [ ] Member count
     - [ ] Number of published stories
     - [ ] Tap to expand → Show all team members with X buttons to remove
   - [ ] "All Teams" count
- [ ] Stories section (All published stories from all teams):
   - [ ] Story cards (same as Team Stream, section 4)
   - [ ] Filter by: Team, Author, Date
   - [ ] Sort by: Newest, Oldest, Most Recent Edits
   - [ ] "View Full Story" link
   - [ ] "Edit" button (trainer can edit any story, no lock)
   - [ ] "Delete" button
- [ ] Activity Log:
   - [ ] Table or list of recent actions
   - [ ] Columns: Journalist Name, Team, Action (published/edited/joined/left), Story Title, Timestamp
   - [ ] Filter by: Team, Action Type, Date Range
   - [ ] "Export Activity Log" button (nice-to-have)
- [ ] Action buttons:
   - [ ] "Settings" (gear icon) → Navigate to `/trainer/settings`
   - [ ] "Logout" button
- [ ] Offline indicator

**Behavior**:
- Real-time updates: New stories, activity log entries appear instantly
- Trainer can edit any story (no lock warning)
- Trainer can delete any story
- Tapping team name: Expand to show all members
- X next to team member: Confirm "Remove [Name] from [Team]?" → Remove from team
- If last member removed: Team deleted, update display
- Filter/sort options work smoothly, no page reload

---

### 9. Trainer Settings
**Path**: `/trainer/settings`  
**Description**: Trainer control panel for NewsLab management and data cleanup.  
**Components**:
- [ ] Header: "NewsLab Settings"
- [ ] NewsLab ID section:
   - [ ] Display current NewsLab ID (read-only)
   - [ ] "Reset NewsLab ID" button → Confirm dialog → Generate new ID, update Supabase
   - [ ] "Copy NewsLab ID to Clipboard" button (nice-to-have)
- [ ] Trainer ID section:
   - [ ] Display current ID (masked or dots)
   - [ ] "Reset Trainer ID" button → Confirm dialog → Generate new ID
- [ ] Teams & Members section:
   - [ ] List all teams with member count
   - [ ] Expand each team to show all members
   - [ ] X button next to each member → Remove from team (confirm dialog)
   - [ ] Auto-delete team if last member removed
- [ ] Danger Zone (red background):
   - [ ] "Clear NewsLab" button (destructive action)
   - [ ] Warning: "This will delete all stories, teams, and journalists in this NewsLab. This cannot be undone."
   - [ ] Confirm dialog (must type "DELETE" or similar to proceed)
   - [ ] On confirm: Delete all data (newslabs, teams, stories, journalists, activity_log)
   - [ ] Redirect to `/` after deletion
- [ ] "Back to Dashboard" button
- [ ] "Logout" button

**Behavior**:
- Reset NewsLab ID: Generates new UUID/slug, updates Supabase, shows new ID to trainer
- Reset Trainer ID: Generates new random string, updates Supabase, shows new ID
- Remove team member: X next to name → Confirm → Remove from journalists table
- Last member removed: Auto-delete team from teams table
- Clear NewsLab: Destructive, requires confirmation with safeguard prompt
- After Clear NewsLab: Entire NewsLab and all data erased, redirect to entry screen

---

### 10. PDF Export Flows
**Path**: Accessible from Team Stream, Trainer Dashboard, and Story Detail  
**Description**: Export stories or team streams as PDF.  
**Components**:
- [ ] "Export as PDF" button (on story detail page and trainer dashboard)
- [ ] Options modal (for trainer):
   - [ ] "Export this story"
   - [ ] "Export team stream [Team Name]"
   - [ ] "Export entire training session" (nice-to-have)
   - [ ] Cancel button

**Behavior**:
- Journalist on story detail: Click "Export as PDF" → Downloads PDF of single story (title, image, body, author, date)
- Journalist on team stream: "Export team as PDF" → Downloads PDF of all published stories in team (team name, member list, all stories one per page)
- Trainer on dashboard: "Export as PDF" options:
   - Single story: Same as journalist
   - Team stream: Same as journalist
   - Entire training (optional): ZIP or single PDF with all teams' stories, activity log
- PDF generation is client-side (jsPDF + html2canvas), no server processing

---

## UI/UX Standards

### Mobile-First Design
- [ ] No hover states (mobile has no hover)
- [ ] Minimum tap target size: 48x48px (Apple/Google guidelines)
- [ ] Touch-friendly spacing: 16px+ margins between interactive elements
- [ ] Full-width layouts on mobile, max-width on tablet/desktop

### Styling
- [ ] Tailwind CSS utility-first
- [ ] Color palette: Brand colors provided by project lead
- [ ] Typography: Font stack provided by project lead
- [ ] Accessibility: WCAG 2.1 AA minimum (contrast ratio 4.5:1 for text)

### Buttons & Icons
- [ ] All buttons use provided SVG icons or text labels
- [ ] Icon size: 24x24px (standard), scale up for touch targets
- [ ] States: Default, Hover/Focus (for keyboard), Active, Disabled
- [ ] Button labels: Clear, action-oriented (e.g., "Publish Story", not "Submit")

### Feedback & Loading
- [ ] Toast notifications (top or bottom):
  - [ ] Success: "Story published!"
  - [ ] Error: "Could not save. Please try again."
  - [ ] Info: "Draft syncing..." / "Synced!"
- [ ] Loading states: Spinner or skeleton screens during async operations
- [ ] Disabled state: Grayed out, disabled cursor
- [ ] Offline indicator: Red banner at top with "You are offline" message

### Forms
- [ ] Input labels above fields (mobile-friendly)
- [ ] Required field indicators (*)
- [ ] Real-time validation feedback (green tick / red X)
- [ ] Error messages below field, red text
- [ ] Clear placeholder text (e.g., "Enter team name")

### Images
- [ ] Responsive images: Cloudinary URLs with `w_800,q_80` transformation
- [ ] Lazy loading: Only load images in viewport
- [ ] Fallback: Gray placeholder if image fails to load
- [ ] Featured image: Always 16:9 aspect ratio (800x450px)

---

## Assets Needed (Provided by Project Lead)

- [ ] SVG icons:
  - [ ] Camera (image upload)
  - [ ] Edit (pencil)
  - [ ] Delete (trash)
  - [ ] Settings (gear)
  - [ ] Logout (exit)
  - [ ] Back (arrow)
  - [ ] Plus (new story)
  - [ ] Check (green tick)
  - [ ] X (red close/remove)
  - [ ] Lock (edit lock indicator)
  - [ ] Offline (signal/wifi off)
- [ ] Logo (for header)
- [ ] Favicon
- [ ] Brand color palette (RGB/Hex)
- [ ] Font family (and fallbacks)
- [ ] Story templates / structure guide (for rich text)

---

## Testing Checklist

### Functionality
- [ ] Create story → Publish → Appears in feed within 1s
- [ ] Edit story → Lock prevents concurrent edits
- [ ] Team join/leave flows work correctly
- [ ] Trainer can view all teams and members
- [ ] Trainer can clear room (delete all data)
- [ ] Offline draft saving and sync on reconnect
- [ ] PDF export renders correctly
- [ ] Image upload resizes to 16:9 and uploads to Cloudinary

### UX/Mobile
- [ ] No layout shift (CLS < 0.1)
- [ ] All tap targets >= 48px
- [ ] Readable on iPhone 12 screen (390px)
- [ ] Readable on iPad (768px)
- [ ] Keyboard navigation works (tab, enter)
- [ ] Color contrast >= 4.5:1 (text on background)

### Performance
- [ ] Lighthouse score >= 85 (mobile)
- [ ] First Contentful Paint < 2s
- [ ] Largest Contentful Paint < 2.5s
- [ ] Interaction to Next Paint < 200ms

### Cross-Browser
- [ ] iOS Safari 14+
- [ ] Android Chrome 90+
- [ ] Desktop Chrome/Firefox (secondary)

---

## Story Templates (Wireframe Structure)

**Template 1: News**
- Headline
- Summary
- Featured Image
- Byline (Author, Date)
- Body (paragraphs, subheadings)

**Template 2: Feature**
- Headline
- Summary
- Featured Image
- Byline
- Body (paragraphs, subheadings, quotes/pulls)

**Template 3: Interview**
- Headline
- Interviewee Name
- Featured Image
- Byline
- Body (Q&A format, bold questions)

**Template 4: Photo Essay**
- Headline
- Summary
- Multiple Images with captions
- Body (minimal)

---

**End of Checklist. Use this to guide wireframe creation and UI implementation.**
