<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { fade } from 'svelte/transition'
  import { teamColors } from '$lib/stores'

  export let open = false
  export let initialText = ''

  const dispatch = createEventDispatcher<{
    add: { text: string; url: string; color: string }
    close: void
  }>()

  let linkText = ''
  let linkUrl = 'https://'

  $: if (open && initialText) {
    linkText = initialText
  }

  function handleAdd() {
    if (!linkText.trim() || !isValidUrl(linkUrl)) return

    dispatch('add', {
      text: linkText.trim(),
      url: linkUrl,
      color: $teamColors.primary
    })
    resetAndClose()
  }

  function isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  function resetAndClose() {
    linkText = ''
    linkUrl = 'https://'
    dispatch('close')
  }

  $: isValid = linkText.trim() && isValidUrl(linkUrl)
</script>

{#if open}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
  <div
    class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-6"
    transition:fade={{ duration: 150 }}
    on:click|self={resetAndClose}
    role="dialog"
    aria-modal="true"
    aria-labelledby="link-modal-title"
  >
    <div class="bg-white rounded-2xl w-full max-w-sm p-5">
      <h2 id="link-modal-title" class="sr-only">Add Link</h2>
      <div class="space-y-4">
        <div>
          <label for="link-text" class="block text-sm text-gray-600 mb-1">Text</label>
          <input
            id="link-text"
            type="text"
            bind:value={linkText}
            placeholder="Link text"
            class="w-full bg-[#efefef] rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#5422b0]"
          />
        </div>

        <div>
          <label for="link-url" class="block text-sm text-gray-600 mb-1">Link</label>
          <input
            id="link-url"
            type="url"
            bind:value={linkUrl}
            placeholder="https://"
            class="w-full bg-[#efefef] rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#5422b0]"
          />
        </div>
      </div>

      <div class="flex justify-end gap-4 mt-6">
        <button
          on:click={resetAndClose}
          class="text-sm text-[#777777] hover:text-[#333]"
        >
          Cancel
        </button>
        <button
          on:click={handleAdd}
          disabled={!isValid}
          class="text-sm text-[#777777] hover:text-[#333] disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  </div>
{/if}
