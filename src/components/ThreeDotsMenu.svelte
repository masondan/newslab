<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { fly } from 'svelte/transition'
  import { teamColors } from '$lib/stores'

  export let type: 'draft' | 'published' | 'stream' = 'draft'
  export let isPinned = false
  export let isEditor = false

  const dispatch = createEventDispatcher<{
    edit: void
    delete: void
    unpublish: void
    export: { format: 'pdf' | 'txt' }
    pin: void
    unpin: void
    close: void
  }>()

  let showDeleteConfirm = false
  let showExportMenu = false

  function handleDelete() {
    if (!showDeleteConfirm) {
      showDeleteConfirm = true
    } else {
      dispatch('delete')
      showDeleteConfirm = false
    }
  }

  function handleExport(format: 'pdf' | 'txt') {
    dispatch('export', { format })
    showExportMenu = false
  }

  $: showUnpublish = type === 'published' || type === 'stream'
  $: showPin = type === 'stream' && isEditor
</script>

<div
  class="relative flex justify-end"
  transition:fly={{ y: -10, duration: 150 }}
>
  <!-- Main toolbar -->
  <div
    class="inline-flex items-center rounded-full text-white text-sm overflow-hidden"
    style="background-color: #{$teamColors.primary};"
  >
    <!-- Delete button / confirmation -->
    <button
      on:click={handleDelete}
      class="flex items-center gap-2 px-3 py-2 hover:bg-black/10 transition-colors"
    >
      {#if showDeleteConfirm}
        <span>Delete?</span>
      {/if}
      <img
        src="/icons/icon-trash.svg"
        alt="Delete"
        class="w-4 h-4 invert"
      />
    </button>

    <div class="w-px h-5 bg-white/30"></div>

    <!-- Unpublish (for published/stream) -->
    {#if showUnpublish}
      <button
        on:click={() => dispatch('unpublish')}
        class="px-3 py-2 hover:bg-black/10 transition-colors"
      >
        Unpublish
      </button>
      <div class="w-px h-5 bg-white/30"></div>
    {/if}

    <!-- Export -->
    <div class="relative">
      <button
        on:click={() => showExportMenu = !showExportMenu}
        class="px-3 py-2 hover:bg-black/10 transition-colors"
      >
        Export
      </button>

      {#if showExportMenu}
        <div
          class="absolute top-full left-1/2 -translate-x-1/2 mt-1 rounded-lg overflow-hidden shadow-lg z-10"
          style="background-color: #{$teamColors.secondary};"
          transition:fly={{ y: -5, duration: 100 }}
        >
          <button
            on:click={() => handleExport('pdf')}
            class="block w-full px-6 py-2 text-sm hover:bg-black/5 transition-colors"
            style="color: #{$teamColors.primary};"
          >
            PDF
          </button>
          <button
            on:click={() => handleExport('txt')}
            class="block w-full px-6 py-2 text-sm hover:bg-black/5 transition-colors"
            style="color: #{$teamColors.primary};"
          >
            TXT
          </button>
        </div>
      {/if}
    </div>

    <!-- Pin toggle (stream only, editors only) -->
    {#if showPin}
      <div class="w-px h-5 bg-white/30"></div>
      <button
        on:click={() => dispatch(isPinned ? 'unpin' : 'pin')}
        class="px-3 py-2 hover:bg-black/10 transition-colors"
        aria-label={isPinned ? 'Unpin' : 'Pin'}
      >
        <img
          src={isPinned ? '/icons/icon-pin-fill.svg' : '/icons/icon-pin.svg'}
          alt=""
          class="w-4 h-4 invert"
        />
      </button>
    {/if}

    <div class="w-px h-5 bg-white/30"></div>

    <!-- Edit -->
    <button
      on:click={() => dispatch('edit')}
      class="px-3 py-2 hover:bg-black/10 transition-colors"
    >
      Edit
    </button>
  </div>
</div>
