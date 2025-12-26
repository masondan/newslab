<script lang="ts">
  import { fly } from 'svelte/transition'
  import { previewDrawerOpen, session, teamColors } from '$lib/stores'
  import { getOptimizedUrl } from '$lib/cloudinary'
  import type { ContentBlock } from '$lib/types'

  export let title = ''
  export let summary = ''
  export let featuredImageUrl: string | null = null
  export let featuredImageCaption = ''
  export let contentBlocks: ContentBlock[] = []
  export let teamName: string | null = null
  export let teamLogoUrl: string | null = null

  $: displayTeamName = teamName || $session?.teamName || 'Team NewsLab'
  $: authorName = $session?.name || 'Journalist'

  function closeDrawer() {
    previewDrawerOpen.set(false)
  }

  function extractYouTubeId(url: string): string {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)
    return match ? match[1] : ''
  }
</script>

{#if $previewDrawerOpen}
  <div
    class="fixed inset-0 z-[55] bg-white flex flex-col"
    transition:fly={{ x: '100%', duration: 300 }}
  >
    <!-- Team Header -->
    <header
      class="py-6 px-4 text-center"
      style="background-color: #{$teamColors.secondary};"
    >
      <button
        on:click={closeDrawer}
        class="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#efefef] flex items-center justify-center"
        aria-label="Back"
      >
        <img
          src="/icons/icon-arrow-right.svg"
          alt=""
          class="w-4 h-4"
          style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
        />
      </button>

      <!-- Team Logo -->
      <div class="flex justify-center mb-3">
        <img
          src={teamLogoUrl || '/icons/logo-teamstream-fallback.png'}
          alt="Team logo"
          class="w-16 h-16 rounded-lg object-cover"
        />
      </div>

      <!-- Team Name -->
      <h1
        class="text-lg font-bold"
        style="color: #{$teamColors.primary};"
      >
        {displayTeamName}
      </h1>
    </header>

    <!-- Color Bar -->
    <div
      class="h-1"
      style="background-color: #{$teamColors.primary};"
    ></div>

    <!-- Content -->
    <main class="flex-1 overflow-y-auto px-4 py-6">
      <!-- Author -->
      <p class="text-sm text-[#777777] mb-2">By {authorName}</p>

      <!-- Title -->
      {#if title}
        <h2 class="text-2xl font-bold text-[#333333] mb-4">{title}</h2>
      {/if}

      <!-- Summary -->
      {#if summary}
        <p class="text-base text-[#333333] mb-4 italic">{summary}</p>
      {/if}

      <!-- Featured Image -->
      {#if featuredImageUrl}
        <figure class="mb-6">
          <img
            src={getOptimizedUrl(featuredImageUrl)}
            alt=""
            class="w-full rounded-lg"
          />
          {#if featuredImageCaption}
            <figcaption class="text-sm text-[#777777] text-center mt-2">
              {featuredImageCaption}
            </figcaption>
          {/if}
        </figure>
      {/if}

      <!-- Content Blocks -->
      <div class="prose prose-sm max-w-none text-[#333333]">
        {#each contentBlocks as block}
          {#if block.type === 'paragraph'}
            <p class="mb-4">{block.text}</p>
          {:else if block.type === 'heading'}
            <h3 class="text-xl font-bold text-[#333333] mb-4">{block.text}</h3>
          {:else if block.type === 'bold'}
            <p class="mb-4"><strong>{block.text}</strong></p>
          {:else if block.type === 'separator'}
            <hr class="w-1/2 mx-auto my-6 border-[#777777]" />
          {:else if block.type === 'image'}
            <figure class="mb-4">
              <img
                src={getOptimizedUrl(block.url || '')}
                alt=""
                class="w-full rounded-lg"
              />
              {#if block.caption}
                <figcaption class="text-sm text-[#777777] text-center mt-2">
                  {block.caption}
                </figcaption>
              {/if}
            </figure>
          {:else if block.type === 'youtube'}
            <div class="mb-4 aspect-video">
              <iframe
                src="https://www.youtube.com/embed/{extractYouTubeId(block.url || '')}"
                class="w-full h-full rounded-lg"
                frameborder="0"
                allowfullscreen
                title="YouTube video"
              ></iframe>
            </div>
          {:else if block.type === 'link'}
            <p class="mb-4">
              <a
                href={block.url}
                target="_blank"
                rel="noopener noreferrer"
                class="underline"
                style="color: #{block.color || $teamColors.primary};"
              >
                {block.text}
              </a>
            </p>
          {/if}
        {/each}
      </div>

      {#if !title && contentBlocks.length === 0}
        <div class="text-center text-[#999999] py-12">
          <p>Nothing to preview yet.</p>
          <p class="text-sm mt-2">Start writing to see your story here.</p>
        </div>
      {/if}
    </main>
  </div>
{/if}
