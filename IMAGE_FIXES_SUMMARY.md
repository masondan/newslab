# Image Rendering Bug Fixes

## Problems Fixed

### 1. Images Affecting Text Beneath Them
**Issue**: Inserting an image changed font size, paragraph spacing, or caused text to disappear.

**Root Cause**: 
- Figures had minimal bottom margin (`mb-2`) which didn't match paragraph spacing (`mb-4`)
- Missing explicit paragraph breaks after images forced contenteditable to handle flow awkwardly

**Fix**:
- Changed figure margins from `mt-4 mb-2` to `my-4` with inline `margin: 1rem 0`
- Added automatic spacer paragraphs after images during `renderContentToEditor()`
- Spacers are filtered out during parsing to avoid persisting empty paragraphs

### 2. HTML Code Showing Below Images When Published
**Issue**: Publishing a story showed raw HTML markup beneath images.

**Root Cause**:
- Parser was using generic `querySelector('input')` which could capture unintended input elements
- Cloudinary optimized image URLs were being stored inconsistently

**Fix**:
- Changed to `querySelector('input[type="text"]')` for precise caption input selection
- Added URL normalization to extract original URLs from Cloudinary optimized versions
- Ensured `data-imageUrl` attribute is properly used as the source of truth

### 3. Caption Inputs Not Properly Editable
**Issue**: While captions worked, the input wasn't explicitly marked as contentEditable.

**Fix**:
- Added `contentEditable='true'` to caption input elements for consistency

## Changes Made

### WriteDrawer.svelte

1. **renderContentToEditor()** (lines 202-218):
   - Added spacer paragraphs after images/videos to prevent text flow issues
   - Spacers contain only `&nbsp;` and are filtered during parsing

2. **createBlockElement()** - image case (lines 233-276):
   - Updated margin from `mt-4 mb-2` to `my-4` with explicit style
   - Added `contentEditable='true'` to caption input

3. **handleInlineImageUpload()** - figure creation (lines 600-641):
   - Updated margin to match `createBlockElement()`
   - Added explicit `margin: 1rem 0` style
   - Added `contentEditable='true'` to caption input

4. **parseEditorContent()** - figure parsing (lines 375-395):
   - Changed to `querySelector('input[type="text"]')` for precise selection
   - Added URL normalization for Cloudinary URLs
   - Added spacer paragraph filtering (skip `&nbsp;` and empty paragraphs)

## Testing Notes

- Images now maintain consistent spacing (1rem above and below)
- Typing after an image works smoothly without font/spacing changes
- Captions remain fully functional
- HTML code no longer appears when published
- Empty spacer paragraphs don't persist in saved content

## Browser Compatibility

These fixes use standard DOM APIs and CSS properties supported across all modern browsers.
