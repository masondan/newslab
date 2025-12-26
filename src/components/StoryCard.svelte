<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { getThumbnailUrl } from '$lib/cloudinary'
  import { teamColors } from '$lib/stores'
  import type { Story } from '$lib/types'
  import ThreeDotsMenu from './ThreeDotsMenu.svelte'

  export let story: Story
  export let showMenu = true
  export let menuType: 'draft' | 'published' | 'stream' = 'draft'
  export let isEditor = false
  export let selectMode = false
  export let selected = false
  export let showPin = false
  export let fallbackImageUrl: string | null = null

  const dispatch = createEventDispatcher<{
    edit: { id: string }
    delete: { id: string }
    unpublish: { id: string }
    export: { id: string; format: 'pdf' | 'txt' }
    pin: { id: string }
    unpin: { id: string }
    select: { id: string; selected: boolean }
    click: { id: string }
  }>()

  let menuOpen = false

  function formatTimeAgo(dateStr: string): string {
    const date = new Date(dateStr)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'Just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
    return date.toLocaleDateString()
  }

  function handleCardClick() {
    if (selectMode) {
      dispatch('select', { id: story.id, selected: !selected })
    } else if (!menuOpen) {
      dispatch('click', { id: story.id })
    }
  }

  function toggleSelect() {
    dispatch('select', { id: story.id, selected: !selected })
  }

  $: thumbnailSrc = story.featured_image_url
    ? getThumbnailUrl(story.featured_image_url)
    : fallbackImageUrl || '/icons/logo-teamstream-fallback.png'

  // Extract body text snippet from content blocks if no summary
  function getSnippet(): string {
    if (story.summary) return story.summary
    
    const blocks = story.content?.blocks || []
    for (const block of blocks) {
      if ((block.type === 'paragraph' || block.type === 'bold') && block.text) {
        return block.text
      }
    }
    return ''
  }
  
  $: bodySnippet = getSnippet()
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-to-interactive-role -->
<article
  class="flex gap-3 py-3 cursor-pointer group"
  on:click={handleCardClick}
  on:keydown={(e) => e.key === 'Enter' && handleCardClick()}
  role="button"
  tabindex="0"
>
  <!-- Thumbnail -->
  <div class="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-[#efefef]">
    <img
      src={thumbnailSrc}
      alt=""
      class="w-full h-full object-cover"
    />
  </div>

  <!-- Content -->
  <div class="flex-1 min-w-0">
    <!-- Timestamp -->
    <div class="flex items-center gap-1 text-xs text-[#777777] mb-1">
      <img
        src="/icons/icon-time.svg"
        alt=""
        class="w-3 h-3 opacity-50"
      />
      <span>{formatTimeAgo(story.updated_at)}</span>
    </div>

    <!-- Title Row -->
    <div class="flex items-start gap-2">
      <h3 class="font-semibold text-sm text-[#333333] line-clamp-2 flex-1 group-hover:text-[#{$teamColors.primary}] transition-colors">
        {story.title}
      </h3>

      {#if selectMode}
        <button
          on:click|stopPropagation={toggleSelect}
          class="shrink-0 mt-0.5"
          aria-label={selected ? 'Deselect' : 'Select'}
        >
          <img
            src={selected ? '/icons/icon-radio.svg' : '/icons/icon-circle.svg'}
            alt=""
            class="w-5 h-5"
            style={selected ? 'filter: invert(14%) sepia(95%) saturate(3500%) hue-rotate(256deg) brightness(75%) contrast(90%);' : 'filter: invert(47%) sepia(0%) saturate(0%) brightness(55%);'}
          />
        </button>
      {:else if showMenu}
        <button
          on:click|stopPropagation={() => menuOpen = !menuOpen}
          class="shrink-0 p-1 -mr-1"
          aria-label="More options"
        >
          <img
            src="/icons/icon-more.svg"
            alt=""
            class="w-5 h-5"
            style={menuOpen ? 'filter: invert(14%) sepia(95%) saturate(3500%) hue-rotate(256deg) brightness(75%) contrast(90%);' : 'filter: invert(47%) sepia(0%) saturate(0%) brightness(55%);'}
          />
        </button>
      {/if}
    </div>

    <!-- Body text snippet -->
    {#if bodySnippet}
      <p class="text-xs text-[#777777] line-clamp-2 mt-1">
        {bodySnippet}
      </p>
    {/if}

    <!-- Author + Pin indicator -->
    <div class="flex items-center justify-between mt-2">
      {#if showPin && story.is_pinned}
        <div class="flex items-center gap-1 text-xs text-[#777777]">
          <img
            src="/icons/icon-pin-fill.svg"
            alt=""
            class="w-3 h-3"
            style="filter: invert(14%) sepia(95%) saturate(3500%) hue-rotate(256deg) brightness(75%) contrast(90%);"
          />
        </div>
      {:else}
        <span></span>
      {/if}
      <span class="text-xs text-[#777777]">{story.author_name}</span>
    </div>
  </div>
</article>

<!-- Three Dots Menu -->
{#if menuOpen && showMenu}
  <ThreeDotsMenu
    type={menuType}
    isPinned={story.is_pinned}
    {isEditor}
    on:edit={() => { dispatch('edit', { id: story.id }); menuOpen = false }}
    on:delete={() => { dispatch('delete', { id: story.id }); menuOpen = false }}
    on:unpublish={() => { dispatch('unpublish', { id: story.id }); menuOpen = false }}
    on:export={(e) => { dispatch('export', { id: story.id, format: e.detail.format }); menuOpen = false }}
    on:pin={() => { dispatch('pin', { id: story.id }); menuOpen = false }}
    on:unpin={() => { dispatch('unpin', { id: story.id }); menuOpen = false }}
    on:close={() => menuOpen = false}
  />
{/if}
