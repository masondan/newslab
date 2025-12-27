# Caption Removal - Simplification

## Summary
Removed image captions entirely to eliminate complexity and ensure images render reliably.

## Changes Made

### WriteDrawer.svelte
1. **createBlockElement() - image case**:
   - Removed caption input element creation
   - Simplified to just figure > div > img + delete button
   - Store URL in `figure.dataset.url` (single source of truth)

2. **handleInlineImageUpload()**:
   - Removed caption input element creation
   - Simplified figure structure to match createBlockElement()
   - Store URL in `figure.dataset.url`

3. **parseEditorContent() - figure parsing**:
   - Drastically simplified: just read `figure.dataset.url`
   - No more URL normalization logic
   - No more caption extraction
   - No more input element searching
   - Returns: `{ type: 'image', url: string }`

### PreviewDrawer.svelte
- Removed figcaption element rendering for image blocks

### StoryReaderDrawer.svelte
- Removed caption HTML generation in renderBlock()

### types.ts
- Removed `caption?: string` from ContentBlock interface

## Benefits
- **Simpler parsing**: Single data attribute instead of searching for caption inputs
- **Cleaner DOM**: No extra input elements in contenteditable area
- **Fewer bugs**: No URL storage/retrieval issues
- **Less code**: ~50 lines of complexity removed
- **More reliable**: Images now have single source of truth

## Testing
Build successful. Ready to test image creation and publishing workflow.
