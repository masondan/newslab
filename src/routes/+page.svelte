<script lang="ts">
  import { goto } from '$app/navigation'
  import { session, showNotification, isLoggedIn } from '$lib/stores'
  import { validateCourseId, validateByline, createSession } from '$lib/auth'
  import type { UserRole } from '$lib/types'
  import { onMount } from 'svelte'

  let courseIdInput = ''
  let bylineInput = ''

  let step: 'course' | 'byline' = 'course'
  let courseIdStatus: 'idle' | 'loading' | 'valid' | 'invalid' = 'idle'
  let bylineStatus: 'idle' | 'loading' | 'valid' | 'invalid' = 'idle'
  let errorMessage = ''

  let validatedCourseId = ''
  let detectedRole: UserRole = 'journalist'

  let courseInputFocused = false
  let bylineInputFocused = false

  onMount(() => {
    // If already logged in, redirect to home
    if ($isLoggedIn && $session?.courseId) {
      goto(`/${$session.courseId}/home`)
    }
  })

  async function handleCourseSubmit() {
    if (!courseIdInput.trim() || courseIdStatus === 'loading') return

    courseIdStatus = 'loading'
    errorMessage = ''

    const result = await validateCourseId(courseIdInput)

    if (result.success) {
      courseIdStatus = 'valid'
      validatedCourseId = result.courseId
      detectedRole = result.role
      step = 'byline'
      courseInputFocused = false
    } else {
      courseIdStatus = 'invalid'
      errorMessage = result.error
    }
  }

  async function handleBylineSubmit() {
    if (!bylineInput.trim() || bylineStatus === 'loading') return

    bylineStatus = 'loading'
    errorMessage = ''

    const result = await validateByline(validatedCourseId, bylineInput, detectedRole)

    if (result.success) {
      bylineStatus = 'valid'

      const newSession = createSession(validatedCourseId, bylineInput.trim(), detectedRole)
      session.set(newSession)

      showNotification('success', `Welcome ${bylineInput.trim()}`)

      setTimeout(() => {
        goto(`/${validatedCourseId}/home`)
      }, 500)
    } else {
      bylineStatus = 'invalid'
      errorMessage = result.error
    }
  }

  function handleCourseKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      handleCourseSubmit()
    }
  }

  function handleBylineKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      handleBylineSubmit()
    }
  }
</script>

<svelte:head>
  <title>NewsLab - Login</title>
</svelte:head>

<div class="min-h-screen bg-accent-brand flex flex-col items-center px-6 relative">
  <!-- Logo - centered -->
  <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
    <img
      src="/icons/logo-textlogo-white.png"
      alt="NewsLab"
      class="h-12 w-auto"
    />
  </div>

  <!-- Input Container -->
  <div class="w-full max-w-xs space-y-4 absolute top-2/3 left-1/2 transform -translate-x-1/2">
    <!-- Course ID Input -->
    <div
      class="relative flex items-center bg-white rounded-lg overflow-hidden"
      class:ring-2={courseInputFocused && courseIdStatus !== 'valid'}
      class:ring-white={courseInputFocused && courseIdStatus !== 'valid'}
    >
      <input
        type="text"
        bind:value={courseIdInput}
        on:focus={() => courseInputFocused = true}
        on:blur={() => courseInputFocused = false}
        on:keydown={handleCourseKeydown}
        placeholder="Enter your course key"
        disabled={courseIdStatus === 'valid'}
        class="flex-1 bg-transparent px-4 py-3 text-text-primary placeholder-text-secondary outline-none disabled:opacity-75"
        maxlength="20"
      />

      {#if courseIdStatus === 'valid'}
        <!-- Check icon: purple circle with white checkmark -->
        <div class="mr-3 w-8 h-8 rounded-full bg-accent-brand flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="white">
            <path d="M9.9997 15.1709L19.1921 5.97852L20.6063 7.39273L9.9997 17.9993L3.63574 11.6354L5.04996 10.2212L9.9997 15.1709Z"/>
          </svg>
        </div>
      {:else if courseIdStatus === 'invalid'}
        <!-- X icon: purple circle with white X -->
        <div class="mr-3 w-8 h-8 rounded-full bg-accent-brand flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="white">
            <path d="M12 10.5858L16.2426 6.34315L17.6568 7.75736L13.4142 12L17.6568 16.2426L16.2426 17.6569L12 13.4142L7.75736 17.6569L6.34315 16.2426L10.5858 12L6.34315 7.75736L7.75736 6.34315L12 10.5858Z"/>
          </svg>
        </div>
      {:else if courseInputFocused || courseIdInput}
        <!-- Send icon: purple circle with white arrow -->
        <button
          on:click={handleCourseSubmit}
          disabled={courseIdStatus === 'loading'}
          class="mr-3 w-8 h-8 rounded-full bg-accent-brand flex items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="white">
            <path d="M13.1714 12.0007L8.22168 7.05093L9.63589 5.63672L15.9999 12.0007L9.63589 18.3646L8.22168 16.9504L13.1714 12.0007Z"/>
          </svg>
        </button>
      {/if}
    </div>

    {#if courseIdStatus === 'invalid' && errorMessage}
      <p class="text-white text-sm">{errorMessage}</p>
    {/if}

    <!-- Byline Input (appears after course validation) -->
    {#if step === 'byline'}
      <div
        class="relative flex items-center bg-white rounded-lg overflow-hidden"
        class:ring-2={bylineInputFocused && bylineStatus !== 'valid'}
        class:ring-white={bylineInputFocused && bylineStatus !== 'valid'}
      >
        <input
          type="text"
          bind:value={bylineInput}
          on:focus={() => bylineInputFocused = true}
          on:blur={() => bylineInputFocused = false}
          on:keydown={handleBylineKeydown}
          placeholder="Enter your byline"
          disabled={bylineStatus === 'valid'}
          class="flex-1 bg-transparent px-4 py-3 text-text-primary placeholder-text-secondary outline-none disabled:opacity-75"
          maxlength="30"
        />

        {#if bylineStatus === 'valid'}
          <!-- Check icon: purple circle with white checkmark -->
          <div class="mr-3 w-8 h-8 rounded-full bg-accent-brand flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="white">
              <path d="M9.9997 15.1709L19.1921 5.97852L20.6063 7.39273L9.9997 17.9993L3.63574 11.6354L5.04996 10.2212L9.9997 15.1709Z"/>
            </svg>
          </div>
        {:else if bylineStatus === 'invalid'}
          <!-- X icon: purple circle with white X -->
          <div class="mr-3 w-8 h-8 rounded-full bg-accent-brand flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="white">
              <path d="M12 10.5858L16.2426 6.34315L17.6568 7.75736L13.4142 12L17.6568 16.2426L16.2426 17.6569L12 13.4142L7.75736 17.6569L6.34315 16.2426L10.5858 12L6.34315 7.75736L7.75736 6.34315L12 10.5858Z"/>
            </svg>
          </div>
        {:else if bylineInputFocused || bylineInput}
          <!-- Send icon: purple circle with white arrow -->
          <button
            on:click={handleBylineSubmit}
            disabled={bylineStatus === 'loading'}
            class="mr-3 w-8 h-8 rounded-full bg-accent-brand flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="white">
              <path d="M13.1714 12.0007L8.22168 7.05093L9.63589 5.63672L15.9999 12.0007L9.63589 18.3646L8.22168 16.9504L13.1714 12.0007Z"/>
            </svg>
          </button>
        {/if}
      </div>

      {#if bylineStatus === 'invalid' && errorMessage}
        <p class="text-white text-sm">{errorMessage}</p>
      {/if}
    {/if}
  </div>
</div>
