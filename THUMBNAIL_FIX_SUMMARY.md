# Thumbnail Display Fix

## Problem
Story cards in Drafts, Published, and Team Stream showed only fallback image even when stories had images or videos in their content.

## Root Cause
`StoryCard.svelte` only checked `story.featured_image_url` for thumbnails. When users added images inline to story content, those images went into `content.blocks` (not featured_image_url), so cards showed fallback instead.

## Solution
Updated `StoryCard.svelte` with `getThumbnail()` function that:
1. Uses `featured_image_url` if it exists (fallback for explicit featured images)
2. Searches `content.blocks` for first image and uses it as thumbnail
3. For YouTube videos, uses the stored `thumbnailUrl`
4. Falls back to course/default fallback image only if nothing else found

## Changes

### StoryCard.svelte
- Replaced inline `$: thumbnailSrc` reactive statement with `getThumbnail()` function
- Function checks featured image first, then searches content blocks for images/videos
- Updates `$: thumbnailSrc = getThumbnail()` reactively

## Result
- Stories with inline images now show those images as thumbnails in card lists
- Stories with YouTube videos show video thumbnails
- Featured images still take priority if explicitly set
- Fallback images only used when story has no media
