<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { session, editingStory, writeDrawerOpen, teamColors, showNotification, storyReaderDrawerOpen, currentViewingStory } from '$lib/stores'
  import { getDrafts, getPublished, deleteStory, deleteStories, unpublishStory, getStory, getTeamInfo, getFallbackImageUrl } from '$lib/stories'
  import { logActivity } from '$lib/activity'
  import { exportToTxt, exportToPdf } from '$lib/export'
  import { supabase } from '$lib/supabase'
  import type { Story } from '$lib/types'
  import StoryCard from '$components/StoryCard.svelte'
  import StoryReaderDrawer from '$components/StoryReaderDrawer.svelte'

  let activeTab: 'drafts' | 'published' = 'drafts'
  let drafts: Story[] = []
  let published: Story[] = []
  let loading = true

  let selectMode = false
  let selectedIds: Set<string> = new Set()
  let showDeleteConfirm = false

  // Team info for story reader
  let teamName = ''
  let teamLogoUrl: string | null = null
  let primaryColor = '5422b0'
  let secondaryColor = 'f0e6f7'
  let fallbackImageUrl: string | null = null

  // Realtime subscription
  let storiesSubscription: ReturnType<typeof supabase.channel> | null = null

  $: courseId = $session?.courseId || ''
  $: sessionTeamName = $session?.teamName || null

  onMount(async () => {
    await loadStories()
    await loadTeamInfo()
    // Load fallback image
    if (courseId) {
      fallbackImageUrl = await getFallbackImageUrl(courseId)
    }
    setupRealtimeSubscription()
  })

  onDestroy(() => {
    if (storiesSubscription) {
      supabase.removeChannel(storiesSubscription)
    }
  })

  function setupRealtimeSubscription() {
    if (!courseId) return

    storiesSubscription = supabase
      .channel('home-stories-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stories',
          filter: `course_id=eq.${courseId}`
        },
        () => {
          loadStories()
        }
      )
      .subscribe()
  }

  async function loadTeamInfo() {
    if (!courseId || !sessionTeamName) return

    const { data } = await getTeamInfo(courseId, sessionTeamName)
    if (data) {
      teamName = data.team_name
      teamLogoUrl = data.logo_url
      primaryColor = data.primary_color
      secondaryColor = data.secondary_color
      teamColors.set({ primary: primaryColor, secondary: secondaryColor })
    }
  }

  // Auto-refresh when drawer closes
  $: if (!$writeDrawerOpen) {
    loadStories()
  }

  async function loadStories() {
    if (!$session) return
    loading = true

    const [draftsResult, publishedResult] = await Promise.all([
      getDrafts($session.courseId, $session.name),
      getPublished($session.courseId, $session.name)
    ])

    drafts = draftsResult.data
    published = publishedResult.data
    loading = false
  }

  function toggleSelectMode() {
    selectMode = !selectMode
    if (!selectMode) {
      selectedIds = new Set()
      showDeleteConfirm = false
    }
  }

  function handleSelect(event: CustomEvent<{ id: string; selected: boolean }>) {
    const { id, selected } = event.detail
    if (selected) {
      selectedIds.add(id)
    } else {
      selectedIds.delete(id)
    }
    selectedIds = selectedIds
  }

  function selectAll() {
    const stories = activeTab === 'drafts' ? drafts : published
    if (selectedIds.size === stories.length) {
      selectedIds = new Set()
    } else {
      selectedIds = new Set(stories.map(s => s.id))
    }
  }

  async function handleBulkDelete() {
    if (!showDeleteConfirm) {
      showDeleteConfirm = true
      return
    }

    const ids = Array.from(selectedIds)
    const { error } = await deleteStories(ids)
    
    if (error) {
      showNotification('error', 'Failed to delete stories')
    } else {
      // Log deletions
      for (const id of ids) {
        const story = currentStories.find(s => s.id === id)
        if ($session && story) {
          await logActivity(courseId, sessionTeamName, 'deleted', $session.name, id, story.title)
        }
      }
      showNotification('success', `Deleted ${ids.length} ${ids.length === 1 ? 'story' : 'stories'}`)
      await loadStories()
    }

    selectedIds = new Set()
    selectMode = false
    showDeleteConfirm = false
  }

  async function handleEdit(event: CustomEvent<{ id: string }>) {
    const { id } = event.detail
    const { data: story } = await getStory(id)
    
    if (story) {
      editingStory.loadStory({
        id: story.id,
        title: story.title,
        summary: story.summary || '',
        featuredImageUrl: story.featured_image_url,
        featuredImageCaption: '',
        content: story.content?.blocks || [],
        teamName: story.team_name,
        status: story.status
      })
      writeDrawerOpen.set(true)
    }
  }

  async function handleDelete(event: CustomEvent<{ id: string }>) {
    const { id } = event.detail
    const story = currentStories.find(s => s.id === id)
    const { error } = await deleteStory(id)
    
    if (error) {
      showNotification('error', 'Failed to delete story')
    } else {
      if ($session && story) {
        await logActivity(courseId, sessionTeamName, 'deleted', $session.name, id, story.title)
      }
      showNotification('success', 'Story deleted')
      await loadStories()
    }
  }

  async function handleUnpublish(event: CustomEvent<{ id: string }>) {
    const { id } = event.detail
    const story = published.find(s => s.id === id)
    const { error } = await unpublishStory(id)
    
    if (error) {
      showNotification('error', 'Failed to unpublish')
    } else {
      if ($session && story) {
        await logActivity(courseId, sessionTeamName, 'unpublished', $session.name, id, story.title)
      }
      showNotification('success', 'Moved to drafts')
      await loadStories()
    }
  }

  async function handleExport(event: CustomEvent<{ id: string; format: 'pdf' | 'txt' }>) {
    const { id, format } = event.detail
    const { data: story } = await getStory(id)
    
    if (!story) {
      showNotification('error', 'Story not found')
      return
    }

    try {
      if (format === 'pdf') {
        await exportToPdf(story)
      } else {
        exportToTxt(story)
      }
      showNotification('success', `Exported as ${format.toUpperCase()}`)
    } catch {
      showNotification('error', 'Export failed')
    }
  }

  async function handleStoryClick(event: CustomEvent<{ id: string }>) {
    const { id } = event.detail
    
    // For drafts, go to edit mode
    if (activeTab === 'drafts') {
      handleEdit(event)
      return
    }
    
    // For published, show the story reader
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

  $: currentStories = activeTab === 'drafts' ? drafts : published
  $: hasStories = currentStories.length > 0
  $: allSelected = hasStories && selectedIds.size === currentStories.length
</script>

<svelte:head>
  <title>NewsLab - Home</title>
</svelte:head>

<div class="min-h-screen bg-white flex flex-col pb-[70px]">
  <!-- Header with Tabs -->
  <div class="px-4 pt-4 pb-6">
    <div class="flex items-center justify-between">
      <div class="flex gap-6">
        <button
          on:click={() => { activeTab = 'drafts'; selectMode = false; selectedIds = new Set() }}
          class="pb-2 text-base font-medium transition-colors relative"
          class:text-[#5422b0]={activeTab === 'drafts'}
          class:text-[#777777]={activeTab !== 'drafts'}
          style={activeTab === 'drafts' ? `color: #${$teamColors.primary}` : ''}
        >
          Drafts
          {#if activeTab === 'drafts'}
            <span 
              class="absolute bottom-0 left-0 right-0 h-[2px]"
              style="background-color: #{$teamColors.primary};"
            ></span>
          {/if}
        </button>
        <button
          on:click={() => { activeTab = 'published'; selectMode = false; selectedIds = new Set() }}
          class="pb-2 text-base font-medium transition-colors relative"
          class:text-[#5422b0]={activeTab === 'published'}
          class:text-[#777777]={activeTab !== 'published'}
          style={activeTab === 'published' ? `color: #${$teamColors.primary}` : ''}
        >
          Published
          {#if activeTab === 'published'}
            <span 
              class="absolute bottom-0 left-0 right-0 h-[2px]"
              style="background-color: #{$teamColors.primary};"
            ></span>
          {/if}
        </button>
      </div>

      <!-- Select All & Delete Controls -->
      {#if hasStories}
        <div class="flex items-center gap-2">
          {#if selectMode && selectedIds.size > 0}
            <button
              on:click={handleBulkDelete}
              class="flex items-center gap-1 px-3 py-1 rounded-full text-sm text-white"
              style="background-color: #{$teamColors.primary};"
            >
              {#if showDeleteConfirm}
                <span>Delete?</span>
              {/if}
              <img src="/icons/icon-trash.svg" alt="" class="w-4 h-4 invert" />
            </button>
          {/if}
          <button
            on:click={toggleSelectMode}
            class="p-1 ml-4"
            aria-label={selectMode ? 'Exit select mode' : 'Enter select mode'}
          >
            <img
              src={selectMode && allSelected ? '/icons/icon-select-all-fill.svg' : '/icons/icon-select-all.svg'}
              alt=""
              class="w-5 h-5"
              style={selectMode ? `filter: invert(14%) sepia(95%) saturate(3500%) hue-rotate(256deg) brightness(75%) contrast(90%);` : 'filter: invert(47%) sepia(0%) saturate(0%) brightness(55%);'}
            />
          </button>
        </div>
      {/if}
    </div>
  </div>

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
          {#if activeTab === 'drafts'}
            <p class="text-[#999999] text-sm mt-2">
              {#if !$session?.teamName}
                First, create or join a team in Settings.<br />
              {/if}
              Then dive in - your drafts appear here.
            </p>
          {:else}
            <p class="text-[#999999] text-sm mt-2">
              Published stories appear here<br />
              and in your Team Stream.
            </p>
          {/if}
        </div>
      </div>
    {:else}
      <div class="divide-y divide-[#efefef]">
        {#each currentStories as story (story.id)}
          <StoryCard
            {story}
            menuType={activeTab === 'drafts' ? 'draft' : 'published'}
            showMenu={!selectMode}
            {selectMode}
            selected={selectedIds.has(story.id)}
            showPin={activeTab === 'published'}
            {fallbackImageUrl}
            on:edit={handleEdit}
            on:delete={handleDelete}
            on:unpublish={handleUnpublish}
            on:export={handleExport}
            on:select={handleSelect}
            on:click={handleStoryClick}
          />
        {/each}
      </div>
    {/if}
  </main>
</div>

<!-- Story Reader Drawer for Published tab -->
<StoryReaderDrawer
  {teamName}
  {teamLogoUrl}
  {primaryColor}
  {secondaryColor}
/>
