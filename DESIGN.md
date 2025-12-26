### App structure overview

The mobile-first NewsLab web app consists of the following pages, tabs and drawers

1. Splash screen. Solid colour, NewsLab logo and ID input window

2. User Home. Default page. Accessed from footer button. With two tabs:
    - Drafts Tab. Thumbnail preview list (Each preview has menu options to Edit/Delete)
    - Published Tab. Thumbnail preview list (Each preview has menu options to Edit/Delete/Unpublish)

3. Write. Accessed from footer button. Consists of:
    - Write Drawer (Full screen. Triggered from Write button. Rises from bottom to top). Canvas for creating stories (includes menu for text styles, media import, embed, preview, pin and publish)
    - Preview drawer (Full screen. Appears from left to right), Screen for previewing draft stories during editing, prior to publishing.

4. Team Stream. Accessed from footer button. 
    - Page with thumbnail + snippets to preview team’s published stories in a scrolling list.
    - Full page drawer (rises bottom to top) for viewing individual team published stories in full. Triggered by tapping preview. 

5. Settings. Accessed from footer menu
    - Name, Team Name, Team Members, Assign Editors, Logo, and Team Theme colour selector

6. Settings for Trainer & Guest Editor
	**Trainer**
    - The trainer has a separate entry ID, giving additional permissions.
    - The trainer’s app view is identical to the journalists’ view, with the addition of two tabs in Settings, Teams and Admin:
        - Teams: The trainer can view all team names and members, view Team Streams for all teams, and edit all stories using the three-dot menu in each Team Stream editor view.
        - Admin: Set Trainer ID, Guest Editor ID, Course ID plus ‘danger zone’ for deleting all teams, members and stories (resetting the app prior to next training)
	**Guest Editor**
	- There may be one (or more) guest editors using a single Guest Editor ID. Guest editors have additional privileges: 
	- Access to a Teams Tab in Settings to view the content from all teams
	- Guest editors can edit all stories via the Team Streams visible in the Teams tab, in the same way as the Trainer.


**Note on team themes**

- The primary app colours apply by default throughout the app: #5422b0 with contrasting lighter #f0e6f7
- In Settings, editors only can select one of six team theme colours by tapping a colour circle button
- Team themes consist of a primary (dark) colour and contrasting light colour. 
- Only one colour can be selected per team (by an editor)
- Team theme colours appear in all places, including buttons and hovers, replacing the default purple

**Team theme colours**

"Indigo Bloom":"5422b0","Lavender Veil":"f0e6f7" (Default)
"Stormy Teal":"057373","Honeydew":"d6ebdd"
"Baltic Blue":"00639c","Alice Blue":"dbeffa"
"Royal Orchid":"9100ae","Thistle":"f0cbf6"
"Oxidized Iron":"b12e09","Almond Silk":"f6d4cb"
"Brick Ember":"d60202","Cotton Rose":"ffd6d6"

- Team editors can also upload a square team logo from the Settings page
- Team editors can select a logotype font, displayed as the team name in the header of the Team Stream

### Page by page design guide

### 1 Splash screen


- Visuals splash1.png, splash2.png, splash3.png
- Icons/logos: newslab-textlogo-white.png

- The splash page has a solid #5422b0 background with white newslab logo (logo-textlogo-white.png)
- An input window (#efefef background) carries the placeholder text [Enter your key] Text color: #777777. This is the course ID provided by the Trainer (eg Nigeria-0126). See splash1.png
- When a journalist taps the input window, a fine #efefef ‘active’ border appears around the input box and an ‘enter’ button appears to the right of the input screen (icon-login-fill.svg color: #5422b0)
- The journalist adds the course ID and taps the ‘enter’ button.
	- If the ID is WRONG, the circle cross icon (icon-close-circle-fill.svg color: 5422b0 ) is displayed with the message: [Try again]
	- If the ID is correct, a check icon is displayed (icon-check-fill.svg Color: #5422b0), the fine white border disappears (the check remains) and a second input window appears below with the placeholder text [Enter your byline]
- When a journalist taps the byline input window, a fine #efefef ‘active’ border appears around the input box and an ‘enter’ button appears to the right of the input screen (icon-login-fill.svg color: #5422b0)
- The journalist adds their byline name and taps the ‘enter’ button. See splash3.png.
	- If the name is already taken, the circle cross icon (icon-close-circle-fill.svg color: 5422b0 ) is displayed with the message: [Name taken. Choose another]
	- If the name is available, a check icon is displayed (icon-check-fill.svg Color: #5422b0), the fine white border disappears (the check remains) and the app redirects to the user Home page (default Drafts tab)

**User re-entry**
- If the journalists closes the app then re-opens the app on the same device, if the user ID and name are in local memory, the app will open at the default user home / draft tab. No splash page or ID/byline input required
- If the user opens the app on a new device, the splash page appears and they will be required to add ID / byline to gain entry. 
- The journalist should be able to use concurrent devices to create/edit stories


### 2 User Home

**Initial view**

- Visuals: user1.png, user2.png
- Icons/logos: icon-user.svg, icon-user-fill.svg,  icon-group.svg, icon-group-fill.svg, icon-newstory.svg, icon-settings.svg, icon-settings-fill.svg

**The page has two tabs: Drafts and Published (Active purple 5422b0 + underline, inactive #777777)**
    - At first the Draft tab is empty and displays a #777777 notification: Nothing to show. / First, create or join a team in Settings. Then start writing.
    - At first the Draft tab is empty and displays a #777777 notification: Nothing to show. / Published stories appear here and in your Team Stream.


**Footer menu**

    - The footer menu has a white background and fine 1px #777777 line above.
    - Centered in the footer is a white on solid purple circle (Write - icon-newstory.svg #5422b0), the top of which modestly overlays a horizontal 1pt #777777 full-width line. This icon is larger than others on the footer. A filled svg is provided: icon-newstory.svg
    - To the left of the Write button is the user home button (icon-user-fill.svg #5422b0 when the page is active, icon-user.svg #777777 when a different page is selected)
    - To the right of the Write button is the Team Stream button (icon-group.svg #777777 when inactive, icon-group-fill.svg #5422b0 when active)
    - At the far right of the footer is the settings button (icon-settings.svg #777777 when inactive, icon-settings-fill.svg #5422b0 when active


### Drafts tab

- Visuals: user3.png, user4.png, 
- Icons: icon-more.svg, icon-select-all.png, icon-select-all-fill.svg, icon-trash.svg, icon-time.svg, icon-radio.svg, icon-circle.svg

- When the journalist has created story drafts, they appear in the Drafts list. This is the app default tab view when a journalist first enters the app.

- **Each preview includes**
    - a square thumbnail image (with fallback image uploaded via the trainer settings) aligned left
    The preview to the right of the thumbnail has four rows. From top to bottom:
    - 1 timestamp (clock icon - icon-time.svg)
    - 2 headline (max two lines)
    - 3 text (max two lines)
    - 4 journalist name (name only - not ‘By …’ ) aligned right
    - To the right of the headline is a three-dot menu. #777777 by default, #5422b0 when active
    - Under each preview is a fine separator EXCEPT under the last preview in the list.

- When content exists, the ‘select all’ button appears at the top right of the page. When inactive the icon (icon-select-all.svg is #777777. When active it changes to icon-select-all-fill.svg with #5422b0 colour).


**Three dot menu**

Visuals: user4.png, user5.png, user6.png

- When the three dot menu is active it turns #5422b0
- Tapping a three-dot menu triggers a toolbar below the preview (but before the separator). This includes, from left: [trash icon][Export][Edit]  See: user4.png
- Tapping Delete triggers an extension to the left of the toolbar with Delete? confirmation. See user5.png
- Tapping Export launches a dropdown menu (#f0e6f7) with two download options: PDF or TXT. See user6.png

**Select all**

Visuals: user7.png
Icons: icon-circle.svg, icon-radio.svg

- Tapping the Select all button at the top right (icon-select-all.svg #777777) makes the button active (icon-select-all-fill.svg colour #5422b0.
- Tapping the select all button triggers circle buttons (icon-circle.svg #777777) that replace the three-dot menus in the list of previews.
- Selecting one or more circles (which become radio buttons - icon-radio.svg #5422b0) displays the purple trash icon next to the Select All button
- Tapping the trash icon triggers a confirmation tooltip to its left (Delete?)
- Selected previews/stories are deleted, the Select All button goes back to its inactive state and three-bar menus replace the radio buttons.

### Published Tab

- Visuals: user8.png, user9.png, user10.png, user11.png user12.png

- Published tab contains previews of stories published only by the individual author. The initial layout view is exactly the same as the Drafts preview display. See user8.png
- For desktop browsers, there is a hover effect that turns headlines #5422b0 (or selected team theme color)


**Three dot menu**

- The three dot menu triggers a toolbar in the same style as the Drafts tab. The three dot toolbar moves from #777777 to #5422b0 on tap. See user9.png
- However, the toolbar buttons are slightly different to the Draft tab toolbar. The order of buttons in the published toolbar is, from left to right: [trash icon)[Unpublish][Export][Edit]
- The Unpublish button moves the story to the journalist’s Drafts tab. It is no longer visible in the Published tab OR in the Team Stream.
- The Export tab works in the exactly the same way as previously, triggering a dropdown menu with PDF and TXT options See user10.png
- the trash can function works in exactly the same was as the Draft tab, triggering a toolbar extension with Delete?
- Edit launches the Write/editing drawer where the journalist can continue to edit the story/

**Select all**

- This works in exactly the same way as on the Drafts tab. Tapping the icon (becomes active) replaces the three dot menus with radio buttons and displays the trash icon. See user11.png user12.png


### 3 Write Page

Visuals: write1.png, write2.png, write3.png, write4.png, write5.png, 

Icons: icon-bold.svg, icon-close-svg, icon-youtube.svg, icon-heading.svg, icon-image.svg, icon-link.svg, icon-preview-fill.svg, icon-preview.svg, icon-publish-fill.svg, icon-publish.svg, icon-separator.svg, icon-custom-upload.svg

- Tapping the centred purple icon-newstory-svg launches the Write drawer (bottom to top), filling the page. An X (#777777) on circle #efefef background at the top left closes the drawer.
- There are two placeholder words: Title and Text, which disappear when the journalist starts to write. See write1.png
- Text pasted into the editor is automatically stripped of HTML attributes, leaving plain text to be edited by the journalist. 
- Styles can be applied using the Style menu

**Style menu**

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


**Story format**

- The title size and font and body size and font are fixed
- The user can use bold, H2 to add subheading and separators to make the story more engaging
- One or more images can be added. Images are compressed to max 800px wide (compressed)
- When an image is inserted, a placeholder text is automatically added under the image: [Tap to add a caption]. If a caption is not entered, no text displays on the the published image.
- Add a word count to the bottom of the story in Write drawer. No word count should appear displayed on the published article.
- When the story is published the author byline (added in the user settings) is inserted automatically at the top of the story, above left of the headline.
- No timestamp is included in the published article (but it appears in the draft, published, and Team Stream


### 4. Team Stream

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

**The toolbar**
	- With fine separators between elements, comprises: [trash icon][Unpublish][Export][Pin icon toggle outline/fill][Edit] See team3.png
	- Trash: Tapping the trash icon in the toolbar extends the toolbar to the left with a [Delete?] Confirmation. Tapping delete deletes the story.
	- Unpublish. Tapping Unpublished puts the story back into the Home/Drafts tab of the individual journalist
	- Export. Triggers a dropdown #f0e6f7 (or team theme) with options for PDF or TXT export. See team4.png
	- Pin toggle. See below

**The Pin**
	- Pinned stories appear ONLY at the top of the Team Stream (not at the top of the user’s Published tab). Pinned stories are a function restricted to the Team Stream.
	- In the Team Stream pin stories carry a pin icon icon-pin.svg to the left of the journalist name, aligned left under the headline and text snippet. See team3.png
	- A maximum of THREE pinned stories can appear at the top of the Team Stream, added by editors only. Pinned stories appear with the most recently pinned stories at the top of the Team Stream. If, for example, three pinned stories exist on the Team Stream, and another story is pinned, the pin is automatically removed from the oldest pinned story. This unpinned story now appears in normal date order within the Team Stream.
	- Editors/Trainer/Guest Editor can toggle pins on and off using the button in the Team Stream toolbar.
**Preview**

- tapping a story in the team stream launches a drawer from the bottom of the page with the individual story displayed. See team5.png
- The top of the page displays the team theme colour, logo and team name
- The format is as Draft preview: Byline to top left, under which is the headline then content.
- The drawer is closed with a close x #777777 on #efefef circle background.


### 5. Journalist/Team Settings

Visuals: settings1.png, settings2.png, settings3.png, settings4.png
Icons: icon-check.svg, icon-circle.svg, icon-upload.svg, icon-close-circle.svg, icon-close.svg, icon-toggle-on.svg, icon-toggle-on.svg, icon-copy.svg


- Accessed via the settings icon in the footer. Active #5422b0, inactive #777777
- Journalists see only one settings page

- Initial view of the Settings page (with byline name automatically added): settings1.png

**Settings page elements** 

From the top down …

**Byline input window - name added** 
	- See settings1.png
	- The journalist was required to submit a byline name on the splash screen
	- The byline name will automatically appear in the settings
	- The byline input field is an #efefef window. To the right - if the name is registered in the database - is a purple #5422b0 check icon (icon-check.svg)
	- The journalist would normally not need to touch this name unless they want to change it.

**Byline input window - change name** 
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

**Team name input window.** 
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

**Team members**
	- See settings5.png
	- The Team Members section below the Team Name input is empty at first. There is placeholder text that says [Team members will appear here]. This disappears when team member names are added.
	- The journalist who added the team name automatically becomes an editor.
	- Names of other team members appear in a list automatically, with fine separators as team members are added. All team members can see each other’s names in their app settings. 


**Editors**
	- See settings6.png
	- The person who first creates the team AUTOMATICALLY is made an Editor. The Editor checkbox (icon-check.svg #5422b0) is then active by default (but can be changed later)
	- Teams can have one or more editors. Only editors can create or remove other editors.
	- Once created, ONLY editors can amend the team name. This should be blocked for non-editors
	- Only Editors can select the team colour, upload the team logo, activate the team stream sharing toggle. These functions should be blocked for non-editors. 
	- There must always be at least one editor per team. If an editor who is the last in the team tries to remove their editor status by unchecking the button to the right of their name, a message modal appears to say [Teams must have at least one editor. Add another then try again] with a [Got it] confirmation button to close the modal.
	- Closing a Team. To close a team, members leave (or are removed) until only a final editor is left. When that editor leaves the team, the team is closed and the team name is removed.

**Removing a team member**
	- settings7.png
	- To the left of each name is an x close icon (icon-close.svg). This is to remove members from the team.
	- Only editors/trainer/guest editors can remove members from the team. 
	- To remove a member, editors/trainer/guest editors tap the x next to the name. The name and x are highlighted with #5422b0 and a toolbar below the list of members is displayed in #5422b0. 
	- This toolbar has a confirmation [Remove from team?] with check (yes) and cancel (no) buttons (icon-check.svg, icon-close-circle.svg).
	- Tapping ‘Remove from team?’ Removes the person from that team. Their name disappears under the Team Name and the Team Name input box becomes blank.

**Content of removed members**
	- Journalists must belong to a team to Publish stories. They can create Drafts, but cannot Publish (why? Because where would they publish to?).
	- A journalist may have been part of a team and published stories. What happens to these stories?
	- If a journalist who has created content leaves a team, all stories published by the journalist are moved back to Drafts. They no longer appear in Published or in the Team Stream. 
	- When the journalist joins a different team, they republish all their stories. (In reality not too onerous - journalists will probably create 5-10 stories during a course)


**team themes**
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

**Logo upload**
	- See settings7.png
    - The logo text says: [Upload a team logo (square)*]. See settings4.png
	- Logos must be square. Only editors can upload a team logo. 
	- There is a dotted square #777777 below the title with an upload button icon-upload.svg
	- If no logo is uploaded, use the fallback: newslab-logo-fallback.png This logo shows by default on the Team Stream with the placeholder team name: Team NewsLab 
	- A small close x button should be placed in the corner of the thumbnail when uploaded to delete the image


**Team stream share URL**
	- see settings8.png
	- After a team is created, a public URL can be generated (ONLY by an editor/the trainer/guest editor) to share the team’s ‘website’ (team stream).
	- By default the setting displays a small header [share team stream*] with full width fine underscore. Aligned right is a toggle button switch OFF by default.
	- Note: Create the toggle using CSS to achieve a smooth animated effect. However, if this proves difficult, toggle box svgs are added to static/icons: icon-toggle-on.svg and icon-toggle-off.svg.
	- When an editor toggles the URL generator ON, a URL is displayed in a pale grey #efefef box beneath the title and toggle box. A copy button sits inside the box aligned right. Icon-copy.svg. See settings6.png
	- When the URL toggle is on (active colour #5422b0) and the URL generated, it can be copied by any member of the team.
	- The URL format should be simple: newslab.app/team-name (there is no danger of future clashes because all data and content will be erased at the end of each training course)
	-Note: The website may benefit from a little styling, which can be done after the initial shared site (the team stream) is complete. Consider a collapsible header, leaving just the team name visible in a slim translucent header; perhaps previous/next below individual stories? Desirable but not essential.


### 6 Trainer and Guest Editor Settings

Visuals: trainer1.png, trainer2.png, trainer3.png, trainer4.png
Icons: icon-collapse.svg, icon-expand.svg, 

- The trainer requires additional privileges in order to monitor and edit stories created across all teams, set training IDs and delete content at the end of courses. 
- At the same time it is important the trainer is able to demonstrate the app exactly as it appears to everyone else.
- For the above reasons the trainer app is identical to the app used by journalists EXCEPT for two additional tabs in the settings (+ editor privileges in editing stories from the team streams)
- The trainer is able to access these additional functions by using a separate ID.
- Optionally there may be one (or more) guest editors. I propose there is also a Guest Editor ID which gives access to all the Editor functions, plus the Settings/Teams Tab (which means the Guest editor can monitor and edit stories for all teams). The Guest Editor access does NOT include the Admin tab, so the guest editor cannot set IDs or delete all course content and data.

**Settings Tab**
- The basic settings tab for the trainer is identical to everyone else. If the trainer needed to, they could join or set up a team. While demonstrating the app, the trainer would do just that, join or create a team to show how it works. See trainer1.png

**Teams Tab**
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

** Admin Tab**
- This page is only visible by the Trainer - no-one else including guest editor 
- The trainer admin tab contains core app functions, which the trainer would not wish to be seen while presenting. Therefore the functions are given a separate tab. See trainer4.png. 
    - **The tab comprises:**
    - Trainer ID input window, where the trainer sets the unique ID giving additional privileges. A grey #777777 circle (icon-circle-svg) turns into a purple check (icon-check.svg) when submitted and accepted.
	- Course ID. The ID entered by all course participants. The Course ID check would become active when submitted and activated.
    - Guest Editor ID. This is to set an ID different to the Trainer ID for professional observers. Guest editors have all privileges of the Trainer EXCEPT for the Admin tab. In the same was as the Trainer ID, the Course ID and Guest ID check would become active when submitted and activated.
    - Thumbnail fallback image. If no image is uploaded with a story, the square image added here would be automatically pulled as the thumbnail.
    - Danger zone. Button to reset the app, deleting all teams, members and content. Three step approach: Initial deletion button + input window with placeholder #999999 text [Type the word: Rudiment] + final delete button with ‘DELETE EVERYTHING. ARE YOU SURE?’




