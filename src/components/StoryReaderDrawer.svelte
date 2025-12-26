<script lang="ts">
  import { storyReaderDrawerOpen, currentViewingStory, session } from '$lib/stores'
  import { fly } from 'svelte/transition'
  import { getOptimizedUrl } from '$lib/cloudinary'
  import type { ContentBlock } from '$lib/types'

  export let teamName = 'Team NewsLab'
  export let teamLogoUrl: string | null = null
  export let primaryColor = '5422b0'
  export let secondaryColor = 'f0e6f7'

  $: displayTeamName = teamName || $session?.teamName || 'Team NewsLab'
  $: storyData = $currentViewingStory?.story
  $: authorName = storyData?.author_name || 'Unknown'
  $: title = storyData?.title || ''
  $: featuredImageUrl = storyData?.featured_image_url
  $: contentBlocks = storyData?.content?.blocks || []

  function closeDrawer() {
    storyReaderDrawerOpen.set(false)
    currentViewingStory.set(null)
  }

  function extractYouTubeId(url: string): string {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)
    return match ? match[1] : ''
  }

  function renderBlock(block: ContentBlock): string {
    switch (block.type) {
      case 'paragraph':
        return `<p class="mb-4 text-base text-[#333333] leading-relaxed">${escapeHtml(block.text || '')}</p>`
      case 'heading':
        return `<h2 class="text-xl font-bold my-4 text-black">${escapeHtml(block.text || '')}</h2>`
      case 'bold':
        return `<p class="mb-4 text-base text-[#333333] leading-relaxed"><strong>${escapeHtml(block.text || '')}</strong></p>`
      case 'list':
        const tag = block.listType === 'ordered' ? 'ol' : 'ul'
        const listClass = block.listType === 'ordered' ? 'list-decimal' : 'list-disc'
        const items = (block.items || []).map(item => `<li>${escapeHtml(item)}</li>`).join('')
        return `<${tag} class="${listClass} ml-6 mb-4 text-base text-[#333333]">${items}</${tag}>`
      case 'separator':
        return `<hr class="w-1/2 mx-auto my-6 border-[#777777]" />`
      case 'image':
        const caption = block.caption ? `<figcaption class="text-sm text-center text-[#777777] mt-2">${escapeHtml(block.caption)}</figcaption>` : ''
        return `<figure class="my-4"><img src="${getOptimizedUrl(block.url || '')}" alt="" class="w-full rounded-lg" />${caption}</figure>`
      case 'youtube':
        const videoId = extractYouTubeId(block.url || '')
        return `<div class="my-4 aspect-video"><iframe src="https://www.youtube.com/embed/${videoId}" class="w-full h-full rounded-lg" frameborder="0" allowfullscreen></iframe></div>`
      case 'link':
        return `<a href="${block.url}" target="_blank" style="color: #${block.color || primaryColor};" class="hover:underline">${escapeHtml(block.text || '')}</a>`
      default:
        return ''
    }
  }

  function escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
</script>

{#if $storyReaderDrawerOpen}
  <div
    class="fixed inset-0 z-50 bg-white flex flex-col"
    transition:fly={{ y: '100%', duration: 300 }}
  >
    <!-- Team Header -->
    <header 
      class="py-4 text-center border-b-2 shrink-0"
      style="background-color: #{secondaryColor}; border-color: #{primaryColor};"
    >
      <div 
        class="w-12 h-12 mx-auto mb-2 rounded-lg overflow-hidden bg-white border-2"
        style="border-color: #{primaryColor};"
      >
        <img
          src={teamLogoUrl || '/icons/logo-teamstream-fallback.png'}
          alt="Team logo"
          class="w-full h-full object-cover"
        />
      </div>
      <h1 class="text-base font-semibold" style="color: #{primaryColor};">
        {displayTeamName}
      </h1>
    </header>

    <!-- Close button -->
    <button
      on:click={closeDrawer}
      class="absolute top-4 left-4 w-8 h-8 rounded-full bg-[#efefef] flex items-center justify-center z-10"
      aria-label="Close"
    >
      <img
        src="/icons/icon-close.svg"
        alt=""
        class="w-4 h-4"
        style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
      />
    </button>

    <!-- Content -->
    <main class="flex-1 px-4 py-6 overflow-y-auto">
      {#if storyData}
        <article>
          <!-- Byline -->
          <p class="text-sm text-[#777777] mb-1">By {authorName}</p>
          
          <!-- Title -->
          <h2 class="text-2xl font-bold text-black mb-4">{title}</h2>
          
          <!-- Featured Image -->
          {#if featuredImageUrl}
            <figure class="mb-4">
              <img 
                src={getOptimizedUrl(featuredImageUrl)} 
                alt="" 
                class="w-full rounded-lg"
              />
            </figure>
          {/if}
          
          <!-- Content Blocks -->
          <div class="story-content">
            {#each contentBlocks as block}
              {@html renderBlock(block)}
            {/each}
          </div>
        </article>
      {:else}
        <div class="flex items-center justify-center h-full text-[#777777]">
          <p>No story selected</p>
        </div>
      {/if}
    </main>
  </div>
{/if}

<style>
  .story-content :global(a) {
    text-decoration: none;
  }
  
  .story-content :global(a:hover) {
    text-decoration: underline;
  }
</style>
