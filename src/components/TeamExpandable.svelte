<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { slide } from 'svelte/transition'
  import { supabase } from '$lib/supabase'
  import { showNotification } from '$lib/stores'
  import type { Team, Journalist } from '$lib/types'
  import TeamMemberItem from '$components/TeamMemberItem.svelte'
  import ColorPalette from '$components/ColorPalette.svelte'
  import TeamLogoUpload from '$components/TeamLogoUpload.svelte'
  import ShareToggle from '$components/ShareToggle.svelte'
  import TeamLockToggle from '$components/TeamLockToggle.svelte'

  export let team: Team
  export let courseId: string
  export let expanded = false

  const dispatch = createEventDispatcher<{
    preview: { teamName: string }
    updated: void
  }>()

  let members: Journalist[] = []
  let loadingMembers = false

  // Inline leave/remove confirmation state
  let leavingMemberName: string | null = null
  let isLeaving = false

  // Inline editor toggle confirmation state
  let editorToggleMember: { name: string; willBeEditor: boolean } | null = null
  let isTogglingEditor = false

  $: primaryColor = team.primary_color || '5422b0'
  $: secondaryColor = team.secondary_color || 'f0e6f7'

  $: if (expanded && members.length === 0) {
    loadMembers()
  }

  async function loadMembers() {
    loadingMembers = true
    const { data } = await supabase
      .from('journalists')
      .select('*')
      .eq('course_id', courseId)
      .eq('team_name', team.team_name)
      .order('created_at', { ascending: true })

    if (data) {
      members = data
    }
    loadingMembers = false
  }

  function toggleExpand() {
    expanded = !expanded
  }

  function handlePreview() {
    dispatch('preview', { teamName: team.team_name })
  }

  // Remove member flow (for non-self removal)
  function handleRemoveMember(event: CustomEvent<{ name: string }>) {
    leavingMemberName = event.detail.name
  }

  // Start leave flow (when clicking X on a member)
  function handleStartLeave(event: CustomEvent<{ name: string }>) {
    leavingMemberName = event.detail.name
  }

  function handleCancelLeave() {
    leavingMemberName = null
  }

  async function handleConfirmLeave(event: CustomEvent<{ name: string }>) {
    if (isLeaving) return
    
    isLeaving = true
    const memberName = event.detail.name

    try {
      const { error } = await supabase
        .from('journalists')
        .update({ 
          team_name: null, 
          is_editor: false,
          updated_at: new Date().toISOString()
        })
        .eq('course_id', courseId)
        .eq('name', memberName)

      if (error) throw error

      if (members.length === 1) {
        await supabase
          .from('teams')
          .delete()
          .eq('course_id', courseId)
          .eq('team_name', team.team_name)
        dispatch('updated')
      } else {
        showNotification('success', `Removed ${memberName}`)
        await loadMembers()
      }
      leavingMemberName = null
    } catch (error) {
      console.error('Remove member error:', error)
      showNotification('error', 'Failed to remove. Try again.')
    } finally {
      isLeaving = false
    }
  }

  // Editor toggle flow
  function handleStartEditorToggle(event: CustomEvent<{ name: string; willBeEditor: boolean }>) {
    const { name, willBeEditor } = event.detail
    
    if (!willBeEditor) {
      const editorCount = members.filter(m => m.is_editor).length
      if (editorCount === 1) {
        showNotification('error', 'Teams must have at least one editor. Add another then try again.')
        return
      }
    }
    
    editorToggleMember = event.detail
  }

  function handleCancelEditorToggle() {
    editorToggleMember = null
  }

  async function handleConfirmEditorToggle(event: CustomEvent<{ name: string; willBeEditor: boolean }>) {
    if (isTogglingEditor) return
    
    const { name, willBeEditor } = event.detail

    if (!willBeEditor) {
      const editorCount = members.filter(m => m.is_editor).length
      if (editorCount === 1) {
        showNotification('error', 'Teams must have at least one editor. Add another then try again.')
        editorToggleMember = null
        return
      }
    }

    isTogglingEditor = true

    try {
      const { error } = await supabase
        .from('journalists')
        .update({ is_editor: willBeEditor, updated_at: new Date().toISOString() })
        .eq('course_id', courseId)
        .eq('name', name)

      if (error) throw error

      await loadMembers()
      showNotification('success', willBeEditor ? 'Editor added.' : 'Editor removed.')
      editorToggleMember = null
    } catch (error) {
      console.error('Editor toggle error:', error)
      showNotification('error', 'Failed to update. Try again.')
    } finally {
      isTogglingEditor = false
    }
  }

  async function handleColorSelect(event: CustomEvent<{ primary: string; secondary: string }>) {
    const { primary, secondary } = event.detail

    try {
      const { error } = await supabase
        .from('teams')
        .update({ 
          primary_color: primary, 
          secondary_color: secondary,
          updated_at: new Date().toISOString()
        })
        .eq('course_id', courseId)
        .eq('team_name', team.team_name)

      if (error) throw error

      team = { ...team, primary_color: primary, secondary_color: secondary }
    } catch (error) {
      console.error('Color update error:', error)
      showNotification('error', 'Failed to update color')
    }
  }

  async function handleLogoUpload(event: CustomEvent<{ url: string }>) {
    try {
      const { error } = await supabase
        .from('teams')
        .update({ logo_url: event.detail.url, updated_at: new Date().toISOString() })
        .eq('course_id', courseId)
        .eq('team_name', team.team_name)

      if (error) throw error

      team = { ...team, logo_url: event.detail.url }
      showNotification('success', 'Logo uploaded')
    } catch (error) {
      console.error('Logo upload error:', error)
      showNotification('error', 'Failed to save logo')
    }
  }

  async function handleLogoRemove() {
    try {
      const { error } = await supabase
        .from('teams')
        .update({ logo_url: null, updated_at: new Date().toISOString() })
        .eq('course_id', courseId)
        .eq('team_name', team.team_name)

      if (error) throw error

      team = { ...team, logo_url: null }
      showNotification('success', 'Logo removed')
    } catch (error) {
      console.error('Logo remove error:', error)
      showNotification('error', 'Failed to remove logo')
    }
  }

  async function handleShareToggle(event: CustomEvent<{ enabled: boolean }>) {
    try {
      const { error } = await supabase
        .from('teams')
        .update({ share_enabled: event.detail.enabled, updated_at: new Date().toISOString() })
        .eq('course_id', courseId)
        .eq('team_name', team.team_name)

      if (error) throw error

      team = { ...team, share_enabled: event.detail.enabled }
    } catch (error) {
      console.error('Share toggle error:', error)
      showNotification('error', 'Failed to update sharing')
    }
  }

  async function handleTeamLockToggle(event: CustomEvent<{ locked: boolean }>) {
    try {
      const { error } = await supabase
        .from('teams')
        .update({ team_lock: event.detail.locked, updated_at: new Date().toISOString() })
        .eq('course_id', courseId)
        .eq('team_name', team.team_name)

      if (error) throw error

      team = { ...team, team_lock: event.detail.locked }
      showNotification('success', event.detail.locked ? 'Team locked' : 'Team unlocked')
    } catch (error) {
      console.error('Team lock toggle error:', error)
      showNotification('error', 'Failed to update team lock')
    }
  }
</script>

<div class="mb-2">
  <!-- Team bar -->
  <div class="flex items-center gap-2">
    <button
      type="button"
      on:click={toggleExpand}
      class="flex-1 flex items-center justify-between bg-[#efefef] rounded-lg px-4 py-3"
    >
      <span class="text-base font-medium text-[#333]">{team.team_name}</span>
      <img
        src={expanded ? '/icons/icon-collapse.svg' : '/icons/icon-expand.svg'}
        alt=""
        class="w-5 h-5"
        style="filter: invert(18%) sepia(89%) saturate(2264%) hue-rotate(254deg) brightness(87%) contrast(97%);"
      />
    </button>
    
    <button
      type="button"
      on:click={handlePreview}
      class="w-10 h-10 flex items-center justify-center"
      aria-label="Preview team stream"
    >
      <img
        src="/icons/icon-preview.svg"
        alt=""
        class="w-5 h-5"
        style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
      />
    </button>
  </div>

  <!-- Expanded content -->
  {#if expanded}
    <div 
      class="mt-3 px-2 space-y-6"
      transition:slide={{ duration: 200 }}
    >
      <!-- Team members Section -->
      <div>
        <div class="flex items-center justify-between">
          <span class="text-sm text-[#777777]">Team members</span>
          <span class="text-sm text-[#777777]">Editor</span>
        </div>
        <div class="w-full border-b border-[#e0e0e0] mt-2"></div>

        {#if loadingMembers}
          <p class="text-[#999999] text-sm py-3">Loading...</p>
        {:else if members.length > 0}
          <div>
            {#each members as member (member.id)}
              <TeamMemberItem
                name={member.name}
                isEditor={member.is_editor}
                isCurrentUser={false}
                canRemove={true}
                canToggleEditor={true}
                {primaryColor}
                {secondaryColor}
                isConfirmingLeave={leavingMemberName === member.name}
                {isLeaving}
                isConfirmingEditorToggle={editorToggleMember?.name === member.name}
                {isTogglingEditor}
                on:remove={handleRemoveMember}
                on:startLeave={handleStartLeave}
                on:confirmLeave={handleConfirmLeave}
                on:cancelLeave={handleCancelLeave}
                on:startEditorToggle={handleStartEditorToggle}
                on:confirmEditorToggle={handleConfirmEditorToggle}
                on:cancelEditorToggle={handleCancelEditorToggle}
              />
            {/each}
          </div>

          <!-- Explanation text below members list -->
          <p class="text-xs text-[#999999] mt-3">
            Teams must have at least one editor. To remove a member, tap X. When removed, all published stories will revert to drafts.
          </p>
        {:else}
          <p class="text-center text-[#999999] text-sm py-6">No members</p>
        {/if}
      </div>

      <!-- Color Palette -->
      <ColorPalette
        selectedColor={team.primary_color || '5422b0'}
        disabled={false}
        on:select={handleColorSelect}
      />

      <!-- Logo Upload -->
      <TeamLogoUpload
        logoUrl={team.logo_url}
        disabled={false}
        {primaryColor}
        on:upload={handleLogoUpload}
        on:remove={handleLogoRemove}
      />

      <!-- Share Toggle -->
      <ShareToggle
        enabled={team.share_enabled}
        teamName={team.team_name}
        disabled={false}
        {primaryColor}
        on:toggle={handleShareToggle}
      />

      <!-- Team Lock Toggle -->
      <TeamLockToggle
        locked={team.team_lock || false}
        disabled={false}
        {primaryColor}
        on:toggle={handleTeamLockToggle}
      />
    </div>
  {/if}
</div>
