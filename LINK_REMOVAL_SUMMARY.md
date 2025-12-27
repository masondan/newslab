# Link Removal Feature

## Functionality
Journalists can now remove links from text in the write drawer:

1. Highlight text and add a link (existing behavior)
2. Click anywhere on the active link
3. Link icon changes to unlink icon (with highlight)
4. Click unlink to remove the link (text remains)
5. Icon resets to link mode, ready for next link

## Implementation

### WriteDrawer.svelte

**New function: `removeLink()`**
- Finds the active `<a>` element from cursor position
- Extracts link text
- Replaces link element with plain text node
- Triggers save and re-render

**Updated link button**
- Click handler now toggles: `isLinkActive ? removeLink : openLinkModal`
- Icon toggles: shows `icon-unlink.svg` when `isLinkActive = true`
- Aria label updates: "Remove link" when active, "Add link" when inactive
- Background highlight remains (existing behavior)

## Technical Notes
- Uses existing `isLinkActive` state (already tracked by `handleSelectionChange()`)
- No new dependencies
- Existing link creation logic unchanged
- Works with the text parsing/preview/publishing flow
