# NewsLab v1.0 - Development Roadmap

**Target Audience:** AI Agents (Code Leads), Development Team  
**Document Purpose:** Phase-by-phase execution guide. Each phase is self-contained and buildable independently.  
**Status:** Ready for Phase 0 startup  
**Last Updated:** December 2025

---

## Overview

NewsLab is a mobile-first, collaborative CMS for journalism training. This roadmap breaks development into 8 phases, each with explicit deliverables, database changes, routes, components, and acceptance criteria.

**Key Principles:**
- Zero-login, room-based collaboration (single Course ID for all journalists)
- Separate Trainer ID and optional Guest Editor ID for elevated privileges
- Stories owned by individuals (drafts private, published visible to team)
- Editors (per team) control team themes, logos, and all team stream editing
- Auto-save every 3s (debounced) to localStorage + Supabase
- All stories sorted newest-first; pinned stories top of Team Stream only
- Maximum 3 pinned stories; oldest pin auto-removes when 4th added
- Public share URL per team: `newslab.app/team-name` (read-only)

**Design Reference:** All UI decisions follow DESIGN.md. Visual references (e.g., "See user1.png") point to `/info/visuals/` screenshots.

---

## Phase 0: Environment & Schema Setup ✅ COMPLETE

**Duration:** 1-2 days  
**Status:** Complete  
**Deliverables:**
- [x] SvelteKit project initialized with Tailwind CSS
- [x] Supabase project created, client SDK installed
- [ ] Cloudinary account configured with unsigned upload preset
- [ ] GitHub repo linked to Cloudflare Pages (auto-deploy on push)
- [ ] Database schema created and deployed to Supabase
- [x] Environment variables configured (`.env.local`)
- [x] TypeScript strict mode enabled
- [ ] SVG icons copied to `/static` (see icon list below)

**Database Schema Changes:**

```sql
-- NewsLabs (training sessions)
CREATE TABLE newslabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT UNIQUE NOT NULL,           -- e.g., "nigeria-0126"
  trainer_id TEXT UNIQUE NOT NULL,          -- Trainer password
  guest_editor_id TEXT UNIQUE,              -- Optional guest editor password
  fallback_image_url TEXT,                  -- Default thumbnail if story has no image
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Journalists (participants)
CREATE TABLE journalists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL,
  name TEXT NOT NULL,
  team_name TEXT,
  is_editor BOOLEAN DEFAULT FALSE,          -- Can edit team settings & all stories
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(course_id, name),
  FOREIGN KEY(course_id) REFERENCES newslabs(course_id) ON DELETE CASCADE
);

-- Teams
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL,
  team_name TEXT NOT NULL,
  primary_color TEXT DEFAULT '5422b0',      -- Hex color for team theme
  secondary_color TEXT DEFAULT 'f0e6f7',    -- Lighter contrast color
  logo_url TEXT,                            -- Team logo (Cloudinary)
  public_share_token TEXT UNIQUE,           -- For public read-only URL
  share_enabled BOOLEAN DEFAULT FALSE,      -- Toggle sharing on/off
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(course_id, team_name),
  FOREIGN KEY(course_id) REFERENCES newslabs(course_id) ON DELETE CASCADE
);

-- Stories
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL,
  team_name TEXT NOT NULL,
  author_name TEXT NOT NULL,                -- Original creator
  title TEXT NOT NULL,
  summary TEXT,
  featured_image_url TEXT,                  -- Cloudinary URL
  content JSONB,                            -- Rich text: { blocks: [{ type, text/url }] }
  status TEXT DEFAULT 'draft',              -- 'draft' or 'published'
  is_pinned BOOLEAN DEFAULT FALSE,
  pin_index INTEGER,                        -- Order for pinned stories (0, 1, 2)
  pin_timestamp TIMESTAMP,                  -- When pinned (for auto-removal of oldest)
  locked_by TEXT,                           -- Current editor's name (NULL if unlocked)
  locked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY(course_id) REFERENCES newslabs(course_id) ON DELETE CASCADE
);

-- Activity Log (trainer visibility)
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL,
  team_name TEXT,
  journalist_name TEXT,
  action TEXT,                              -- 'published', 'unpublished', 'edited', 'joined_team', 'left_team', 'pinned', 'unpinned'
  story_id UUID,
  story_title TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY(course_id) REFERENCES newslabs(course_id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_stories_course_team ON stories(course_id, team_name);
CREATE INDEX idx_stories_author ON stories(course_id, author_name);
CREATE INDEX idx_stories_status ON stories(course_id, status);
CREATE INDEX idx_journalists_course_team ON journalists(course_id, team_name);
CREATE INDEX idx_activity_course ON activity_log(course_id);
```

**Environment Variables:**
```
# .env.local (for local development)
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
PUBLIC_CLOUDINARY_UPLOAD_PRESET=your-unsigned-preset

# Access in code via:
# import { PUBLIC_SUPABASE_URL } from '$env/static/public'
```

**Required SVG Icons** (place in `/static/icons/`):
- `icon-user.svg`, `icon-user-fill.svg` (home tab inactive/active)
- `icon-group.svg`, `icon-group-fill.svg` (team stream inactive/active)
- `icon-settings.svg`, `icon-settings-fill.svg` (settings inactive/active)
- `icon-newstory.svg` (write button, filled white)
- `icon-more.svg` (three-dot menu)
- `icon-trash.svg`, `icon-delete.svg` (delete button)
- `icon-edit.svg` (edit button)
- `icon-export.svg` (export button)
- `icon-pin.svg`, `icon-pin-fill.svg` (pin toggle, outline/filled)
- `icon-unpublish.svg` (unpublish button)
- `icon-select-all.svg`, `icon-select-all-fill.svg` (select all inactive/active)
- `icon-radio.svg` (selected radio button)
- `icon-circle.svg` (unselected radio button)
- `icon-check.svg`, `icon-check-fill.svg` (checkmark for validation, outline/filled)
- `icon-close.svg`, `icon-close-circle.svg`, `icon-close-circle-fill.svg` (close/remove button, outline/filled)
- `icon-login-fill.svg` (arrow/enter button for splash form submission)
- `icon-image.svg`, `icon-heading.svg`, `icon-bold.svg`, `icon-list.svg` (text editing)
- `icon-separator.svg` (horizontal rule)
- `icon-youtube.svg`, `icon-link.svg` (embeds)
- `icon-preview.svg`, `icon-preview-fill.svg` (preview toggle)
- `icon-publish.svg`, `icon-publish-fill.svg` (publish toggle)
- `icon-time.svg` (timestamp icon)
- `icon-arrow-left.svg` (back arrow)
- `icon-expand.svg`, `icon-collapse.svg` (expand/collapse dropdown)
- `icon-upload.svg` (upload button)
- `icon-custom-upload.svg` (custom image upload)
- `icon-toggle-on.svg`, `icon-toggle-off.svg` (toggle switch on/off states)
- `icon-copy.svg` (copy URL button)
- `logo-textlogo-white.png` (main logo for splash)

**Acceptance Criteria:**
- [ ] Database schema deployed to Supabase without errors
- [ ] All tables have appropriate indexes
- [ ] Environment variables load correctly in dev & build
- [ ] SVG icons load without 404s
- [ ] TypeScript compiles with strict mode enabled

---

## Phase 1: Identity & Gatekeeper (Splash Screen) ✅ COMPLETE

**Dependencies:** Phase 0  
**Status:** Complete  
**Deliverables:**
- [x] Splash screen with two-input flow (Course/Role ID + Byline name)
- [x] Course/Role ID validation: Check if input matches `course_id`, `trainer_id`, or `guest_editor_id` in newslabs table
- [x] Role detection: Determine 'journalist', 'trainer', or 'guest_editor' based on which field matched
- [x] Byline name validation: Check journalists table for uniqueness per course
- [x] Real-time validation feedback: Check/X icons for each field
- [x] Auto-create journalist record (first-time login only)
- [x] Flash message on successful login: "Welcome [byline]"
- [x] localStorage persistence: `{ courseId, name, role, teamName, sessionToken, loginTimestamp }`
- [x] Same-device return: Skip splash if valid session in localStorage
- [x] Different-device return: Full re-authentication (splash required)
- [x] Route guards for protected pages (via SvelteKit layouts)
- [x] Logout functionality (clear localStorage)

**SvelteKit Routes (Implemented):**
- `src/routes/+page.svelte` — Splash screen (entry point at `/`)
- `src/routes/[courseId]/home/+page.svelte` — Home page (redirect target)
- `src/routes/[courseId]/+layout.svelte` — Protected route guard (redirects to `/` if not logged in)

**Implementation Notes:**
- Splash screen is now `src/routes/+page.svelte` (not a separate component)
- Route protection handled by `src/routes/[courseId]/+layout.svelte` (not GatekeeperGuard.svelte)
- Session validation in `src/routes/+layout.svelte` on mount
- Auth functions with discriminated unions in `src/lib/auth.ts`

**Design & UI/UX Focus:**
- **Goal:** Implement the two-step login flow exactly as specified in `DESIGN.md`, section "1 Splash screen".
- **Visuals:** Reference `/info/visuals/splash1.png`, `splash2.png`, and `splash3.png`.
- **Key Elements:**
    - Background: Solid `#5422b0` with `logo-textlogo-white.png`.
    - Inputs: `#efefef` background, placeholder text color `#777777`.
    - Validation Icons: Use `icon-check-fill.svg` (color `#5422b0`) for success and `icon-close-circle-fill.svg` (color `#5422b0`) for error.
    - Error Messages: Display "[Try again]" or "[Name taken. Choose another]" as per `DESIGN.md`.
    - Submission: The `icon-login-fill.svg` (color `#5422b0`) is the final submission button.

**Acceptance Criteria:**
- [ ] Invalid Course/Role ID shows error "Try again" + red X icon
- [ ] Valid Course/Role ID shows green check icon + byline input appears
- [ ] Byline field accepts max 30 characters
- [ ] Duplicate byline name shows error "Name taken. Try again" + red X icon
- [ ] Available byline name shows green check icon
- [ ] Arrow button (icon-login-fill.svg) submits form
- [ ] Enter/Return key also submits form
- [ ] Successful login shows "Welcome [name]" flash message
- [ ] Successful login redirects to `/[courseId]/home`
- [ ] Trainer ID detected → role set to 'trainer' in localStorage
- [ ] Guest Editor ID detected → role set to 'guest_editor' in localStorage
- [ ] Journalist Course ID detected → role set to 'journalist' in localStorage
- [ ] Page refresh (same device): session in localStorage valid → skip splash, go to home
- [ ] Page refresh (different device): no localStorage → show splash again
- [ ] Returning user with same byline: System recognizes them + redirects to home with all content
- [ ] Logout button clears all localStorage + redirects to splash
- [ ] All protected routes (home, stream, settings) require valid `courseId` + `name` + `role` in localStorage

---

## Phase 2: Core Navigation & Drawer System

**Dependencies:** Phase 1  
**Deliverables:**
- [ ] Footer navigation tabs (User Home, Write, Team Stream, Settings)
- [ ] Footer button state (active/inactive styling per DESIGN.md)
- [ ] Write drawer (rises bottom-to-top, full screen)
- [ ] Story reader drawer (rises bottom-to-top for Team Stream detail)
- [ ] Preview drawer (slides left-to-right from Write)
- [ ] Responsive mobile layout (no desktop optimizations yet)
- [ ] Tab switching without data loss (maintain scroll position)

**SvelteKit Routes:**
- `src/routes/[courseId]/home/+page.svelte` — User Home (Drafts/Published tabs)
- `src/routes/[courseId]/stream/+page.svelte` — Team Stream
- `src/routes/[courseId]/settings/+page.svelte` — Settings
- Drawers handled by Svelte stores (not routes)

**Components to Build:**
- `src/components/FooterNav.svelte` — 4-button footer, active state tracking
- `src/components/WriteDrawer.svelte` — Full-screen modal (initially empty, content in Phase 4)
- `src/components/StoryReaderDrawer.svelte` — Full-screen modal for story detail
- `src/components/PreviewDrawer.svelte` — Preview modal (left-to-right slide)
- Footer integrated into `src/routes/[courseId]/+layout.svelte`

**Design & UI/UX Focus:**
User Home Initial view**
- Visuals: user1.png, user2.png
- Icons/logos: icon-user.svg, icon-user-fill.svg,  icon-group.svg, icon-group-fill.svg, icon-newstory.svg, icon-settings.svg, icon-settings-fill.svg
The page has two tabs: Drafts and Published (Active purple 5422b0 + underline, inactive #777777)
    - At first the Draft tab is empty and displays a #777777 notification: Nothing to show. / First, create or join a team in Settings. Then start writing.
    - At first the Draft tab is empty and displays a #777777 notification: Nothing to show. / Published stories appear here and in your Team Stream.
Footer menu
    - The footer menu has a white background and fine 1px #777777 line above.
    - Centered in the footer is a white on solid purple circle (Write - icon-newstory.svg #5422b0), the top of which modestly overlays a horizontal 1pt #777777 full-width line. This icon is larger than others on the footer. A filled svg is provided: icon-newstory.svg
    - To the left of the Write button is the user home button (icon-user-fill.svg #5422b0 when the page is active, icon-user.svg #777777 when a different page is selected)
    - To the right of the Write button is the Team Stream button (icon-group.svg #777777 when inactive, icon-group-fill.svg #5422b0 when active)
    - At the far right of the footer is the settings button (icon-settings.svg #777777 when inactive, icon-settings-fill.svg #5422b0 when active

**Acceptance Criteria:**
- [ ] Footer appears on all pages with correct icons (See DESIGN.md visual references)
- [ ] Clicking footer button opens correct drawer/page.
- [ ] Drawers slide in from correct direction (bottom-to-top for Write/Story Reader, left-to-right for Preview).
- [ ] Close button (X) closes any active drawer.
- [ ] Tab switching maintains scroll position (no jump to top).
- [ ] Active tab button is `#5422b0` (or team color if set); inactive is `#777777`.
- [ ] The centered 'Write' button is larger than the other footer icons and styled as per `user1.png`.

---

## Phase 3: Settings & Team Management

**Dependencies:** Phase 2  
**Deliverables:**
- [ ] Settings page: Byline name (auto-populated, editable with Save button), Team Name input
- [ ] Byline name validation (real-time, check journalists table for uniqueness)
- [ ] Byline Save button: Updates database, shows "Saved" confirmation
- [ ] Byline change: Journalist must remember new name for next device login
- [ ] Team name validation (real-time, check teams table)
- [ ] Team Members list (all journalists in current team)
- [ ] Leave team button (X next to own name)
- [ ] Story handling on team leave: All published stories revert to Drafts
- [ ] Editor status checkbox (next to each team member's name)
- [ ] Team logo upload (Cloudinary, square, max 1 per team)
- [ ] Team color selector (6 color circles, see DESIGN.md)
- [ ] Team share toggle (if editor, show toggle + copy URL button)
- [ ] Auto-deletion: When last member leaves, delete team
- [ ] Real-time updates: When new member joins, Team Members list updates via Realtime subscription
- [ ] Editor promotion logic: Only existing editors can toggle editor status
- [ ] Team name editing: Only editors can change team name
- [ ] Republish stories to new team: When journalist joins new team, can republish reverted stories

**SvelteKit Routes:**
- `src/routes/[courseId]/settings/+page.svelte` — Settings page

**Components to Build:**
- `src/components/PersonalSettings.svelte` — Name display (read-only)
- `src/components/TeamSettings.svelte` — Team name input, member list, color picker
- `src/components/TeamMemberItem.svelte` — Member name + remove button + editor checkbox
- `src/components/TeamLogoUpload.svelte` — Image upload with preview
- `src/components/ColorPalette.svelte` — 6 color circles with selection indicator
- `src/components/ShareToggle.svelte` — Public URL toggle + copy button (editors only)

**Design & UI/UX Focus:**
Visuals: settings1.png, settings2.png, settings3.png, settings4.png
Icons: icon-check.svg, icon-circle.svg, icon-upload.svg, icon-close-circle.svg, icon-close.svg, icon-toggle-on.svg, icon-toggle-on.svg, icon-copy.svg


- Accessed via the settings icon in the footer. Active #5422b0, inactive #777777
- Journalists see only one settings page

- Initial view of the Settings page (with byline name automatically added): settings1.png

Settings page elements

From the top down …
Byline input window - name added
	- See settings1.png
	- The journalist was required to submit a byline name on the splash screen
	- The byline name will automatically appear in the settings
	- The byline input field is an #efefef window. To the right - if the name is registered in the database - is a purple #5422b0 check icon (icon-check.svg)
	- The journalist would normally not need to touch this name unless they want to change it.

Byline input window - change name** 
	- See settings2.png, settings3.png
	- If they wish, the journalist can change their byline name.
	- To do this, they tap in the byline name input box. 
		- A fine purple active border appears around the input box
		- The check icon (icon-check-fill.svg) to the right is transformed into the circle icon (icon-circle.svg color: #777777)
		- A Save (text. Pill button with #5422b0 background) and Cancel (icon-close-circle.svg) button appear under the input field to the left.
	- The journalist inputs a new name (max 30 characters). 
		- IF NOT available, the icon to the right changes to an x (icon-close-circle.png) and a message appears: [Name taken. Try again] See settings3.png
		- If available the circle to the right becomes the icon-check.svg, default #5422b0 checkbox again)
	- The journalist then confirms by tapping the Save button (or cancelling with the cancel button)

Team name input window.
	- See settings4.png
	- To the right of the Team Name #efefef input window is a #777777 circle (icon-circle.svg).  As in settings3.png
	- In training, teams will be asked to elect a team member who will input the agreed team name first. This members becomes an editor by default.
	- The journalist taps the Team Name input window. The flow is almost the same as for the Byline Name change process.
	- On tapping the window, a fine purple active border appears around the input box
	- A Save (text button. Pill with #5422b0 background) and Cancel (icon-close-circle.svg) buttons appear under the input field to the left.
	- The journalist inputs a Team name (max 30 characters). 
		- IF NOT available, the icon to the right changes to an x (icon-close-circle.png) and a message appears: [Name taken. Try again]
		- If available the circle to the right becomes the icon-check.svg, default #5422b0)
	- The journalist then confirms by tapping the Save button (or cancelling with the cancel button)
	- the name of the journalist is then added to the list of members below with the Editor selector applied by default. This means the Team always has one editor at the start (it can be changed later).
	- When a team has been created, other team members now enter the name of the team in the input window. If found in the database, the active check will be displayed in their settings and their names appear in the list of team members below. See settings3.png

Team members
	- See settings5.png
	- The Team Members section below the Team Name input is empty at first. There is placeholder text that says [Team members will appear here]. This disappears when team member names are added.
	- The journalist who added the team name automatically becomes an editor.
	- Names of other team members appear in a list automatically, with fine separators as team members are added. All team members can see each other’s names in their app settings. 


Editors
	- See settings6.png
	- The person who first creates the team AUTOMATICALLY is made an Editor. The Editor checkbox (icon-check.svg #5422b0) is then active by default (but can be changed later)
	- Teams can have one or more editors. Only editors can create or remove other editors.
	- Once created, ONLY editors can amend the team name. This should be blocked for non-editors
	- Only Editors can select the team colour, upload the team logo, activate the team stream sharing toggle. These functions should be blocked for non-editors. 
	- There must always be at least one editor per team. If an editor who is the last in the team tries to remove their editor status by unchecking the button to the right of their name, a message modal appears to say [Teams must have at least one editor. Add another then try again] with a [Got it] confirmation button to close the modal.
	- Closing a Team. To close a team, members leave (or are removed) until only a final editor is left. When that editor leaves the team, the team is closed and the team name is removed.

Removing a team member**
	- settings7.png
	- To the left of each name is an x close icon (icon-close.svg). This is to remove members from the team.
	- Only editors/trainer/guest editors can remove members from the team. 
	- To remove a member, editors/trainer/guest editors tap the x next to the name. The name and x are highlighted with #5422b0 and a toolbar below the list of members is displayed in #5422b0. 
	- This toolbar has a confirmation [Remove from team?] with check (yes) and cancel (no) buttons (icon-check.svg, icon-close-circle.svg).
	- Tapping ‘Remove from team?’ Removes the person from that team. Their name disappears under the Team Name and the Team Name input box becomes blank.

Content of removed members**
	- Journalists must belong to a team to Publish stories. They can create Drafts, but cannot Publish.
	- A journalist may have been part of a team and published stories. What happens to these stories?
	- All stories published by the journalist are moved back to Drafts. They no longer appear in Published or in the Team Stream. 

Team themes**
	- See settings7.png
    - There are six team colour selectors, displayed in a row of circular colour buttons. Selected buttons have a circle around them in the selected colour. 
	- The standard #777777 text title with underscore says ’Pick a team theme*’ (with asterisk). Aligned to the same line is ‘*Editors only’
	- The colour is a team choice, but only an editor can activate the colour. 
	- Tapping a theme colour immediately changes the colour around the app.
	- Each colour is a pair, with darker primary colour which takes the place of the default purple in page hovers, toolbars, active icons etc. The primary colour is paired with a secondary lighter colour, used in the team stream hero header. The palette is as follows:

"Indigo Bloom":"5422b0","Lavender Veil":"f0e6f7" (Default)
"Stormy Teal":"057373","Honeydew":"d6ebdd"
"Baltic Blue":"00639c","Alice Blue":"dbeffa"
"Royal Orchid":"9100ae","Thistle":"f0cbf6"
"Oxidized Iron":"b12e09","Almond Silk":"f6d4cb"
"Brick Ember":"d60202","Cotton Rose":"ffd6d6"

Logo upload**
	- See settings7.png
    - The logo text says: [Upload a team logo (square)*]. See settings4.png
	- Logos must be square. Only editors can upload a team logo. 
	- There is a dotted square #777777 below the title with an upload button icon-upload.svg
	- If no logo is uploaded, use the fallback: newslab-logo-fallback.png This logo shows by default on the Team Stream with the placeholder team name: Team NewsLab 
	- A small close x button should be placed in the corner of the thumbnail when uploaded to delete the image


Team stream share URL**
	- see settings8.png
	- After a team is created, a public URL can be generated (ONLY by an editor/the trainer/guest editor) to share the team’s ‘website’ (team stream).
	- By default the setting displays a small header [share team stream*] with full width fine underscore. Aligned right is a toggle button switch OFF by default.
	- Note: Create the toggle using CSS to achieve a smooth animated effect. However, if this proves difficult, toggle box svgs are added to static/icons: icon-toggle-on.svg and icon-toggle-off.svg.
	- When an editor toggles the URL generator ON, a URL is displayed in a pale grey #efefef box beneath the title and toggle box. A copy button sits inside the box aligned right. Icon-copy.svg. See settings6.png
	- When the URL toggle is on (active colour #5422b0) and the URL generated, it can be copied by any member of the team.
	- The URL format should be simple: newslab.app/team-name (there is no danger of future clashes because all data and content will be erased at the end of each training course)
	-Note: The website may benefit from a little styling, which can be done after the initial shared site (the team stream) is complete. Consider a collapsible header, leaving just the team name visible in a slim translucent header; perhaps previous/next below individual stories? Desirable but not essential.

**Acceptance Criteria:**
- [ ] Byline field shows auto-populated name with a check icon.
- [ ] Tapping Byline field enters edit mode with purple border and Save/Cancel buttons appear (`settings2.png`).
- [ ] Byline validation shows red X and error message for taken names (`settings3.png`).
- [ ] Byline Save button shows "✓ Saved" feedback.
- [ ] Team name input validates in real-time.
- [ ] Team Members list shows all members; only editors see controls to remove members or toggle editor status.
- [ ] Removing a member triggers confirmation flow as per `settings7.png`.
- [ ] Leaving team reverts all published stories for that user to their Drafts tab.
- [ ] Color selector shows 6 circles; selection is indicated with a ring and immediately updates the app theme.
- [ ] Logo upload shows a preview and accepts square images only.
- [ ] Share toggle is visible only to editors and correctly shows/hides the public URL.

---

## Phase 4: Story Editor & Auto-save (Write Drawer)

**Dependencies:** Phase 3  
**Deliverables:**
- [ ] Write drawer opens from bottom, full screen (See write1.png)
- [ ] Headline input (required, placeholder "Title")
- [ ] Summary input (optional, textarea, placeholder "Text")
- [ ] Image upload (Cloudinary, auto-resize to max 800px width, any aspect ratio)
- [ ] Image caption support (placeholder "[Tap to add caption]", disappears if empty)
- [ ] Rich text editor: Bold, H2 subheading, lists, separators
- [ ] Toolbar at bottom with formatting + embed buttons (See write1.png toolbar)
- [ ] YouTube URL input modals
- [ ] Custom thumbnail upload for YouTube (square, stored separately)
- [ ] Link insertion (using team color/default purple for link text)
- [ ] Auto-paste formatting removal (plain text only)
- [ ] Auto-save every 3s (debounced) to localStorage
- [ ] Auto-save to Supabase (draft with status='draft')
- [ ] Word count display (bottom of write drawer, not in published story)
- [ ] Preview drawer (slides left-to-right, shows formatted story with team branding)
- [ ] Close drawer button (X icon) with unsaved changes confirmation

**Components to Build:**
- `WriteDrawer.svelte` — Main editor container
- `HeadlineInput.svelte` — Title input field
- `SummaryInput.svelte` — Summary textarea
- `ImageUploader.svelte` — Featured image upload with resize preview
- `ImageCaption.svelte` — Caption input (appears after image selected)
- `RichTextEditor.svelte` — Main text editor with formatting
- `ToolbarBottom.svelte` — Formatting buttons + embed buttons (See write1.png)
- `YouTubeModal.svelte` — URL input + custom thumbnail upload
- `LinkModal.svelte` — URL + link text input
- `PreviewDrawer.svelte` — Read-only formatted story view with team branding
- `AutoSaveIndicator.svelte` — "Saved" text feedback (brief, bottom-right)
- `WordCounter.svelte` — Word count display

**Design & UI/UX Focus:**
Visuals: write1.png, write2.png, write3.png, write4.png, write5.png, 

Icons: icon-bold.svg, icon-close-svg, icon-youtube.svg, icon-heading.svg, icon-image.svg, icon-link.svg, icon-preview-fill.svg, icon-preview.svg, icon-publish-fill.svg, icon-publish.svg, icon-separator.svg, icon-custom-upload.svg

- Tapping the centred purple icon-newstory-svg launches the Write drawer (bottom to top), filling the page. An X (#777777) on circle #efefef background at the top left closes the drawer.
- There are two placeholder words: Title and Text, which disappear when the journalist starts to write. See write1.png
- Text pasted into the editor is automatically stripped of HTML attributes, leaving plain text to be edited by the journalist. 
- Styles can be applied using the Style menu

Style menu**
- at the bottom of the Write screen (sitting above the mobile keyboard) is a toolbar menu on white background, comprising:
    - Image: icon-image.svg. Tap to import an image from device. The image can be uploaded at any size but should be compressed to a width of 800px
    - Headline: icon-heading.svg. Turns highlighted text into an H2 subheading. 
    - Bold: icon-bold.svg. Turns highlighted text bold
    - Separator: icon-separator.svg. Add a separator in text (centred, 50% of page width)
    - YouTube: icon-youtube.svg. Pop up modal for YouTube URL. In addition the modal provides an option to upload (icon-custom-upload.svg) a custom square image that would NOT appear in the post, but only as the thumbnail in the Published/Team Stream. When the image is uploaded, I envision the filename of the image displaying to the right of the upload icon. See write3.png
    - Link: icon-link.svg. Pop up window for external links See write2.png
    - A fine vertical separator, before two publishing related buttons
    - Preview: icon-preview.svg. Launches a full-screen drawer with preview of published article. Since the Write window is already a drawer (vertical), the preview drawer enters from the left. An arrow in the top left of the preview drawer makes the drawer slide back to the left, returning to the Write drawer. Note: the preview includes the Team theme header with selected colour, a team logo (input via settings) and team name in selected team font. The article preview run below. See write4.png
    - Publish: icon-publish.svg, icon-publish-fill.svg. When writing and editing is complete, tapping the publish button (icon-publish.svg changes to icon-publish-fill.svg, #5422b0) launches a publish toolbar (See write5.png). 
    - Publish toolbar includes a [Publish?] confirmation. 
	- to the left of the Publish toolbar is a white x cancel button on circle 5422b0 background.
    - Tapping the confirmation moves the story to the user’s Published list AND to the Team Stream.

Story format**
- The title size and font and body size and font are fixed
- The user can use bold, H2 to add subheading and separators to make the story more engaging
- One or more images can be added. Images are compressed to max 800px wide (compressed)
- When an image is inserted, a placeholder text is automatically added under the image: [Tap to add a caption]. If a caption is not entered, no text displays on the the published image.
- Add a word count to the bottom of the story in Write drawer. No word count should appear displayed on the published article.
- When the story is published the author byline (added in the user settings) is inserted automatically at the top of the story, above left of the headline.
- No timestamp is included in the published article (but it appears in the draft, published, and Team Stream

Drafts tab

- Visuals: user3.png, user4.png, 
- Icons: icon-more.svg, icon-select-all.png, icon-select-all-fill.svg, icon-trash.svg, icon-time.svg, icon-radio.svg, icon-circle.svg

- When the journalist has created story drafts, they appear in the Drafts list. This is the app default tab view when a journalist first enters the app.

Each preview includes**
    - a square thumbnail image (with fallback image uploaded via the trainer settings) aligned left
    The preview to the right of the thumbnail has four rows. From top to bottom:
    - 1 timestamp (clock icon - icon-time.svg)
    - 2 headline (max two lines)
    - 3 text (max two lines)
    - 4 journalist name (name only - not ‘By …’ ) aligned right
    - To the right of the headline is a three-dot menu. #777777 by default, #5422b0 when active
    - Under each preview is a fine separator EXCEPT under the last preview in the list.

- When content exists, the ‘select all’ button appears at the top right of the page. When inactive the icon (icon-select-all.svg is #777777. When active it changes to icon-select-all-fill.svg with #5422b0 colour).

Three dot menu**

Visuals: user4.png, user5.png, user6.png

- When the three dot menu is active it turns #5422b0
- Tapping a three-dot menu triggers a toolbar below the preview (but before the separator). This includes, from left: [trash icon][Export][Edit]  See: user4.png
- Tapping Delete triggers an extension to the left of the toolbar with Delete? confirmation. See user5.png
- Tapping Export launches a dropdown menu (#f0e6f7) with two download options: PDF or TXT. See user6.png

Select all**

Visuals: user7.png
Icons: icon-circle.svg, icon-radio.svg

- Tapping the Select all button at the top right (icon-select-all.svg #777777) makes the button active (icon-select-all-fill.svg colour #5422b0.
- Tapping the select all button triggers circle buttons (icon-circle.svg #777777) that replace the three-dot menus in the list of previews.
- Selecting one or more circles (which become radio buttons - icon-radio.svg #5422b0) displays the purple trash icon next to the Select All button
- Tapping the trash icon triggers a confirmation tooltip to its left (Delete?)
- Selected previews/stories are deleted, the Select All button goes back to its inactive state and three-bar menus replace the radio buttons.

Published Tab

- Visuals: user8.png, user9.png, user10.png, user11.png user12.png

- Published tab contains previews of stories published only by the individual author. The initial layout view is exactly the same as the Drafts preview display. See user8.png
- For desktop browsers, there is a hover effect that turns headlines #5422b0 (or selected team theme color)


Three dot menu**

- The three dot menu triggers a toolbar in the same style as the Drafts tab. The three dot toolbar moves from #777777 to #5422b0 on tap. See user9.png
- However, the toolbar buttons are slightly different to the Draft tab toolbar. The order of buttons in the published toolbar is, from left to right: [trash icon)[Unpublish][Export][Edit]
- The Unpublish button moves the story to the journalist’s Drafts tab. It is no longer visible in the Published tab OR in the Team Stream.
- The Export tab works in the exactly the same way as previously, triggering a dropdown menu with PDF and TXT options See user10.png
- the trash can function works in exactly the same was as the Draft tab, triggering a toolbar extension with Delete?
- Edit launches the Write/editing drawer where the journalist can continue to edit the story/

Select all**

- This works in exactly the same way as on the Drafts tab. Tapping the icon (becomes active) replaces the three dot menus with radio buttons and displays the trash icon. See user11.png user12.png

Acceptance Criteria:**
- [ ] Headline input appears at top, placeholder "Title" disappears on focus.
- [ ] Image upload button opens file picker; caption field appears below the uploaded image.
- [ ] All toolbar buttons are functional.
- [ ] Modals for YouTube and Link pop up and function as per `write2.png` and `write3.png`.
- [ ] Custom thumbnail upload for YouTube shows the selected filename (`write4.png`).
- [ ] Pasted text is stripped of its original formatting.
- [ ] "Saved" indicator appears briefly after each auto-save.
- [ ] Word count updates in real-time at the bottom of the drawer.
- [ ] Preview drawer (`write5.png`) shows the story with correct team branding and formatting.
- [ ] Close button (X) on Write Drawer prompts for unsaved changes.

---

## Phase 5: Publishing & Team Stream Display

**Dependencies:** Phase 4  
**Deliverables:**
- [ ] Publish button in Write drawer (becomes active when headline filled)
- [ ] Publish toolbar (pin toggle + confirmation, See write6.png)
- [ ] Publish confirmation & save to Supabase with status='published'
- [ ] Story appears in author's Published tab immediately
- [ ] Story appears in Team Stream immediately (Realtime subscription)
- [ ] Team Stream displays all published stories from team (most recent first)
- [ ] Pinned stories appear at top of Team Stream (most recent pin first)
- [ ] User Home: Drafts tab (personal drafts only)
- [ ] User Home: Published tab (personal published stories)
- [ ] Story card layout (thumbnail, headline, summary, author, timestamp, See user8.png)
- [ ] Three-dot menu in Team Stream (editors only, See team1.png)
- [ ] Three-dot menu in Published tab (author only, See user9.png)
- [ ] Unpublish button (moves story back to Drafts)
- [ ] Delete button (remove story from database)
- [ ] Edit button (loads editor with pre-filled data)
- [ ] Story detail drawer (bottom-to-top, full story view, See team2.png)
- [ ] Pinned badge indicator (if is_pinned=true, See user10.png)
- [ ] Select all functionality (bulk delete from Drafts/Published, See user7.png)
- [ ] Real-time updates via Supabase Realtime subscription
- [ ] Activity log entries created for publish/unpublish/delete/pin/unpin

**Components to Build:**
- `src/components/PublishToolbar.svelte` — Pin toggle + confirmation
- `src/components/DraftsTab.svelte` — List of personal draft stories
- `src/components/PublishedTab.svelte` — List of personal published stories
- `src/components/TeamStream.svelte` — List of team's published stories (pinned + unpinned)
- `src/components/StoryCard.svelte` — Thumbnail + metadata preview
- `src/components/ThreeDotsMenu.svelte` — Context menu
- `src/components/StoryDetailDrawer.svelte` — Full-screen story view
- `src/components/SelectAllToggle.svelte` — Multi-select mode for bulk delete
- `src/components/TeamHeader.svelte` — Team name + logo + color

**Design & UI/UX Focus:**
Visuals: team1.png, team2.png, team3.png, team4.png, team5.png
Icons: icon-pin.svg, icon-pin-fill.svg

- Accessed from the Team icon in the footer menu
- Page has a hero header with light contrast background (#f0e6f7 by default, changes with selected team theme), centred square logo (default logo-teamstream-fallback.png - custom logos can be uploaded from settings). Under the logo is the team name. Default [Team NewsLab] #5422b0 - overwritten with team names and colours when created by teams in Settings). There is a horizontal border in the primary team colour under the hero background (default: #5422b0)
- Team stream displays a scrolling preview  list of articles published by all members of the team. 
- Basic layout of previews is the same as the user Published tab
- Headlines in team stream (and in Published and Draft tabs), have a purple hover effect on desktop browsers
- Editors (and Trainer + Guest Editor if present) see three-dot menus next to EVERY story in the team stream. See team1.png
- Non-editors see NO three dot menus. For non-editors, the Team Stream is read only. See team2.png
- For Editors, Trainer (and Guest Editor) tapping the three dot menu launches a toolbar between the end of the story snippet and separator. When active the three dot menu turns #5422b0

The toolbar**
	- With fine separators between elements, comprises: [trash icon][Unpublish][Export][Pin icon toggle outline/fill][Edit] See team3.png
	- Trash: Tapping the trash icon in the toolbar extends the toolbar to the left with a [Delete?] Confirmation. Tapping delete deletes the story.
	- Unpublish. Tapping Unpublished puts the story back into the Home/Drafts tab of the individual journalist
	- Export. Triggers a dropdown #f0e6f7 (or team theme) with options for PDF or TXT export. See team4.png
	- Pin toggle. See below

The Pin**
	- Pinned stories appear ONLY at the top of the Team Stream (not at the top of the user’s Published tab). Pinned stories are a function restricted to the Team Stream.
	- In the Team Stream pin stories carry a pin icon icon-pin.svg to the left of the journalist name, aligned left under the headline and text snippet. See team3.png
	- A maximum of THREE pinned stories can appear at the top of the Team Stream, added by editors only. Pinned stories appear with the most recently pinned stories at the top of the Team Stream. If, for example, three pinned stories exist on the Team Stream, and another story is pinned, the pin is automatically removed from the oldest pinned story. This unpinned story now appears in normal date order within the Team Stream.
	- Editors/Trainer/Guest Editor can toggle pins on and off using the button in the Team Stream toolbar.

Story viewer**
- tapping a story in the team stream launches a drawer from the bottom of the page with the individual story displayed. See team5.png
- The top of the page displays the team theme colour, logo and team name
- The format is as Draft preview: Byline to top left, under which is the headline then content.
- The drawer is closed with a close x #777777 on #efefef circle background.


Acceptance Criteria:**
- [ ] Publish button in Write drawer shows a toolbar with pin toggle (`write6.png`).
- [ ] Published story appears immediately in the "Published" tab and "Team Stream".
- [ ] Story cards in all lists match the layout of `user8.png`.
- [ ] Three-dot menus reveal the correct actions for the context (Drafts vs. Published vs. Team Stream for editors).
- [ ] Pinned stories appear first in the Team Stream, marked with a pin icon (`team3.png`).
- [ ] The "Select All" flow works as designed in `user7.png` and `user11.png` for bulk deletion.
- [ ] Tapping a story card in the Team Stream opens the full-screen Story Detail Drawer (`team2.png`, `team5.png`).

---

## Phase 6: Story Editing, Locking & Concurrency

**Dependencies:** Phase 5  
**Deliverables:**
- [ ] Edit button loads story in Write drawer (pre-filled data)
- [ ] Story lock mechanism (set locked_by + locked_at on edit load)
- [ ] Lock check: If story locked by another journalist, show "Story is being edited by [Name]" message
- [ ] No editor access if locked by other journalist (disable all inputs, show "Go Back" button)
- [ ] Lock held by self (from previous session): Auto-unlock on load
- [ ] Auto-unlock: 5-minute timeout without activity (Supabase function or client-side check)
- [ ] Save story: Update database + set locked_by = NULL
- [ ] Edit restrictions for non-editors:
  - [ ] Authors can edit their own published stories from Published tab
  - [ ] Authors CANNOT edit stories from Team Stream (no edit button shown)
  - [ ] Non-editors cannot edit Team Stream stories at all
- [ ] Editors can edit any story from Team Stream (no lock restriction on editors)
- [ ] Discard changes confirmation (if unsaved changes)

**Components:**
- Update `WriteDrawer.svelte` to accept pre-filled story data
- Add `LockWarning.svelte` — Banner showing lock status
- Update `ToolbarBottom.svelte` — "Save Changes" button (instead of "Publish")

**Design & UI/UX Focus:**
- **Goal:** Implement the logic for editing and preventing concurrent edits, with clear user feedback.
- **Visuals:** The primary UI is the existing Write Drawer (`write1.png`). No new specific visuals exist for the lock warning.
- **Key Elements:**
    - **Edit Flow:** The Write Drawer should look identical to the creation flow, but be pre-populated with the story's content. The main action button in the toolbar should be "Save Changes", not "Publish".
    - **Lock Warning:** A non-intrusive but clear warning banner or modal should be displayed when a story is locked. It should state "Story is being edited by [Name]" and provide a way to go back. The inputs in the Write Drawer must be disabled.

**Acceptance Criteria:**
- [ ] Edit button in "Published" tab or "Team Stream" opens the Write drawer pre-filled with that story's data.
- [ ] When opening an editable story, a lock is acquired in the database.
- [ ] Attempting to edit a story locked by another user shows a clear warning message, and all editing fields are disabled.
- [ ] "Save Changes" button updates the story and releases the lock.
- [ ] The lock is automatically released after 5 minutes of inactivity.
- [ ] Non-editors do not see an "Edit" option in the three-dot menu for stories in the Team Stream.

---

## Phase 7: Trainer Dashboard, Admin Panel & Guest Editors

**Dependencies:** Phase 6  
**Deliverables:**
- [ ] Trainer login detection (separate Trainer ID password)
- [ ] Trainer dashboard (shows all teams, all stories, activity log)
- [ ] Teams tab in Settings (visible to trainer + guest editors only)
- [ ] Teams tab displays all teams as expandable dropdowns
- [ ] Each team shows: name, member count, story count, expand chevron
- [ ] Expand team: show all members with X button (remove any member)
- [ ] Preview icon (eye) next to team name: Opens Team Stream drawer for that team
- [ ] Trainer can view/edit all stories (no lock restriction)
- [ ] Trainer can pin/unpin any story
- [ ] Trainer can delete any story
- [ ] Activity log displayed (Journalist, Team, Action, Story, Timestamp)
- [ ] Admin tab (visible to trainer only, NOT guest editors)
- [ ] Admin tab: Set Trainer ID, set Course ID, set Guest Editor ID
- [ ] Admin tab: Display fallback thumbnail image upload
- [ ] Admin tab: Danger Zone — Clear Course (destructive)
- [ ] Clear Course flow: Confirmation dialog + type "DELETE" + final confirmation
- [ ] After Clear: Delete all data (newslabs, teams, stories, journalists, activity_log), redirect to splash
- [ ] Guest Editor login detection (separate Guest Editor ID password)
- [ ] Guest Editor role: Can access Teams tab (same as trainer) + view/edit/pin all stories
- [ ] Guest Editor role: NO Admin tab (cannot clear course or set IDs)
- [ ] Edit team settings from trainer Teams tab (change color, upload logo, team name, manage editors)
- [ ] Trainer/Guest Editor can toggle team member editor status

**Components to Build:**
- Update `SettingsPage.svelte` to add Teams + Admin tabs
- `TeamsTab.svelte` — List of all teams with expand/collapse
- `TeamExpandedView.svelte` — Member list, preview icon, edit team settings
- `AdminTab.svelte` — ID inputs, fallback image, danger zone
- Update `ThreeDotsMenu.svelte` — Trainer/Guest Editor can edit any story
- `ActivityLog.svelte` — Table view of recent actions
- `ActivityLogRow.svelte` — Single log entry
- `FallbackImageUpload.svelte` — Fallback thumbnail for stories without images
- `ClearCourseModal.svelte` — Destructive deletion confirmation

**Design & UI/UX Focus:**
Visuals: trainer1.png, trainer2.png, trainer3.png, trainer4.png
Icons: icon-collapse.svg, icon-expand.svg, 

- The trainer requires additional privileges in order to monitor and edit stories created across all teams, set training IDs and delete content at the end of courses. 
- At the same time it is important the trainer is able to demonstrate the app exactly as it appears to everyone else.
- For the above reasons the trainer app is identical to the app used by journalists EXCEPT for two additional tabs in the settings (+ editor privileges in editing stories from the team streams)
- The trainer is able to access these additional functions by using a separate ID.
- Optionally there may be one (or more) guest editors. I propose there is also a Guest Editor ID which gives access to all the Editor functions, plus the Settings/Teams Tab (which means the Guest editor can monitor and edit stories for all teams). The Guest Editor access does NOT include the Admin tab, so the guest editor cannot set IDs or delete all course content and data.

Settings Tab**
- The basic settings tab for the trainer is identical to everyone else. If the trainer needed to, they could join or set up a team. While demonstrating the app, the trainer would do just that, join or create a team to show how it works. See trainer1.png

Teams Tab**
- All settings and privileges here apply to both Trainer and Guest editor
- The teams tab is where the trainer can monitor all content by all teams. At first the tab is empty except for placeholder text [Teams and members appear here] #999999. See trainer2.png
- As journalists create and join teams, these are displayed automatically in the trainer’s Teams tab. See trainer3.png
- Teams are displayed as a series of #efefef dropdown bars (for example, Team A is displayed in the bar, with an expand chevron to the right, which opens to show all member names in the same style as the Team’s own settings pages. See trainer3.png
- The trainer can also see,  and control if required, the public team stream URL toggle
- The trainer can assign or remove editors and, if required, remove individuals from teams using the buttons in the team member list, as in the basic settings.
- The [Leave the team?] toolbar also applies to the trainer Teams view.
- To the right of team names is a view (icon-preview.svg). When tapped, this launches a drawer (bottom to top) with the Team Stream (thumbnails view - see team1.png). There is an x close to close the drawer.
- The trainer can edit all stories by tapping edit in the three-dot menu
- Tapping a story launches a secondary drawer from left to right with individual stories. The left arrow (icon-arrow-left.svg #777777 on a #efefef circle background to top left slides the drawer closed, returning to the Team Stream).
- Using the Teams tab, the trainer can both monitor and edit all stories, and also give feedback to the whole course group using projection.

 Admin Tab**
- This page is only visible by the Trainer - no-one else including guest editor 
- The trainer admin tab contains core app functions, which the trainer would not wish to be seen while presenting. Therefore the functions are given a separate tab. See trainer4.png. 
The tab comprises:**
    - Trainer ID input window, where the trainer sets the unique ID giving additional privileges. A grey #777777 circle (icon-circle-svg) turns into a purple check (icon-check.svg) when submitted and accepted.
	- Course ID. The ID entered by all course participants. The Course ID check would become active when submitted and activated.
    - Guest Editor ID. This is to set an ID different to the Trainer ID for professional observers. Guest editors have all privileges of the Trainer EXCEPT for the Admin tab. In the same was as the Trainer ID, the Course ID and Guest ID check would become active when submitted and activated.
    - Thumbnail fallback image. If no image is uploaded with a story, the square image added here would be automatically pulled as the thumbnail.
    - Danger zone. Button to reset the app, deleting all teams, members and content. Three step approach: Initial deletion button + input window with placeholder #999999 text [Type the word: Rudiment] + final delete button with ‘DELETE EVERYTHING. ARE YOU SURE?’

**Acceptance Criteria:**
- [ ] Trainer login reveals "Teams" and "Admin" tabs in Settings.
- [ ] Guest Editor login reveals "Teams" tab only.
- [ ] "Teams" tab lists all teams; clicking a team expands it to show members (`trainer3.png`).
- [ ] The preview icon (`icon-preview.svg`) next to a team name opens that team's stream.
- [ ] Trainer can remove members and manage editor status from the "Teams" tab.
- [ ] "Admin" tab provides inputs for Course, Trainer, and Guest Editor IDs, which are functional.
- [ ] The "Clear Course" button initiates a multi-step confirmation process to prevent accidental deletion.

---

## Phase 8: Export, Public Share & Polish

**Dependencies:** Phase 7  
**Deliverables:**
- [ ] PDF export (individual story): Title, image, body, author, date
- [ ] PDF export (team stream): All published stories, one per page, team name + member list
- [ ] PDF generation client-side (jsPDF + html2canvas)
- [ ] Export button in three-dot menus (Draft, Published, Team Stream, Activity Log)
- [ ] Export options dropdown (PDF / TXT formats)
- [ ] TXT export: Plain text version of story
- [ ] Public share feature: Toggle "Share Team" in Settings (editors only)
- [ ] Public share URL: `newslab.app/team-name` (read-only)
- [ ] Public URL route: `GET /share/[team-name]` (no auth required)
- [ ] Public view displays Team Stream preview only (no edit menus, no draft access)
- [ ] Public view shows team branding (logo, color, name, members list)
- [ ] Accessibility: WCAG 2.1 AA (color contrast 4.5:1, focus states, aria labels)
- [ ] Mobile testing: iOS Safari, Android Chrome (min width 390px)
- [ ] Performance: Lighthouse > 85 (mobile), FCP < 2s, LCP < 2.5s
- [ ] TypeScript strict types on all functions
- [ ] Error handling: User-friendly messages for all failures
- [ ] E2E tests (Playwright or Cypress): Full journalist flow, trainer admin, offline sync
- [ ] Documentation: README with setup + deployment instructions

**Components to Build:**
- `ExportButton.svelte` — Dropdown with export format options
- `PDFExporter.svelte` — Client-side PDF generation (jsPDF + html2canvas)
- `PublicTeamStream.svelte` — Read-only Team Stream view (no edit menus)
- `AccessibilityAudit.svelte` — Component testing focus/contrast

**Design & UI/UX Focus:**
- **Goal:** Finalize the app with export features, public sharing, and a final polish pass.
- **Visuals:** Reference `user9.png` for the Export menu concept. The public share page should be a read-only version of `team1.png`.
- **Key Elements:**
    - **Export Menu:** The "Export" option in the three-dot menu should trigger a dropdown with "PDF" and "TXT" options. This dropdown should have a light background (`#f0e6f7` or team secondary color). See `user6.png` for a similar dropdown concept.
    - **Public Share Page:** This page should be a clean, read-only version of the Team Stream. It must include the team header (logo, name, color) but have no footer navigation and no three-dot menus or other interactive elements on the story cards.
    - **Polishing:** This is the phase to ensure all animations are smooth, focus states are clear for accessibility, and all UI elements are pixel-perfect according to the design visuals.

**Acceptance Criteria:**
- [ ] "Export" option in three-dot menus opens a sub-menu to select PDF or TXT.
- [ ] PDF export generates a clean document with the story content.
- [ ] Public share URL (`/share/[teamName]`) is accessible without login and displays a read-only version of the team stream.
- [ ] The public page correctly displays the team's branding (logo, color, name).
- [ ] All interactive elements must have clear focus states for keyboard navigation.
- [ ] All text must meet WCAG AA color contrast ratios.
- [ ] The final app achieves a Lighthouse score of >= 85 on mobile.

---

## Summary: Phase Dependencies

```
Phase 0 (Setup)
  ↓
Phase 1 (Gatekeeper)
  ↓
Phase 2 (Navigation)
  ↓
Phase 3 (Settings + Team Mgmt)
  ↓
Phase 4 (Write Editor)
  ↓
Phase 5 (Publishing + Team Stream)
  ↓
Phase 6 (Story Editing + Locking)
  ↓
Phase 7 (Trainer + Guest Editors)
  ↓
Phase 8 (Export + Public Share + Polish)
```

---

## Progress Tracking Template

Use this template at the start of each phase:

```markdown
## Phase X: [Name]

**Status:** In Progress / Complete
**Started:** [Date]
**Completed:** [Date]

### Deliverables
- [x] Task 1
- [ ] Task 2
- [ ] Task 3

### Known Issues
- Issue 1
- Issue 2

### Next Phase Blockers
None / Issue blocking Phase Y
```

---

**End of Roadmap. Ready for Phase 0 execution.**
