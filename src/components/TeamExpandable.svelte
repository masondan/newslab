<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { slide } from 'svelte/transition'
  import { supabase } from '$lib/supabase'
  import { showNotification, COLOR_PALETTES } from '$lib/stores'
  import type { Team, Journalist } from '$lib/types'
  import TeamMemberItem from '$components/TeamMemberItem.svelte'
  import TeamLogoUpload from '$components/TeamLogoUpload.svelte'
  import ShareToggle from '$components/ShareToggle.svelte'

  export let team: Team
  export let courseId: string
  export let expanded = false

  const dispatch = createEventDispatcher<{
    preview: { teamName: string }
    updated: void
  }>()

  let members: Journalist[] = []
  let loadingMembers = false
  let selectedMemberForRemoval: string | null = null

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

  function selectMemberForRemoval(name: string) {
    selectedMemberForRemoval = selectedMemberForRemoval === name ? null : name
  }

  async function confirmRemoveMember() {
    if (!selectedMemberForRemoval) return

    const memberToRemove = selectedMemberForRemoval

    try {
      const { error } = await supabase
        .from('journalists')
        .update({ 
          team_name: null, 
          is_editor: false,
          updated_at: new Date().toISOString()
        })
        .eq('course_id', courseId)
        .eq('name', memberToRemove)

      if (error) throw error

      if (members.length === 1) {
        await supabase
          .from('teams')
          .delete()
          .eq('course_id', courseId)
          .eq('team_name', team.team_name)
        dispatch('updated')
      } else {
        showNotification('success', `Removed ${memberToRemove}`)
        await loadMembers()
      }
    } catch (error) {
      console.error('Remove member error:', error)
      showNotification('error', 'Failed to remove. Try again.')
    } finally {
      selectedMemberForRemoval = null
    }
  }

  function cancelRemoveMember() {
    selectedMemberForRemoval = null
  }

  async function handleToggleEditor(event: CustomEvent<{ name: string; isEditor: boolean }>) {
    const { name, isEditor } = event.detail

    if (!isEditor) {
      const editorCount = members.filter(m => m.is_editor).length
      if (editorCount === 1) {
        showNotification('error', 'Teams must have at least one editor. Add another then try again.')
        return
      }
    }

    try {
      const { error } = await supabase
        .from('journalists')
        .update({ is_editor: isEditor, updated_at: new Date().toISOString() })
        .eq('course_id', courseId)
        .eq('name', name)

      if (error) throw error
      await loadMembers()
    } catch (error) {
      console.error('Toggle editor error:', error)
      showNotification('error', 'Failed to update. Try again.')
    }
  }

  async function handleColorSelect(primary: string, secondary: string) {
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
      class="mt-3 px-2 space-y-4"
      transition:slide={{ duration: 200 }}
    >
      <!-- Team Members -->
      <div>
        <div class="flex items-center justify-between mb-3 pb-1 border-b border-[#efefef]">
          <span class="text-sm text-[#777777]">Team Members</span>
          <span class="text-sm text-[#777777]">Editor</span>
        </div>

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
                isSelected={selectedMemberForRemoval === member.name}
                primaryColor={team.primary_color}
                on:remove={() => selectMemberForRemoval(member.name)}
                on:toggleEditor={handleToggleEditor}
              />
            {/each}
          </div>

          {#if selectedMemberForRemoval}
            <div 
              class="flex items-center justify-center gap-3 mt-3 py-2 px-4 rounded-full text-white"
              style="background-color: #{team.primary_color};"
            >
              <button
                type="button"
                on:click={cancelRemoveMember}
                class="w-6 h-6 rounded-full border border-white flex items-center justify-center"
                aria-label="Cancel"
              >
                <img
                  src="/icons/icon-close.svg"
                  alt=""
                  class="w-3 h-3"
                  style="filter: invert(100%);"
                />
              </button>
              <span class="text-sm font-medium">Remove from team?</span>
              <button
                type="button"
                on:click={confirmRemoveMember}
                class="w-6 h-6 rounded-full border border-white flex items-center justify-center"
                aria-label="Confirm"
              >
                <img
                  src="/icons/icon-check.svg"
                  alt=""
                  class="w-3 h-3"
                  style="filter: invert(100%);"
                />
              </button>
            </div>
          {/if}
        {:else}
          <p class="text-[#999999] text-sm py-3">No members</p>
        {/if}
      </div>

      <!-- Color Palette -->
      <div class="pb-4">
        <div class="flex items-baseline justify-between pb-2 mb-3 border-b border-[#ddd]">
          <span class="text-sm text-[#777777]">Pick a team theme<span class="text-[#777777]">*</span></span>
          <span class="text-xs text-[#777777]">*Editors only</span>
        </div>
        
        <div class="flex gap-3">
          {#each COLOR_PALETTES as palette}
            <button
              type="button"
              on:click={() => handleColorSelect(palette.primary, palette.secondary)}
              class="relative w-8 h-8 rounded-full transition-transform"
              style="background-color: #{palette.primary};"
              aria-label={palette.name}
              title={palette.name}
            >
              {#if team.primary_color === palette.primary}
                <span 
                  class="absolute inset-[-4px] rounded-full border-2"
                  style="border-color: #{palette.primary};"
                ></span>
              {/if}
            </button>
          {/each}
        </div>
      </div>

      <!-- Logo Upload -->
      <TeamLogoUpload
        logoUrl={team.logo_url}
        disabled={false}
        primaryColor={team.primary_color}
        on:upload={handleLogoUpload}
        on:remove={handleLogoRemove}
      />

      <!-- Share Toggle -->
      <ShareToggle
        enabled={team.share_enabled}
        teamName={team.team_name}
        disabled={false}
        primaryColor={team.primary_color}
        on:toggle={handleShareToggle}
      />
    </div>
  {/if}
</div>
