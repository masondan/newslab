<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { session, showNotification, teamColors, isTrainer, isGuestEditor } from '$lib/stores'
  import { supabase } from '$lib/supabase'
  import type { Team, Journalist } from '$lib/types'
  import ColorPalette from '$components/ColorPalette.svelte'
  import TeamMemberItem from '$components/TeamMemberItem.svelte'
  import TeamLogoUpload from '$components/TeamLogoUpload.svelte'
  import ShareToggle from '$components/ShareToggle.svelte'
  import TeamsTab from '$components/TeamsTab.svelte'
  import AdminTab from '$components/AdminTab.svelte'

  type TabType = 'settings' | 'teams' | 'admin'
  let activeTab: TabType = 'settings'

  // Byline state
  let bylineName = ''
  let originalBylineName = ''
  let bylineEditing = false
  let bylineValidating = false
  let bylineValid = true
  let bylineError = ''
  let bylineSaving = false

  // Team state
  let teamNameInput = ''
  let teamEditing = false
  let teamValidating = false
  let teamValid: boolean | null = null
  let teamError = ''
  let teamSaving = false
  let teamExists = false

  // Team data
  let team: Team | null = null
  let teamMembers: Journalist[] = []
  let currentUserIsEditor = false

  // Remove member state
  let selectedMemberForRemoval: string | null = null

  // Realtime subscription
  let journalistsSubscription: ReturnType<typeof supabase.channel> | null = null

  $: courseId = $session?.courseId || ''
  $: currentUserName = $session?.name || ''
  $: currentTeamName = $session?.teamName || null
  $: primaryColor = team?.primary_color || '5422b0'
  $: showTeamsTab = $isTrainer || $isGuestEditor
  $: showAdminTab = $isTrainer

  onMount(async () => {
    bylineName = $session?.name || ''
    originalBylineName = bylineName

    if ($session?.teamName) {
      teamNameInput = $session.teamName
      await loadTeamData()
    }

    setupRealtimeSubscription()
  })

  onDestroy(() => {
    if (journalistsSubscription) {
      supabase.removeChannel(journalistsSubscription)
    }
  })

  function setupRealtimeSubscription() {
    journalistsSubscription = supabase
      .channel('journalists-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'journalists',
          filter: `course_id=eq.${courseId}`
        },
        () => {
          if (currentTeamName) {
            loadTeamMembers()
          }
        }
      )
      .subscribe()
  }

  async function loadTeamData(teamNameOverride?: string) {
    const teamToLoad = teamNameOverride || currentTeamName
    if (!teamToLoad || !courseId) return

    const { data: teamData } = await supabase
      .from('teams')
      .select('*')
      .eq('course_id', courseId)
      .eq('team_name', teamToLoad)
      .single()

    if (teamData) {
      team = teamData
      teamColors.set({ primary: teamData.primary_color, secondary: teamData.secondary_color })
    }

    await loadTeamMembers(teamToLoad)
  }

  async function loadTeamMembers(teamNameOverride?: string) {
    const teamToLoad = teamNameOverride || currentTeamName
    if (!teamToLoad || !courseId) return

    const { data } = await supabase
      .from('journalists')
      .select('*')
      .eq('course_id', courseId)
      .eq('team_name', teamToLoad)
      .order('created_at', { ascending: true })

    if (data) {
      teamMembers = data
      const currentUser = data.find(j => j.name === currentUserName)
      currentUserIsEditor = currentUser?.is_editor || false
    }
  }

  // Byline validation with debounce
  let bylineDebounceTimer: ReturnType<typeof setTimeout>

  function handleBylineInput(event: Event) {
    const input = event.target as HTMLInputElement
    bylineName = input.value

    if (bylineName === originalBylineName) {
      bylineValid = true
      bylineError = ''
      return
    }

    clearTimeout(bylineDebounceTimer)
    bylineValidating = true
    bylineDebounceTimer = setTimeout(validateByline, 300)
  }

  async function validateByline() {
    if (!bylineName.trim() || bylineName === originalBylineName) {
      bylineValidating = false
      bylineValid = true
      bylineError = ''
      return
    }

    const { data } = await supabase
      .from('journalists')
      .select('id')
      .eq('course_id', courseId)
      .eq('name', bylineName.trim())

    bylineValidating = false
    if (data && data.length > 0) {
      bylineValid = false
      bylineError = 'Name taken. Try again'
    } else {
      bylineValid = true
      bylineError = ''
    }
  }

  function startBylineEdit() {
    bylineEditing = true
    bylineValid = true
    bylineError = ''
  }

  function cancelBylineEdit() {
    bylineName = originalBylineName
    bylineEditing = false
    bylineValid = true
    bylineError = ''
  }

  async function saveByline() {
    if (!bylineValid || bylineSaving || bylineName === originalBylineName) return

    bylineSaving = true
    const newName = bylineName.trim()
    const oldName = originalBylineName

    // Update journalist record
    const { error } = await supabase
      .from('journalists')
      .update({ name: newName, updated_at: new Date().toISOString() })
      .eq('course_id', courseId)
      .eq('name', oldName)

    if (error) {
      showNotification('error', 'Failed to save. Try again.')
      bylineSaving = false
      return
    }

    // Update author_name in all stories by this journalist
    const { error: storiesError } = await supabase
      .from('stories')
      .update({ author_name: newName, updated_at: new Date().toISOString() })
      .eq('course_id', courseId)
      .eq('author_name', oldName)

    if (storiesError) {
      console.error('Failed to update stories author_name:', storiesError)
    }

    session.set({
      ...$session!,
      name: newName
    })

    originalBylineName = newName
    bylineEditing = false
    bylineSaving = false
    showNotification('success', 'Saved')
  }

  // Team name validation with debounce
  let teamDebounceTimer: ReturnType<typeof setTimeout>

  function handleTeamInput(event: Event) {
    const input = event.target as HTMLInputElement
    teamNameInput = input.value

    if (!teamNameInput.trim()) {
      teamValid = null
      teamError = ''
      teamExists = false
      return
    }

    clearTimeout(teamDebounceTimer)
    teamValidating = true
    teamDebounceTimer = setTimeout(validateTeamName, 300)
  }

  async function validateTeamName() {
    if (!teamNameInput.trim()) {
      teamValidating = false
      teamValid = null
      teamError = ''
      teamExists = false
      return
    }

    const { data } = await supabase
      .from('teams')
      .select('id')
      .eq('course_id', courseId)
      .eq('team_name', teamNameInput.trim())

    teamValidating = false
    teamExists = !!(data && data.length > 0)

    if (teamExists) {
      teamValid = true
      teamError = ''
    } else {
      teamValid = true
      teamError = ''
    }
  }

  function startTeamEdit() {
    teamEditing = true
    teamValid = null
    teamError = ''
  }

  function cancelTeamEdit() {
    teamNameInput = currentTeamName || ''
    teamEditing = false
    teamValid = null
    teamError = ''
  }

  async function saveTeamName() {
    if (teamValid === false || teamSaving || !teamNameInput.trim()) return

    teamSaving = true
    const trimmedName = teamNameInput.trim()

    try {
      if (teamExists) {
        await joinExistingTeam(trimmedName)
      } else {
        await createNewTeam(trimmedName)
      }

      teamEditing = false
    } catch (error) {
      console.error('Team save error:', error)
      showNotification('error', 'Failed to save. Try again.')
    } finally {
      teamSaving = false
    }
  }

  async function createNewTeam(teamName: string) {
    const shareToken = crypto.randomUUID()

    const { error: teamError } = await supabase
      .from('teams')
      .insert({
        course_id: courseId,
        team_name: teamName,
        public_share_token: shareToken
      })

    if (teamError) throw teamError

    const { error: journalistError } = await supabase
      .from('journalists')
      .update({ 
        team_name: teamName, 
        is_editor: true,
        updated_at: new Date().toISOString()
      })
      .eq('course_id', courseId)
      .eq('name', currentUserName)

    if (journalistError) throw journalistError

    session.set({
      ...$session!,
      teamName: teamName
    })

    showNotification('success', `Created team "${teamName}"`)
    await loadTeamData(teamName)
  }

  async function joinExistingTeam(teamName: string) {
    const { error } = await supabase
      .from('journalists')
      .update({ 
        team_name: teamName,
        is_editor: false,
        updated_at: new Date().toISOString()
      })
      .eq('course_id', courseId)
      .eq('name', currentUserName)

    if (error) throw error

    session.set({
      ...$session!,
      teamName: teamName
    })

    showNotification('success', `Joined "${teamName}"`)
    await loadTeamData(teamName)
  }

  function selectMemberForRemoval(name: string) {
    selectedMemberForRemoval = selectedMemberForRemoval === name ? null : name
  }

  async function confirmRemoveMember() {
    if (!selectedMemberForRemoval) return

    const memberToRemove = selectedMemberForRemoval
    const isRemovingSelf = memberToRemove === currentUserName

    if (isRemovingSelf) {
      const editorCount = teamMembers.filter(m => m.is_editor).length
      const memberIsEditor = teamMembers.find(m => m.name === memberToRemove)?.is_editor

      if (memberIsEditor && editorCount === 1 && teamMembers.length > 1) {
        showNotification('error', 'Teams must have at least one editor. Add another then try again.')
        selectedMemberForRemoval = null
        return
      }
    }

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

      if (teamMembers.length === 1) {
        await supabase
          .from('teams')
          .delete()
          .eq('course_id', courseId)
          .eq('team_name', currentTeamName)
      }

      if (isRemovingSelf) {
        session.set({
          ...$session!,
          teamName: null
        })
        team = null
        teamMembers = []
        teamNameInput = ''
        currentUserIsEditor = false
        teamColors.set({ primary: '5422b0', secondary: 'f0e6f7' })
        showNotification('info', 'You left the team')
      } else {
        showNotification('success', `Removed ${memberToRemove}`)
        await loadTeamMembers()
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
      const editorCount = teamMembers.filter(m => m.is_editor).length
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

      await loadTeamMembers()
    } catch (error) {
      console.error('Toggle editor error:', error)
      showNotification('error', 'Failed to update. Try again.')
    }
  }

  async function handleColorSelect(event: CustomEvent<{ primary: string; secondary: string }>) {
    if (!team || !currentUserIsEditor) return

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
        .eq('team_name', currentTeamName)

      if (error) throw error

      team = { ...team, primary_color: primary, secondary_color: secondary }
      teamColors.set({ primary, secondary })
    } catch (error) {
      console.error('Color update error:', error)
      showNotification('error', 'Failed to update color')
    }
  }

  async function handleLogoUpload(event: CustomEvent<{ url: string }>) {
    if (!team || !currentUserIsEditor) return

    try {
      const { error } = await supabase
        .from('teams')
        .update({ logo_url: event.detail.url, updated_at: new Date().toISOString() })
        .eq('course_id', courseId)
        .eq('team_name', currentTeamName)

      if (error) throw error

      team = { ...team, logo_url: event.detail.url }
      showNotification('success', 'Logo uploaded')
    } catch (error) {
      console.error('Logo upload error:', error)
      showNotification('error', 'Failed to save logo')
    }
  }

  async function handleLogoRemove() {
    if (!team || !currentUserIsEditor) return

    try {
      const { error } = await supabase
        .from('teams')
        .update({ logo_url: null, updated_at: new Date().toISOString() })
        .eq('course_id', courseId)
        .eq('team_name', currentTeamName)

      if (error) throw error

      team = { ...team, logo_url: null }
      showNotification('success', 'Logo removed')
    } catch (error) {
      console.error('Logo remove error:', error)
      showNotification('error', 'Failed to remove logo')
    }
  }

  async function handleShareToggle(event: CustomEvent<{ enabled: boolean }>) {
    if (!team || !currentUserIsEditor) return

    try {
      const { error } = await supabase
        .from('teams')
        .update({ share_enabled: event.detail.enabled, updated_at: new Date().toISOString() })
        .eq('course_id', courseId)
        .eq('team_name', currentTeamName)

      if (error) throw error

      team = { ...team, share_enabled: event.detail.enabled }
    } catch (error) {
      console.error('Share toggle error:', error)
      showNotification('error', 'Failed to update sharing')
    }
  }
</script>

<svelte:head>
  <title>NewsLab - Settings</title>
</svelte:head>

<div class="min-h-screen bg-white flex flex-col pb-[60px]">
  <main class="flex-1 px-4 py-4">
    <!-- Tab Navigation -->
    <div class="flex items-center gap-6 mb-6">
      <button
        type="button"
        on:click={() => activeTab = 'settings'}
        class="text-xl font-semibold transition-colors pb-1 border-b-2"
        class:text-[#5422b0]={activeTab === 'settings'}
        class:border-[#5422b0]={activeTab === 'settings'}
        class:text-[#777777]={activeTab !== 'settings'}
        class:border-transparent={activeTab !== 'settings'}
      >
        Settings
      </button>
      
      {#if showTeamsTab}
        <button
          type="button"
          on:click={() => activeTab = 'teams'}
          class="text-xl font-semibold transition-colors pb-1 border-b-2"
          class:text-[#5422b0]={activeTab === 'teams'}
          class:border-[#5422b0]={activeTab === 'teams'}
          class:text-[#777777]={activeTab !== 'teams'}
          class:border-transparent={activeTab !== 'teams'}
        >
          Teams
        </button>
      {/if}
      
      {#if showAdminTab}
        <button
          type="button"
          on:click={() => activeTab = 'admin'}
          class="text-xl font-semibold transition-colors pb-1 border-b-2"
          class:text-[#5422b0]={activeTab === 'admin'}
          class:border-[#5422b0]={activeTab === 'admin'}
          class:text-[#777777]={activeTab !== 'admin'}
          class:border-transparent={activeTab !== 'admin'}
        >
          Admin
        </button>
      {/if}
    </div>

    <!-- Settings Tab Content -->
    {#if activeTab === 'settings'}
      <div class="space-y-6">
        <!-- Byline Section -->
        <div>
          <label for="byline-input" class="block text-sm text-[#777777] mb-2">Byline</label>
          <div class="flex items-center gap-2">
            <div class="flex-1 relative">
              <input
                id="byline-input"
                type="text"
                value={bylineName}
                on:input={handleBylineInput}
                on:focus={startBylineEdit}
                maxlength="30"
                class="w-full bg-[#efefef] rounded-lg px-4 py-3 text-base outline-none transition-all"
                class:ring-2={bylineEditing}
                class:ring-[#5422b0]={bylineEditing}
                style={bylineEditing ? `--tw-ring-color: #${primaryColor}` : ''}
              />
            </div>
            
            {#if bylineValidating}
              <div class="w-5 h-5 border-2 border-[#777777] border-t-transparent rounded-full animate-spin"></div>
            {:else if bylineEditing}
              {#if bylineValid && bylineName !== originalBylineName}
                <img
                  src="/icons/icon-check.svg"
                  alt="Available"
                  class="w-5 h-5"
                  style="filter: invert(18%) sepia(89%) saturate(2264%) hue-rotate(254deg) brightness(87%) contrast(97%);"
                />
              {:else if !bylineValid}
                <img
                  src="/icons/icon-close-circle-fill.svg"
                  alt="Not available"
                  class="w-5 h-5"
                  style="filter: invert(18%) sepia(89%) saturate(2264%) hue-rotate(254deg) brightness(87%) contrast(97%);"
                />
              {:else}
                <img
                  src="/icons/icon-circle.svg"
                  alt=""
                  class="w-5 h-5"
                  style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
                />
              {/if}
            {:else}
              <img
                src="/icons/icon-check.svg"
                alt="Verified"
                class="w-5 h-5"
                style="filter: invert(18%) sepia(89%) saturate(2264%) hue-rotate(254deg) brightness(87%) contrast(97%);"
              />
            {/if}
          </div>

          {#if bylineError}
            <p class="text-sm text-[#777777] mt-1">{bylineError}</p>
          {/if}

          <div class="flex items-center justify-between mt-1">
            <span class="text-xs text-[#999999]">{bylineName.length} / 30</span>
            
            {#if bylineEditing}
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  on:click={cancelBylineEdit}
                  class="p-1"
                  aria-label="Cancel"
                >
                  <img
                    src="/icons/icon-close-circle-fill.svg"
                    alt=""
                    class="w-6 h-6"
                    style="filter: invert(18%) sepia(89%) saturate(2264%) hue-rotate(254deg) brightness(87%) contrast(97%);"
                  />
                </button>
                <button
                  type="button"
                  on:click={saveByline}
                  disabled={!bylineValid || bylineName === originalBylineName || bylineSaving}
                  class="px-4 py-1 rounded-full text-white text-sm font-medium transition-opacity"
                  class:opacity-50={!bylineValid || bylineName === originalBylineName || bylineSaving}
                  style="background-color: #{primaryColor};"
                >
                  {bylineSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            {/if}
          </div>
        </div>

        <!-- Team Name Section -->
        <div>
          <label for="team-name-input" class="block text-sm text-[#777777] mb-2">Team Name</label>
          <div class="flex items-center gap-2">
            <div class="flex-1 relative">
              <input
                id="team-name-input"
                type="text"
                value={teamNameInput}
                on:input={handleTeamInput}
                on:focus={startTeamEdit}
                maxlength="30"
                placeholder={currentTeamName ? '' : 'Enter team name...'}
                disabled={!!currentTeamName && !currentUserIsEditor}
                class="w-full bg-[#efefef] rounded-lg px-4 py-3 text-base outline-none transition-all"
                class:ring-2={teamEditing}
                class:ring-[#5422b0]={teamEditing}
                class:text-[#777777]={!teamNameInput && !currentTeamName}
                class:cursor-not-allowed={!!currentTeamName && !currentUserIsEditor}
                style={teamEditing ? `--tw-ring-color: #${primaryColor}` : ''}
              />
            </div>

            {#if teamValidating}
              <div class="w-5 h-5 border-2 border-[#777777] border-t-transparent rounded-full animate-spin"></div>
            {:else if currentTeamName && !teamEditing}
              <img
                src="/icons/icon-check.svg"
                alt="In team"
                class="w-5 h-5"
                style="filter: invert(18%) sepia(89%) saturate(2264%) hue-rotate(254deg) brightness(87%) contrast(97%);"
              />
            {:else if teamEditing && teamValid}
              <img
                src="/icons/icon-check.svg"
                alt="Valid"
                class="w-5 h-5"
                style="filter: invert(18%) sepia(89%) saturate(2264%) hue-rotate(254deg) brightness(87%) contrast(97%);"
              />
            {:else if teamEditing && teamValid === false}
              <img
                src="/icons/icon-close-circle-fill.svg"
                alt="Invalid"
                class="w-5 h-5"
                style="filter: invert(18%) sepia(89%) saturate(2264%) hue-rotate(254deg) brightness(87%) contrast(97%);"
              />
            {:else}
              <img
                src="/icons/icon-circle.svg"
                alt=""
                class="w-5 h-5"
                style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
              />
            {/if}
          </div>

          {#if teamError}
            <p class="text-sm text-[#777777] mt-1">{teamError}</p>
          {/if}

          <div class="flex items-center justify-between mt-1">
            <span class="text-xs text-[#999999]">{teamNameInput.length} / 30</span>
            
            {#if teamEditing && !currentTeamName}
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  on:click={cancelTeamEdit}
                  class="p-1"
                  aria-label="Cancel"
                >
                  <img
                    src="/icons/icon-close-circle-fill.svg"
                    alt=""
                    class="w-6 h-6"
                    style="filter: invert(18%) sepia(89%) saturate(2264%) hue-rotate(254deg) brightness(87%) contrast(97%);"
                  />
                </button>
                <button
                  type="button"
                  on:click={saveTeamName}
                  disabled={teamValid !== true || !teamNameInput.trim() || teamSaving}
                  class="px-4 py-1 rounded-full text-white text-sm font-medium transition-opacity"
                  class:opacity-50={teamValid !== true || !teamNameInput.trim() || teamSaving}
                  style="background-color: #{primaryColor};"
                >
                  {teamSaving ? 'Saving...' : teamExists ? 'Join' : 'Save'}
                </button>
              </div>
            {/if}
          </div>
        </div>

        <!-- Team Members Section -->
        {#if currentTeamName}
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-[#777777]">Team members</span>
              <span class="text-sm text-[#777777]">Editor</span>
            </div>

            {#if teamMembers.length > 0}
              <div class="border-t border-[#efefef]">
                {#each teamMembers as member (member.id)}
                  <TeamMemberItem
                    name={member.name}
                    isEditor={member.is_editor}
                    isCurrentUser={member.name === currentUserName}
                    canRemove={currentUserIsEditor || member.name === currentUserName}
                    canToggleEditor={currentUserIsEditor}
                    isSelected={selectedMemberForRemoval === member.name}
                    {primaryColor}
                    on:remove={() => selectMemberForRemoval(member.name)}
                    on:toggleEditor={handleToggleEditor}
                  />
                {/each}
              </div>

              <!-- Remove confirmation toolbar -->
              {#if selectedMemberForRemoval}
                <div 
                  class="flex items-center justify-center gap-3 mt-3 py-2 px-4 rounded-full text-white"
                  style="background-color: #{primaryColor};"
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
                  <span class="text-sm font-medium">
                    {selectedMemberForRemoval === currentUserName ? 'Leave the team?' : 'Remove from team?'}
                  </span>
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
              <p class="text-[#999999] text-sm py-3">Team members will appear here</p>
            {/if}
          </div>

          <!-- Color Palette -->
          <ColorPalette
            selectedColor={team?.primary_color || '5422b0'}
            disabled={!currentUserIsEditor}
            on:select={handleColorSelect}
          />

          <!-- Logo Upload -->
          <TeamLogoUpload
            logoUrl={team?.logo_url || null}
            disabled={!currentUserIsEditor}
            {primaryColor}
            on:upload={handleLogoUpload}
            on:remove={handleLogoRemove}
          />

          <!-- Share Toggle -->
          <ShareToggle
            enabled={team?.share_enabled || false}
            teamName={currentTeamName}
            disabled={!currentUserIsEditor}
            {primaryColor}
            on:toggle={handleShareToggle}
          />
        {:else}
          <div>
            <span class="text-sm text-[#777777]">Team members</span>
            <p class="text-[#999999] text-sm mt-2">Team members will appear here</p>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Teams Tab Content -->
    {#if activeTab === 'teams' && showTeamsTab}
      <TeamsTab {courseId} />
    {/if}

    <!-- Admin Tab Content -->
    {#if activeTab === 'admin' && showAdminTab}
      <AdminTab {courseId} />
    {/if}
  </main>
</div>
