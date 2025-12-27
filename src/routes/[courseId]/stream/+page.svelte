<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { fly } from 'svelte/transition'
  import { session, showNotification, teamColors, storyReaderDrawerOpen, currentViewingStory } from '$lib/stores'
  import { supabase } from '$lib/supabase'
  import { getTeamStream, getTeamInfo, deleteStory, unpublishStory, pinStory, unpinStory, getStory, getFallbackImageUrl } from '$lib/stories'
  import { logActivity } from '$lib/activity'
  import { exportToPdf, exportToTxt } from '$lib/export'
  import type { Story } from '$lib/types'
  import StoryCard from '$components/StoryCard.svelte'
  import StoryReaderDrawer from '$components/StoryReaderDrawer.svelte'

  let stories: Story[] = []
  let loading = true
  let currentUserIsEditor = false

  // Team info
  let teamName = ''
  let teamLogoUrl: string | null = null
  let primaryColor = '5422b0'
  let secondaryColor = 'f0e6f7'
  let fallbackImageUrl: string | null = null

  // Realtime subscription
  let storiesSubscription: ReturnType<typeof supabase.channel> | null = null

  $: courseId = $session?.courseId || ''
  $: sessionTeamName = $session?.teamName || null
  $: userRole = $session?.role || 'journalist'
  $: canEdit = currentUserIsEditor || userRole === 'trainer' || userRole === 'guest_editor'

  onMount(async () => {
    if (sessionTeamName) {
      await loadTeamInfo()
      await loadStories()
      await checkEditorStatus()
    }
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
    if (!courseId || !sessionTeamName) return

    storiesSubscription = supabase
      .channel('stream-stories-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stories',
          filter: `course_id=eq.${courseId}`
        },
        (payload) => {
          const newData = payload.new as Record<string, unknown>
          if (newData?.team_name === sessionTeamName && newData?.status === 'published') {
            loadStories()
          } else if (payload.eventType === 'DELETE' || payload.eventType === 'UPDATE') {
            loadStories()
          }
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

  async function loadStories() {
    if (!courseId || !sessionTeamName) {
      loading = false
      return
    }

    const { data, error } = await getTeamStream(courseId, sessionTeamName)
    if (error) {
      showNotification('error', 'Failed to load stories')
    } else {
      stories = data
    }
    loading = false
  }

  async function checkEditorStatus() {
    if (!courseId || !$session?.name) return

    const { data } = await supabase
      .from('journalists')
      .select('is_editor')
      .eq('course_id', courseId)
      .eq('name', $session.name)
      .single()

    currentUserIsEditor = data?.is_editor || false
  }

  async function handleDelete(event: CustomEvent<{ id: string }>) {
    const { id } = event.detail
    const story = stories.find(s => s.id === id)
    
    const { error } = await deleteStory(id)
    
    if (error) {
      showNotification('error', 'Failed to delete story')
    } else {
      await logActivity(courseId, sessionTeamName, 'deleted', $session?.name || null, id, story?.title)
      showNotification('success', 'Story deleted')
      await loadStories()
    }
  }

  async function handleUnpublish(event: CustomEvent<{ id: string }>) {
    const { id } = event.detail
    const story = stories.find(s => s.id === id)
    
    const { error } = await unpublishStory(id)
    
    if (error) {
      showNotification('error', 'Failed to unpublish')
    } else {
      await logActivity(courseId, sessionTeamName, 'unpublished', $session?.name || null, id, story?.title)
      showNotification('success', 'Moved to drafts')
      await loadStories()
    }
  }

  async function handlePin(event: CustomEvent<{ id: string }>) {
    const { id } = event.detail
    const story = stories.find(s => s.id === id)
    
    const { error } = await pinStory(id, courseId, sessionTeamName || '')
    
    if (error) {
      showNotification('error', 'Failed to pin story')
    } else {
      await logActivity(courseId, sessionTeamName, 'pinned', $session?.name || null, id, story?.title)
      showNotification('success', 'Story pinned')
      await loadStories()
    }
  }

  async function handleUnpin(event: CustomEvent<{ id: string }>) {
    const { id } = event.detail
    const story = stories.find(s => s.id === id)
    
    const { error } = await unpinStory(id)
    
    if (error) {
      showNotification('error', 'Failed to unpin story')
    } else {
      await logActivity(courseId, sessionTeamName, 'unpinned', $session?.name || null, id, story?.title)
      showNotification('success', 'Story unpinned')
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

  async function handleEdit(event: CustomEvent<{ id: string }>) {
    const { id } = event.detail
    const { data: story } = await getStory(id)
    
    if (story) {
      // Import the stores needed for editing
      const { editingStory, writeDrawerOpen } = await import('$lib/stores')
      
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

<svelte:head>
  <title>NewsLab - Team Stream</title>
</svelte:head>

<div class="min-h-screen bg-white flex flex-col pb-[70px]">
  <!-- Team Header -->
  <header 
    class="py-6 text-center border-b-2 mb-6"
    style="background-color: #{secondaryColor}; border-color: #{primaryColor};"
  >
    <div class="w-16 h-16 mx-auto mb-3 rounded-lg overflow-hidden bg-white border-2" style="border-color: #{primaryColor};">
      <img
        src={teamLogoUrl || '/icons/logo-teamstream-fallback.png'}
        alt="Team logo"
        class="w-full h-full object-cover"
      />
    </div>
    <h1 class="text-lg font-semibold" style="color: #{primaryColor};">
      {teamName || sessionTeamName || 'Team NewsLab'}
    </h1>
  </header>

  <!-- Content Area -->
  <main class="flex-1 px-4 overflow-y-auto">
    {#if !sessionTeamName}
      <div class="flex items-center justify-center h-full">
        <div class="text-center">
          <p class="text-[#777777] text-base">No team yet.</p>
          <p class="text-[#999999] text-sm mt-2">
            Join or create a team in Settings<br />
            to see your Team Stream.
          </p>
        </div>
      </div>
    {:else if loading}
      <div class="flex items-center justify-center h-full">
        <span class="text-[#777777]">Loading...</span>
      </div>
    {:else if !hasStories}
      <div class="flex items-center justify-center h-full">
        <div class="text-center">
          <p class="text-[#777777] text-base">Nothing to show yet.</p>
          <p class="text-[#999999] text-sm mt-2">
            Published stories from your team<br />
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
            showMenu={canEdit}
            isEditor={canEdit}
            showPin={true}
            {fallbackImageUrl}
            on:edit={handleEdit}
            on:delete={handleDelete}
            on:unpublish={handleUnpublish}
            on:export={handleExport}
            on:pin={handlePin}
            on:unpin={handleUnpin}
            on:click={handleStoryClick}
          />
        {/each}
      </div>
    {/if}
  </main>
</div>

<!-- Story Reader Drawer -->
<StoryReaderDrawer
  {teamName}
  {teamLogoUrl}
  {primaryColor}
  {secondaryColor}
/>
