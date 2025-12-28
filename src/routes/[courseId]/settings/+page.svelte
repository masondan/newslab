<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { goto } from '$app/navigation'
  import { session, showNotification, teamColors, isTrainer, isGuestEditor } from '$lib/stores'
  import { supabase } from '$lib/supabase'
  import type { Team, Journalist } from '$lib/types'
  import ConfirmationToolbar from '$components/ConfirmationToolbar.svelte'
  import ColorPalette from '$components/ColorPalette.svelte'
  import TeamMemberItem from '$components/TeamMemberItem.svelte'
  import TeamLogoUpload from '$components/TeamLogoUpload.svelte'
  import ShareToggle from '$components/ShareToggle.svelte'
  import TeamLockToggle from '$components/TeamLockToggle.svelte'
  import TeamsTab from '$components/TeamsTab.svelte'
  import AdminTab from '$components/AdminTab.svelte'

  type TabType = 'settings' | 'teams' | 'admin'
  type ConfirmationAction = null | 'create-team' | 'join-team' | 'leave-team' | 'make-editor'

  let activeTab: TabType = 'settings'

  // Byline state
  let bylineName = ''
  let originalBylineName = ''
  let bylineEditing = false
  let bylineValidating = false
  let bylineValid = true
  let bylineError = ''
  let bylineSaving = false

  // Create team state
  let createTeamInput = ''
  let createTeamEditing = false
  let createTeamValidating = false
  let createTeamValid: boolean | null = null
  let createTeamError = ''
  let createTeamSaving = false

  // Join team state
  let availableTeams: Team[] = []
  let selectedTeamForJoin: Team | null = null
  let joiningTeam = false
  let teamLocked = false

  // Team data
  let team: Team | null = null
  let teamMembers: Journalist[] = []
  let currentUserIsEditor = false

  // Confirmation & modals
  let confirmationAction: ConfirmationAction = null
  let selectedMemberForRemoval: string | null = null
  let selectedMemberForEditor: { name: string; willBeEditor: boolean } | null = null
  let confirmationLoading = false
  let deleteTeamConfirming = false

  // Realtime subscription
  let journalistsSubscription: ReturnType<typeof supabase.channel> | null = null
  let teamsSubscription: ReturnType<typeof supabase.channel> | null = null

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
      await loadTeamData()
    } else {
      await loadAvailableTeams()
    }

    setupRealtimeSubscription()
  })

  onDestroy(() => {
    if (journalistsSubscription) {
      supabase.removeChannel(journalistsSubscription)
    }
    if (teamsSubscription) {
      supabase.removeChannel(teamsSubscription)
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

    teamsSubscription = supabase
      .channel('teams-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams',
          filter: `course_id=eq.${courseId}`
        },
        () => {
          if (!currentTeamName) {
            loadAvailableTeams()
          }
        }
      )
      .subscribe()
  }

  async function loadAvailableTeams() {
    if (!courseId) return

    const { data } = await supabase
      .from('teams')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false })

    if (data) {
      availableTeams = data
    }
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
    showNotification('success', 'Byline changed')
  }

  // Create team validation with debounce
  let createTeamDebounceTimer: ReturnType<typeof setTimeout>

  function handleCreateTeamInput(event: Event) {
    const input = event.target as HTMLInputElement
    createTeamInput = input.value

    if (!createTeamInput.trim()) {
      createTeamValid = null
      createTeamError = ''
      return
    }

    clearTimeout(createTeamDebounceTimer)
    createTeamValidating = true
    createTeamDebounceTimer = setTimeout(validateCreateTeamName, 300)
  }

  async function validateCreateTeamName() {
    if (!createTeamInput.trim()) {
      createTeamValidating = false
      createTeamValid = null
      createTeamError = ''
      return
    }

    const { data } = await supabase
      .from('teams')
      .select('id')
      .eq('course_id', courseId)
      .eq('team_name', createTeamInput.trim())

    createTeamValidating = false

    if (data && data.length > 0) {
      createTeamValid = false
      createTeamError = 'Team already exists'
    } else {
      createTeamValid = true
      createTeamError = ''
    }
  }

  function startTeamNameEdit() {
    createTeamEditing = true
    createTeamValid = null
    createTeamError = ''
  }

  function cancelTeamNameEdit() {
    createTeamInput = ''
    createTeamEditing = false
    createTeamValid = null
    createTeamError = ''
  }

  function openCreateTeamConfirmation() {
    if (createTeamValid && createTeamInput.trim()) {
      confirmationAction = 'create-team'
    }
  }

  function openJoinTeamConfirmation(team: Team) {
    selectedTeamForJoin = team
    teamLocked = team.team_lock ?? false
    confirmationAction = 'join-team'
  }

  function openLeaveTeamConfirmation(memberName: string) {
    selectedMemberForRemoval = memberName
    confirmationAction = 'leave-team'
  }

  function openMakeEditorConfirmation(memberName: string, willBeEditor: boolean) {
    selectedMemberForEditor = { name: memberName, willBeEditor }
    confirmationAction = 'make-editor'
  }

  async function confirmCreateTeam() {
    if (!createTeamValid || createTeamSaving || !createTeamInput.trim()) return

    confirmationLoading = true
    const trimmedName = createTeamInput.trim()

    try {
      const shareToken = crypto.randomUUID()

      const { error: teamError } = await supabase
        .from('teams')
        .insert({
          course_id: courseId,
          team_name: trimmedName,
          public_share_token: shareToken
        })

      if (teamError) throw teamError

      const { error: journalistError } = await supabase
        .from('journalists')
        .update({
          team_name: trimmedName,
          is_editor: true,
          updated_at: new Date().toISOString()
        })
        .eq('course_id', courseId)
        .eq('name', currentUserName)

      if (journalistError) throw journalistError

      session.set({
        ...$session!,
        teamName: trimmedName
      })

      createTeamInput = ''
      createTeamValid = null
      confirmationAction = null
      showNotification('success', `Created team "${trimmedName}"`)
      await loadTeamData(trimmedName)
    } catch (error) {
      console.error('Create team error:', error)
      showNotification('error', 'Failed to create team. Try again.')
    } finally {
      confirmationLoading = false
    }
  }

  async function confirmJoinTeam() {
    if (!selectedTeamForJoin || joiningTeam) return

    confirmationLoading = true
    const teamNameToJoin = selectedTeamForJoin.team_name

    try {
      const { error } = await supabase
        .from('journalists')
        .update({
          team_name: teamNameToJoin,
          is_editor: false,
          updated_at: new Date().toISOString()
        })
        .eq('course_id', courseId)
        .eq('name', currentUserName)

      if (error) throw error

      session.set({
        ...$session!,
        teamName: teamNameToJoin
      })

      confirmationAction = null
      selectedTeamForJoin = null
      showNotification('success', `Joined "${teamNameToJoin}"`)
      await loadTeamData(teamNameToJoin)
    } catch (error) {
      console.error('Join team error:', error)
      showNotification('error', 'Failed to join team. Try again.')
    } finally {
      confirmationLoading = false
    }
  }

  async function confirmLeaveTeam() {
    if (!selectedMemberForRemoval || confirmationLoading) return

    confirmationLoading = true
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

      if (teamMembers.length === 1) {
        await supabase
          .from('teams')
          .delete()
          .eq('course_id', courseId)
          .eq('team_name', currentTeamName)
      }

      if (memberToRemove === currentUserName) {
        session.set({
          ...$session!,
          teamName: null
        })
        team = null
        teamMembers = []
        currentUserIsEditor = false
        teamColors.set({ primary: '5422b0', secondary: 'f0e6f7' })
        await loadAvailableTeams()
        showNotification('info', 'You left the team')
      } else {
        await loadTeamMembers()
        showNotification('success', `Removed ${memberToRemove}`)
      }

      confirmationAction = null
      selectedMemberForRemoval = null
    } catch (error) {
      console.error('Leave team error:', error)
      showNotification('error', 'Failed to leave team. Try again.')
    } finally {
      confirmationLoading = false
    }
  }

  async function confirmMakeEditor() {
    if (!selectedMemberForEditor || confirmationLoading) return

    confirmationLoading = true
    const { name, willBeEditor } = selectedMemberForEditor

    if (!willBeEditor) {
      const editorCount = teamMembers.filter(m => m.is_editor).length
      if (editorCount === 1) {
        showNotification('error', 'Teams must have at least one editor. Add another then try again.')
        confirmationAction = null
        selectedMemberForEditor = null
        confirmationLoading = false
        return
      }
    }

    try {
      const { error } = await supabase
        .from('journalists')
        .update({ is_editor: willBeEditor, updated_at: new Date().toISOString() })
        .eq('course_id', courseId)
        .eq('name', name)

      if (error) throw error

      await loadTeamMembers()
      const action = willBeEditor ? 'promoted to editor' : 'demoted from editor'
      showNotification('success', `${name} ${action}`)

      confirmationAction = null
      selectedMemberForEditor = null
    } catch (error) {
      console.error('Make editor error:', error)
      showNotification('error', 'Failed to update. Try again.')
    } finally {
      confirmationLoading = false
    }
  }

  function cancelConfirmation() {
    confirmationAction = null
    selectedMemberForRemoval = null
    selectedMemberForEditor = null
    selectedTeamForJoin = null
    confirmationLoading = false
  }

  function handleToggleEditor(event: CustomEvent<{ name: string; isEditor: boolean }>) {
    const { name, isEditor } = event.detail
    openMakeEditorConfirmation(name, isEditor)
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

  async function handleTeamLockToggle(event: CustomEvent<{ locked: boolean }>) {
    if (!team || !currentUserIsEditor) return

    try {
      const { error } = await supabase
        .from('teams')
        .update({ team_lock: event.detail.locked, updated_at: new Date().toISOString() })
        .eq('course_id', courseId)
        .eq('team_name', currentTeamName)

      if (error) throw error

      team = { ...team, team_lock: event.detail.locked }
      showNotification('success', event.detail.locked ? 'Team locked' : 'Team unlocked')
    } catch (error) {
      console.error('Team lock toggle error:', error)
      showNotification('error', 'Failed to update team lock')
    }
  }

  async function handleDeleteTeam() {
    if (!currentTeamName || !currentUserIsEditor) return

    deleteTeamConfirming = true

    try {
      // Revert all published stories in team to drafts
      const { error: updateStoriesError } = await supabase
        .from('stories')
        .update({ status: 'draft', updated_at: new Date().toISOString() })
        .eq('course_id', courseId)
        .eq('team_name', currentTeamName)
        .eq('status', 'published')

      if (updateStoriesError) throw updateStoriesError

      // Delete the team
      const { error: deleteTeamError } = await supabase
        .from('teams')
        .delete()
        .eq('course_id', courseId)
        .eq('team_name', currentTeamName)

      if (deleteTeamError) throw deleteTeamError

      // Remove team from all members
      const { error: updateJournalistsError } = await supabase
        .from('journalists')
        .update({ team_name: null, is_editor: false, updated_at: new Date().toISOString() })
        .eq('course_id', courseId)
        .eq('team_name', currentTeamName)

      if (updateJournalistsError) throw updateJournalistsError

      // Update session if current user was in this team
      session.set({
        ...$session!,
        teamName: null
      })

      team = null
      teamMembers = []
      currentUserIsEditor = false
      teamColors.set({ primary: '5422b0', secondary: 'f0e6f7' })
      await loadAvailableTeams()
      deleteTeamConfirming = false

      showNotification('success', 'Team deleted')
    } catch (error) {
      console.error('Delete team error:', error)
      showNotification('error', 'Failed to delete team. Try again.')
      deleteTeamConfirming = false
    }
  }

  function handleLogout() {
    session.logout()
    goto('/')
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
        class:text-[#777777]={activeTab !== 'settings'}
        class:border-transparent={activeTab !== 'settings'}
        style={activeTab === 'settings' ? `color: #${primaryColor}; border-bottom-color: #${primaryColor};` : ''}
      >
        Settings
      </button>
      
      {#if showTeamsTab}
        <button
          type="button"
          on:click={() => activeTab = 'teams'}
          class="text-xl font-semibold transition-colors pb-1 border-b-2"
          class:text-[#777777]={activeTab !== 'teams'}
          class:border-transparent={activeTab !== 'teams'}
          style={activeTab === 'teams' ? `color: #${primaryColor}; border-bottom-color: #${primaryColor};` : ''}
        >
          Teams
        </button>
      {/if}
      
      {#if showAdminTab}
        <button
          type="button"
          on:click={() => activeTab = 'admin'}
          class="text-xl font-semibold transition-colors pb-1 border-b-2"
          class:text-[#777777]={activeTab !== 'admin'}
          class:border-transparent={activeTab !== 'admin'}
          style={activeTab === 'admin' ? `color: #${primaryColor}; border-bottom-color: #${primaryColor};` : ''}
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
          <div class="flex items-start gap-2">
            <!-- Left column: label, input, helper text -->
            <div class="flex-1">
              <div class="flex items-center justify-between mb-2">
                <label for="byline-input" class="text-sm text-[#777777]">Byline</label>
                <span class="text-xs text-[#999999]">{bylineName.length} / 30</span>
              </div>
              
              <input
                id="byline-input"
                type="text"
                value={bylineName}
                on:input={handleBylineInput}
                on:focus={startBylineEdit}
                maxlength="30"
                class="w-full bg-[#efefef] rounded-lg px-4 py-3 text-base outline-none transition-all"
                class:ring-2={bylineEditing}
                style={bylineEditing ? `ring-color: #${primaryColor}; --tw-ring-color: #${primaryColor}` : ''}
              />
              
              <!-- Helper text -->
              {#if bylineEditing}
                <p class="text-sm mt-2" style="color: #{bylineValid ? (bylineName !== originalBylineName && bylineName.trim().length > 0 ? '057373' : '777777') : '996633'};">
                  {#if !bylineValid}
                    Name taken. Try again
                  {:else if bylineName !== originalBylineName && bylineName.trim().length > 0}
                    Name available
                  {:else}
                    Choose a new byline
                  {/if}
                </p>
              {/if}
            </div>

            <!-- Right column: icon (fixed position aligned with input center) -->
            <div class="flex items-center" style="margin-top: 42px; height: 20px;">
              {#if bylineValidating}
                <div 
                  class="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                  style="border-color: #{primaryColor}; border-top-color: transparent;"
                ></div>
              {:else if bylineEditing}
                {#if bylineValid && bylineName !== originalBylineName && bylineName.trim().length > 0}
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
          </div>

          <!-- Toolbar row (aligned with input, not full width) -->
          {#if bylineEditing}
            <div class="flex justify-end mt-1 mr-7">
              <div 
                class="flex items-center rounded-full px-4 py-2 text-white text-sm font-medium"
                style="background-color: #{primaryColor};"
              >
                <button
                  type="button"
                  on:click={saveByline}
                  disabled={!bylineValid || bylineName === originalBylineName || bylineName.trim().length === 0 || bylineSaving}
                  class="transition-opacity"
                  class:opacity-50={!bylineValid || bylineName === originalBylineName || bylineName.trim().length === 0 || bylineSaving}
                >
                  {bylineSaving ? 'Saving...' : 'Change name'}
                </button>
                <span class="mx-3 opacity-60">|</span>
                <button
                  type="button"
                  on:click={cancelBylineEdit}
                  class="transition-opacity hover:opacity-80"
                >
                  Cancel
                </button>
              </div>
            </div>
          {/if}
        </div>

        <!-- Team Name Section -->
        {#if !currentTeamName}
          <div>
            <div class="flex items-start gap-2">
              <!-- Left column: label, input, helper text -->
              <div class="flex-1">
                <div class="flex items-center justify-between mb-2">
                  <label for="create-team-input" class="text-sm text-[#777777]">Team name</label>
                  <span class="text-xs text-[#999999]">{createTeamInput.length} / 30</span>
                </div>
                
                <input
                  id="create-team-input"
                  type="text"
                  value={createTeamInput}
                  on:input={handleCreateTeamInput}
                  on:focus={startTeamNameEdit}
                  maxlength="30"
                  placeholder=""
                  class="w-full bg-[#efefef] rounded-lg px-4 py-3 text-base outline-none transition-all"
                  class:ring-2={createTeamEditing}
                  style={createTeamEditing ? `ring-color: #${primaryColor}; --tw-ring-color: #${primaryColor}` : ''}
                />
                
                <!-- Helper text -->
                {#if createTeamEditing}
                  <p class="text-sm mt-2" style="color: #{createTeamValid === true ? '057373' : (createTeamValid === false ? '996633' : '777777')};">
                    {#if createTeamValid === false}
                      Name taken. Try again
                    {:else if createTeamValid === true}
                      Name available
                    {:else}
                      Choose a team name
                    {/if}
                  </p>
                {/if}
              </div>

              <!-- Right column: icon (fixed position aligned with input center) -->
              <div class="flex items-center" style="margin-top: 42px; height: 20px;">
                {#if createTeamValidating}
                  <div 
                    class="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                    style="border-color: #{primaryColor}; border-top-color: transparent;"
                  ></div>
                {:else if createTeamEditing}
                  {#if createTeamValid === true}
                    <img
                      src="/icons/icon-check.svg"
                      alt="Available"
                      class="w-5 h-5"
                      style="filter: invert(18%) sepia(89%) saturate(2264%) hue-rotate(254deg) brightness(87%) contrast(97%);"
                    />
                  {:else if createTeamValid === false}
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
                    src="/icons/icon-circle.svg"
                    alt=""
                    class="w-5 h-5"
                    style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
                  />
                {/if}
              </div>
            </div>

            <!-- Toolbar row (aligned with input, not full width) -->
            {#if createTeamEditing}
              <div class="flex justify-end mt-1 mr-7">
                <div 
                  class="flex items-center rounded-full px-4 py-2 text-white text-sm font-medium"
                  style="background-color: #{primaryColor};"
                >
                  <button
                    type="button"
                    on:click={openCreateTeamConfirmation}
                    disabled={createTeamValid !== true || createTeamInput.trim().length === 0 || createTeamSaving}
                    class="transition-opacity"
                    class:opacity-50={createTeamValid !== true || createTeamInput.trim().length === 0 || createTeamSaving}
                  >
                    {createTeamSaving ? 'Creating...' : 'Create team'}
                  </button>
                  <span class="mx-3 opacity-60">|</span>
                  <button
                    type="button"
                    on:click={cancelTeamNameEdit}
                    class="transition-opacity hover:opacity-80"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            {/if}
          </div>
        {/if}

        <!-- Teams Section -->
        {#if !currentTeamName}
          <div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-[#777777]">Teams</span>
              {#if availableTeams.length > 0}
                <span class="text-sm text-[#777777]">Tap to join</span>
              {/if}
            </div>
            <div class="w-full border-b border-[#e0e0e0] mt-2"></div>
            
            {#if availableTeams.length > 0}
              <div>
                {#each availableTeams as availTeam (availTeam.id)}
                  <button
                    type="button"
                    on:click={() => openJoinTeamConfirmation(availTeam)}
                    class="w-full flex items-center justify-between py-3 text-left hover:bg-[#f5f5f5] transition-colors border-b border-[#e0e0e0]"
                  >
                    <span class="text-base text-[#333333]">{availTeam.team_name}</span>
                    <img
                      src="/icons/icon-circle.svg"
                      alt=""
                      class="w-5 h-5"
                      style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
                    />
                  </button>
                {/each}
              </div>
            {:else}
              <p class="text-center text-[#999999] text-sm py-6">All teams appear here</p>
            {/if}
          </div>

          <!-- Team members Placeholder Section -->
          <div>
            <span class="text-sm text-[#777777]">Team members</span>
            <div class="w-full border-b border-[#e0e0e0] mt-2"></div>
            <p class="text-center text-[#999999] text-sm py-6">Team members appear here</p>
          </div>
        {/if}

        <!-- Team members Section (Only if in a team) -->
        {#if currentTeamName}
          <div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-[#777777]">Team members</span>
              {#if currentUserIsEditor}
                <span class="text-sm text-[#777777]">Editor</span>
              {/if}
            </div>
            <div class="w-full border-b border-[#e0e0e0] mt-2"></div>

            {#if teamMembers.length > 0}
              <div>
                {#each teamMembers as member (member.id)}
                  <TeamMemberItem
                    name={member.name}
                    isEditor={member.is_editor}
                    isCurrentUser={member.name === currentUserName}
                    canRemove={currentUserIsEditor || member.name === currentUserName}
                    canToggleEditor={currentUserIsEditor}
                    {primaryColor}
                    on:remove={() => openLeaveTeamConfirmation(member.name)}
                    on:toggleEditor={handleToggleEditor}
                  />
                {/each}
              </div>
            {:else}
              <p class="text-center text-[#999999] text-sm py-6">Team members appear here</p>
            {/if}

            <!-- Explanation text below members list -->
            {#if teamMembers.length > 0}
              <p class="text-xs text-[#999999] mt-3">
                Teams must have at least one editor.<br/>
                To leave the team, tap X. When you leave all published stories will revert to drafts
              </p>
            {/if}
          </div>

          <!-- Editor-only controls -->
          {#if currentUserIsEditor}
            <div class="border-t border-[#efefef] pt-6">
              <h3 class="text-sm text-[#777777] font-medium mb-4">Editor-only controls below</h3>

              <!-- Color Palette -->
              <ColorPalette
                selectedColor={team?.primary_color || '5422b0'}
                disabled={false}
                on:select={handleColorSelect}
              />

              <!-- Logo Upload -->
              <TeamLogoUpload
                logoUrl={team?.logo_url || null}
                disabled={false}
                {primaryColor}
                on:upload={handleLogoUpload}
                on:remove={handleLogoRemove}
              />

              <!-- Share Toggle -->
              <ShareToggle
                enabled={team?.share_enabled || false}
                teamName={currentTeamName}
                disabled={false}
                {primaryColor}
                on:toggle={handleShareToggle}
              />

              <!-- Team Lock Toggle -->
              <TeamLockToggle
                locked={team?.team_lock || false}
                disabled={false}
                {primaryColor}
                on:toggle={handleTeamLockToggle}
              />

              <!-- Danger Zone -->
              <div class="mt-6 border-t border-[#efefef] pt-4">
                <h3 class="text-sm text-red-600 font-medium mb-3">Danger zone</h3>
                <button
                  type="button"
                  on:click={() => (deleteTeamConfirming = true)}
                  disabled={deleteTeamConfirming}
                  class="w-full py-2 px-4 rounded-full text-white text-sm font-medium transition-opacity bg-red-600 hover:bg-red-700"
                  class:opacity-50={deleteTeamConfirming}
                >
                  {deleteTeamConfirming ? 'Deleting...' : 'Delete the team'}
                </button>
                <p class="text-xs text-[#999999] mt-2">
                  If you delete the team published stories will revert to author drafts
                </p>
              </div>
            </div>
          {/if}
        {/if}

        <!-- Logout Button -->
        <div class="mt-6 border-t border-[#efefef] pt-6">
          <button
            type="button"
            on:click={handleLogout}
            class="w-full py-3 text-[#777777] text-sm font-medium"
          >
            Log out
          </button>
        </div>
      </div>
    {/if}

    <!-- Confirmation Modals -->
    {#if confirmationAction === 'create-team'}
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-2xl p-6 mx-4 max-w-sm">
          <h2 class="text-lg font-semibold text-[#333333] mb-2">Create team</h2>
          <p class="text-sm text-[#666666] mb-6">Create "{createTeamInput}"?</p>

          <div class="flex gap-3">
            <button
              type="button"
              on:click={cancelConfirmation}
              disabled={confirmationLoading}
              class="flex-1 px-4 py-2 rounded-full border border-[#{primaryColor}] text-[#{primaryColor}] text-sm font-medium transition-all hover:bg-[#{primaryColor}] hover:bg-opacity-10"
              style="border-color: #${primaryColor}; color: #${primaryColor};"
            >
              Cancel
            </button>
            <button
              type="button"
              on:click={confirmCreateTeam}
              disabled={confirmationLoading}
              class="flex-1 px-4 py-2 rounded-full text-white text-sm font-medium transition-all"
              style="background-color: #${primaryColor};"
            >
              {confirmationLoading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    {/if}

    {#if confirmationAction === 'join-team'}
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-2xl p-6 mx-4 max-w-sm">
          {#if teamLocked}
            <h2 class="text-lg font-semibold text-[#333333] mb-2">Team locked</h2>
            <p class="text-sm text-[#666666] mb-6">Sorry, this team is locked by an editor</p>
            <button
              type="button"
              on:click={cancelConfirmation}
              class="w-full px-4 py-2 rounded-full text-white text-sm font-medium"
              style="background-color: #${primaryColor};"
            >
              OK
            </button>
          {:else}
            <h2 class="text-lg font-semibold text-[#333333] mb-2">Join team</h2>
            <p class="text-sm text-[#666666] mb-6">Join "{selectedTeamForJoin?.team_name}"?</p>

            <div class="flex gap-3">
              <button
                type="button"
                on:click={cancelConfirmation}
                disabled={confirmationLoading}
                class="flex-1 px-4 py-2 rounded-full border border-[#{primaryColor}] text-[#{primaryColor}] text-sm font-medium transition-all hover:bg-[#{primaryColor}] hover:bg-opacity-10"
                style="border-color: #${primaryColor}; color: #${primaryColor};"
              >
                Cancel
              </button>
              <button
                type="button"
                on:click={confirmJoinTeam}
                disabled={confirmationLoading}
                class="flex-1 px-4 py-2 rounded-full text-white text-sm font-medium transition-all"
                style="background-color: #${primaryColor};"
              >
                {confirmationLoading ? 'Joining...' : 'Join'}
              </button>
            </div>
          {/if}
        </div>
      </div>
    {/if}

    {#if confirmationAction === 'leave-team'}
      <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-[#efefef] p-4">
        <ConfirmationToolbar
          message={selectedMemberForRemoval === currentUserName ? 'Leave the team?' : 'Remove from team?'}
          {primaryColor}
          isLoading={confirmationLoading}
          on:cancel={cancelConfirmation}
          on:confirm={confirmLeaveTeam}
        />
      </div>
    {/if}

    {#if confirmationAction === 'make-editor' && selectedMemberForEditor}
      <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-[#efefef] p-4">
        <ConfirmationToolbar
          message={selectedMemberForEditor.willBeEditor ? `${selectedMemberForEditor.name} is now an editor` : `Remove ${selectedMemberForEditor.name} as editor?`}
          {primaryColor}
          isLoading={confirmationLoading}
          on:cancel={cancelConfirmation}
          on:confirm={confirmMakeEditor}
        />
      </div>
    {/if}

    <!-- Delete Team Confirmation Modal -->
    {#if deleteTeamConfirming}
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-2xl p-6 mx-4 max-w-sm">
          <h2 class="text-lg font-semibold text-[#333333] mb-2">Delete the team</h2>
          <p class="text-sm text-[#666666] mb-6">Are you sure? This cannot be undone. Published stories will revert to drafts.</p>

          <div class="flex gap-3">
            <button
              type="button"
              on:click={() => (deleteTeamConfirming = false)}
              disabled={deleteTeamConfirming}
              class="flex-1 px-4 py-2 rounded-full text-[#333333] text-sm font-medium transition-all border border-[#ddd]"
            >
              Cancel
            </button>
            <button
              type="button"
              on:click={handleDeleteTeam}
              disabled={deleteTeamConfirming}
              class="flex-1 px-4 py-2 rounded-full text-white text-sm font-medium transition-all bg-red-600 hover:bg-red-700"
            >
              Delete team
            </button>
          </div>
        </div>
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
