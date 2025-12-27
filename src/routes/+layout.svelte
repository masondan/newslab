<script lang="ts">
  import '../app.css'
  import { onMount } from 'svelte'
  import { session, isLoggedIn } from '$lib/stores'
  import { validateSession } from '$lib/auth'
  import Notification from '../components/Notification.svelte'

  let isValidating = true

  onMount(async () => {
    const currentSession = $session
    
    if (currentSession) {
      const valid = await validateSession(currentSession)
      if (!valid) {
        session.logout()
      }
    }
    
    isValidating = false
  })
</script>

<svelte:head>
  <title>NewsLab</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-bg-main">
  <div class="w-full max-w-[480px] flex flex-col md:shadow-2xl md:rounded-lg">
    <Notification />

    {#if isValidating}
      <div class="min-h-screen bg-accent-brand flex items-center justify-center rounded-lg">
        <img 
          src="/icons/logo-textlogo-white.png" 
          alt="NewsLab" 
          class="h-12 w-auto animate-pulse"
        />
      </div>
    {:else}
      <slot />
    {/if}
  </div>
</div>
