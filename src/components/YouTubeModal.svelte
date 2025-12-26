<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { uploadImage } from '$lib/cloudinary'
  import { fade } from 'svelte/transition'

  export let open = false

  const dispatch = createEventDispatcher<{
    add: { url: string; thumbnailUrl?: string }
    close: void
  }>()

  let youtubeUrl = ''
  let thumbnailFile: File | null = null
  let thumbnailFileName = ''
  let uploading = false

  function extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/
    ]
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement
    if (input.files && input.files[0]) {
      thumbnailFile = input.files[0]
      thumbnailFileName = input.files[0].name
    }
  }

  async function handleAdd() {
    const videoId = extractVideoId(youtubeUrl)
    if (!videoId) return

    let thumbnailUrl: string | undefined

    if (thumbnailFile) {
      uploading = true
      try {
        const result = await uploadImage(thumbnailFile)
        thumbnailUrl = result.url
      } catch {
        console.error('Failed to upload thumbnail')
      }
      uploading = false
    }

    dispatch('add', { url: youtubeUrl, thumbnailUrl })
    resetAndClose()
  }

  function resetAndClose() {
    youtubeUrl = ''
    thumbnailFile = null
    thumbnailFileName = ''
    dispatch('close')
  }

  $: isValid = extractVideoId(youtubeUrl) !== null
  $: hasInput = youtubeUrl.trim().length > 0
</script>

{#if open}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
  <div
    class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-6"
    transition:fade={{ duration: 150 }}
    on:click|self={resetAndClose}
    role="dialog"
    aria-modal="true"
    aria-labelledby="youtube-modal-title"
  >
    <div class="bg-white rounded-2xl w-full max-w-sm p-5">
      <h2 id="youtube-modal-title" class="sr-only">Add YouTube Video</h2>
      <div class="space-y-4">
        <div>
          <label for="youtube-url" class="block text-sm text-gray-600 mb-1">YouTube link</label>
          <div class="relative">
            <input
              id="youtube-url"
              type="url"
              bind:value={youtubeUrl}
              placeholder="https://youtube.com/watch?v=..."
              class="w-full bg-[#efefef] rounded-lg px-3 py-2 pr-9 text-sm outline-none focus:ring-2 focus:ring-[#5422b0]"
            />
            {#if hasInput}
              <div class="absolute right-2 top-1/2 -translate-y-1/2">
                {#if isValid}
                  <img 
                    src="/icons/icon-check.svg" 
                    alt="Valid" 
                    class="w-5 h-5"
                    style="filter: invert(14%) sepia(95%) saturate(3500%) hue-rotate(256deg) brightness(75%) contrast(90%);"
                  />
                {:else}
                  <img 
                    src="/icons/icon-close-circle.svg" 
                    alt="Invalid" 
                    class="w-5 h-5"
                    style="filter: invert(14%) sepia(95%) saturate(3500%) hue-rotate(256deg) brightness(75%) contrast(90%);"
                  />
                {/if}
              </div>
            {/if}
          </div>
        </div>

        <div class="flex items-end gap-4">
          <div class="flex-1">
            <span class="block text-sm text-gray-600 mb-1">Custom thumb (square)</span>
            <div class="flex items-center gap-3">
              <label class="w-16 h-16 border border-dashed border-[#777777] rounded-lg flex items-center justify-center cursor-pointer hover:border-[#5422b0] transition-colors shrink-0">
                <input
                  type="file"
                  accept="image/*"
                  class="hidden"
                  on:change={handleFileSelect}
                />
                <img
                  src="/icons/icon-custom-upload.svg"
                  alt="Upload"
                  class="w-6 h-6 opacity-50"
                />
              </label>
              {#if thumbnailFileName}
                <span class="text-sm text-[#777777] truncate">{thumbnailFileName}</span>
              {/if}
            </div>
          </div>

          <div class="flex items-center gap-4 pb-1">
            <button
              on:click={resetAndClose}
              class="text-sm text-[#777777] hover:text-[#333]"
            >
              Cancel
            </button>
            <button
              on:click={handleAdd}
              disabled={!isValid || uploading}
              class="text-sm text-[#777777] hover:text-[#333] disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Add'}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
