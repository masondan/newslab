<script lang="ts">
  import { fly } from 'svelte/transition'
  import { supabase } from '$lib/supabase'
  import { getTeamStream, getTeamInfo, getStory, getFallbackImageUrl } from '$lib/stories'
  import { storyReaderDrawerOpen, currentViewingStory, showNotification } from '$lib/stores'
  import type { Story } from '$lib/types'
  import StoryCard from '$components/StoryCard.svelte'
  import StoryReaderDrawer from '$components/StoryReaderDrawer.svelte'

  export let open = false
  export let courseId: string
  export let teamNameToView: string

  let stories: Story[] = []
  let loading = true

  let teamName = ''
  let teamLogoUrl: string | null = null
  let primaryColor = '5422b0'
  let secondaryColor = 'f0e6f7'
  let fallbackImageUrl: string | null = null

  $: if (open && teamNameToView) {
    loadTeamData()
  }

  async function loadTeamData() {
    loading = true
    
    const { data: teamInfo } = await getTeamInfo(courseId, teamNameToView)
    if (teamInfo) {
      teamName = teamInfo.team_name
      teamLogoUrl = teamInfo.logo_url
      primaryColor = teamInfo.primary_color
      secondaryColor = teamInfo.secondary_color
    }

    const { data, error } = await getTeamStream(courseId, teamNameToView)
    if (error) {
      showNotification('error', 'Failed to load stories')
    } else {
      stories = data
    }

    fallbackImageUrl = await getFallbackImageUrl(courseId)
    loading = false
  }

  function closeDrawer() {
    open = false
  }

  async function handleStoryClick(event: CustomEvent<{ id: string }>) {
    const { id } = event.detail
    const { data: story } = await getStory(id)
    
    if (story) {
      currentViewingStory.set({
        id: story.id,
        title: story.title,
        story
      })
      storyReaderDrawerOpen.set(true)
    }
  }

  $: hasStories = stories.length > 0
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 bg-white flex flex-col"
    transition:fly={{ y: '100%', duration: 300 }}
  >
    <!-- Team Header -->
    <header 
      class="py-6 text-center border-b-2 shrink-0"
      style="background-color: #{secondaryColor}; border-color: #{primaryColor};"
    >
      <div 
        class="w-16 h-16 mx-auto mb-3 rounded-lg overflow-hidden bg-white border-2"
        style="border-color: #{primaryColor};"
      >
        <img
          src={teamLogoUrl || '/icons/logo-teamstream-fallback.png'}
          alt="Team logo"
          class="w-full h-full object-cover"
        />
      </div>
      <h1 class="text-lg font-semibold" style="color: #{primaryColor};">
        {teamName || teamNameToView || 'Team NewsLab'}
      </h1>
    </header>

    <!-- Close button -->
    <button
      on:click={closeDrawer}
      class="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center z-10"
      aria-label="Close"
    >
      <img
        src="/icons/icon-close.svg"
        alt=""
        class="w-4 h-4"
        style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
      />
    </button>

    <!-- Content Area -->
    <main class="flex-1 px-4 overflow-y-auto">
      {#if loading}
        <div class="flex items-center justify-center h-full">
          <span class="text-[#777777]">Loading...</span>
        </div>
      {:else if !hasStories}
        <div class="flex items-center justify-center h-full">
          <div class="text-center">
            <p class="text-[#777777] text-base">Nothing to show yet.</p>
            <p class="text-[#999999] text-sm mt-2">
              Published stories from this team<br />
              will appear here.
            </p>
          </div>
        </div>
      {:else}
        <div class="divide-y divide-[#efefef]">
          {#each stories as story (story.id)}
            <StoryCard
              {story}
              menuType="stream"
              showMenu={false}
              isEditor={false}
              showPin={false}
              {fallbackImageUrl}
              on:click={handleStoryClick}
            />
          {/each}
        </div>
      {/if}
    </main>
  </div>

  <!-- Story Reader Drawer (nested) -->
  <StoryReaderDrawer
    {teamName}
    {teamLogoUrl}
    {primaryColor}
    {secondaryColor}
  />
{/if}
