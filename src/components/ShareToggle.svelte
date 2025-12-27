<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { showNotification } from '$lib/stores'

  export let enabled: boolean = false
  export let teamName: string = ''
  export let disabled: boolean = false
  export let primaryColor: string = '5422b0'

  const dispatch = createEventDispatcher<{ toggle: { enabled: boolean } }>()

  let copied = false

  $: shareUrl = teamName 
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/share/${encodeURIComponent(teamName.toLowerCase().replace(/\s+/g, '-'))}`
    : ''

  function handleToggle() {
    if (disabled) return
    dispatch('toggle', { enabled: !enabled })
  }

  async function copyUrl() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      copied = true
      showNotification('success', 'URL copied!')
      setTimeout(() => { copied = false }, 2000)
    } catch {
      showNotification('error', 'Failed to copy')
    }
  }
</script>

<div class="space-y-3">
  <div class="flex items-center justify-between pb-1 border-b border-[#efefef]">
    <span class="text-sm text-[#777777]">Share team stream<span class="text-[#777777]">*</span></span>
    
    <button
      type="button"
      on:click={handleToggle}
      disabled={disabled}
      class="relative w-12 h-6 rounded-full transition-colors duration-200"
      class:cursor-not-allowed={disabled}
      class:opacity-50={disabled}
      style="background-color: {enabled ? `#${primaryColor}` : '#ccc'};"
      role="switch"
      aria-checked={enabled}
      aria-label="Share team stream"
    >
      <span
        class="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"
        style="left: {enabled ? '28px' : '4px'};"
      ></span>
    </button>
  </div>

  {#if enabled && teamName}
    <div class="flex items-center gap-2 bg-[#efefef] rounded-lg px-3 py-2">
      <span class="flex-1 text-sm text-[#333] truncate">{shareUrl}</span>
      <button
        type="button"
        on:click={copyUrl}
        class="flex-shrink-0 p-1"
        aria-label="Copy URL"
      >
        <img
          src="/icons/icon-copy.svg"
          alt=""
          class="w-5 h-5"
          style="filter: {copied 
            ? 'invert(18%) sepia(89%) saturate(2264%) hue-rotate(254deg) brightness(87%) contrast(97%)'
            : 'invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%)'};"
        />
      </button>
    </div>
  {/if}
</div>
