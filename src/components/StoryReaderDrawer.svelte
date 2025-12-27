<script lang="ts">
  import { storyReaderDrawerOpen, currentViewingStory, session } from '$lib/stores'
  import { fly } from 'svelte/transition'
  import { getOptimizedUrl } from '$lib/cloudinary'
  import type { ContentBlock } from '$lib/types'

  export let teamName = 'Team NewsLab'
  export let teamLogoUrl: string | null = null
  export let primaryColor = '5422b0'
  export let secondaryColor = 'f0e6f7'

  let scrollY = 0
  let headerOpacity = 1

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

  function handleScroll(e: Event) {
    const main = e.target as HTMLElement
    scrollY = main.scrollTop
    // Reduce opacity as user scrolls down, min opacity at 100px
    headerOpacity = Math.max(0.3, 1 - scrollY / 100)
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
        return `<hr class="w-1/2 mx-auto my-6 border-[#999999]" />`
      case 'image':
        return `<figure class="my-4"><img src="${getOptimizedUrl(block.url || '')}" alt="" class="w-full rounded-lg" /></figure>`
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
    class="fixed bottom-0 left-1/2 -translate-x-1/2 max-w-[480px] w-full z-50 bg-white flex flex-col max-h-screen"
    transition:fly={{ y: '100%', duration: 300 }}
  >
    <!-- Slim Header -->
    <header 
      class="sticky top-0 z-40 px-4 py-3 flex items-center justify-center border-b transition-opacity duration-300"
      style="background-color: #{secondaryColor}; border-color: #{primaryColor}; border-width: 1px; opacity: {headerOpacity};"
    >
      <!-- Close button -->
      <button
        on:click={closeDrawer}
        class="absolute left-4 w-8 h-8 rounded-full bg-[#efefef] flex items-center justify-center"
        aria-label="Close"
      >
        <img
          src="/icons/icon-close.svg"
          alt=""
          class="w-4 h-4"
          style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
        />
      </button>
      
      <h1 class="text-sm font-semibold" style="color: #{primaryColor};">
        {displayTeamName}
      </h1>
    </header>

    <!-- Content -->
    <main class="flex-1 px-4 py-6 overflow-y-auto" on:scroll={handleScroll}>
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
