<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { supabase } from '$lib/supabase'
  import type { Team } from '$lib/types'
  import TeamExpandable from '$components/TeamExpandable.svelte'
  import TeamStreamDrawer from '$components/TeamStreamDrawer.svelte'

  export let courseId: string

  let teams: Team[] = []
  let loading = true
  let expandedTeamId: string | null = null

  let previewDrawerOpen = false
  let previewTeamName = ''

  let teamsSubscription: ReturnType<typeof supabase.channel> | null = null

  onMount(async () => {
    await loadTeams()
    setupRealtimeSubscription()
  })

  onDestroy(() => {
    if (teamsSubscription) {
      supabase.removeChannel(teamsSubscription)
    }
  })

  function setupRealtimeSubscription() {
    teamsSubscription = supabase
      .channel('teams-changes-admin')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams',
          filter: `course_id=eq.${courseId}`
        },
        () => {
          loadTeams()
        }
      )
      .subscribe()
  }

  async function loadTeams() {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: true })

    if (!error && data) {
      teams = data
    }
    loading = false
  }

  function handleExpand(teamId: string) {
    expandedTeamId = expandedTeamId === teamId ? null : teamId
  }

  function handlePreview(event: CustomEvent<{ teamName: string }>) {
    previewTeamName = event.detail.teamName
    previewDrawerOpen = true
  }

  function handleTeamUpdated() {
    loadTeams()
  }
</script>

<div>
  {#if loading}
    <p class="text-[#999999] text-center py-8">Loading...</p>
  {:else if teams.length === 0}
    <p class="text-[#999999] text-center py-8">Teams and members appear here</p>
  {:else}
    <div>
      <span class="text-sm text-[#777777] mb-3 block">Teams</span>
      
      {#each teams as team (team.id)}
        <TeamExpandable
          {team}
          {courseId}
          expanded={expandedTeamId === team.id}
          on:preview={handlePreview}
          on:updated={handleTeamUpdated}
          on:click={() => handleExpand(team.id)}
        />
      {/each}
    </div>
  {/if}
</div>

<!-- Team Stream Preview Drawer -->
<TeamStreamDrawer
  bind:open={previewDrawerOpen}
  {courseId}
  teamNameToView={previewTeamName}
/>
