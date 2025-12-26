<script lang="ts">
  import { supabase } from '$lib/supabase'
  import { showNotification, session } from '$lib/stores'
  import { uploadImage } from '$lib/cloudinary'

  export let courseId: string

  let trainerId = ''
  let displayCourseId = ''
  let guestEditorId = ''
  let fallbackImageUrl: string | null = null

  let guestEditorEditing = false
  let guestEditorSaving = false
  let deleteConfirmText = ''
  let deleting = false
  let uploadingFallback = false

  const CONFIRM_WORD = 'Rudiment'

  $: canDelete = deleteConfirmText.toLowerCase() === CONFIRM_WORD.toLowerCase()

  async function loadAdminData() {
    const { data } = await supabase
      .from('newslabs')
      .select('trainer_id, course_id, guest_editor_id, fallback_image_url')
      .eq('course_id', courseId)
      .single()

    if (data) {
      trainerId = data.trainer_id
      displayCourseId = data.course_id
      guestEditorId = data.guest_editor_id || ''
      fallbackImageUrl = data.fallback_image_url
    }
  }

  loadAdminData()

  function startGuestEditorEdit() {
    guestEditorEditing = true
  }

  function cancelGuestEditorEdit() {
    guestEditorEditing = false
    loadAdminData()
  }

  async function saveGuestEditorId() {
    if (guestEditorSaving) return

    guestEditorSaving = true

    const { error } = await supabase
      .from('newslabs')
      .update({ 
        guest_editor_id: guestEditorId.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('course_id', courseId)

    if (error) {
      showNotification('error', 'Failed to save. Try again.')
    } else {
      showNotification('success', 'Saved')
      guestEditorEditing = false
    }

    guestEditorSaving = false
  }

  async function handleFallbackImageUpload(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    uploadingFallback = true

    try {
      const result = await uploadImage(file)
      if (result.error) {
        showNotification('error', result.error)
        return
      }

      const { error } = await supabase
        .from('newslabs')
        .update({ 
          fallback_image_url: result.url,
          updated_at: new Date().toISOString()
        })
        .eq('course_id', courseId)

      if (error) {
        showNotification('error', 'Failed to save image')
      } else {
        fallbackImageUrl = result.url
        showNotification('success', 'Fallback image uploaded')
      }
    } catch (err) {
      console.error('Upload error:', err)
      showNotification('error', 'Upload failed')
    } finally {
      uploadingFallback = false
      input.value = ''
    }
  }

  async function removeFallbackImage() {
    const { error } = await supabase
      .from('newslabs')
      .update({ 
        fallback_image_url: null,
        updated_at: new Date().toISOString()
      })
      .eq('course_id', courseId)

    if (error) {
      showNotification('error', 'Failed to remove image')
    } else {
      fallbackImageUrl = null
      showNotification('success', 'Fallback image removed')
    }
  }

  async function clearCourse() {
    if (!canDelete || deleting) return

    deleting = true

    try {
      const { error: activityError } = await supabase
        .from('activity_log')
        .delete()
        .eq('course_id', courseId)

      if (activityError) throw activityError

      const { error: storiesError } = await supabase
        .from('stories')
        .delete()
        .eq('course_id', courseId)

      if (storiesError) throw storiesError

      const { error: journalistsError } = await supabase
        .from('journalists')
        .delete()
        .eq('course_id', courseId)

      if (journalistsError) throw journalistsError

      const { error: teamsError } = await supabase
        .from('teams')
        .delete()
        .eq('course_id', courseId)

      if (teamsError) throw teamsError

      showNotification('success', 'Course cleared successfully')
      deleteConfirmText = ''
    } catch (error) {
      console.error('Clear course error:', error)
      showNotification('error', 'Failed to clear course')
    } finally {
      deleting = false
    }
  }
</script>

<div class="space-y-6">
  <!-- Trainer ID (read-only) -->
  <div>
    <label for="trainer-id" class="block text-sm text-[#777777] mb-2">Trainer ID</label>
    <div class="flex items-center gap-2">
      <div class="flex-1">
        <input
          id="trainer-id"
          type="text"
          value={trainerId}
          disabled
          class="w-full bg-[#efefef] rounded-lg px-4 py-3 text-base text-[#333] cursor-not-allowed"
        />
      </div>
      <img
        src="/icons/icon-check-fill.svg"
        alt="Set"
        class="w-5 h-5"
        style="filter: invert(18%) sepia(89%) saturate(2264%) hue-rotate(254deg) brightness(87%) contrast(97%);"
      />
    </div>
  </div>

  <!-- Course ID (read-only) -->
  <div>
    <label for="course-id" class="block text-sm text-[#777777] mb-2">Course ID</label>
    <div class="flex items-center gap-2">
      <div class="flex-1">
        <input
          id="course-id"
          type="text"
          value={displayCourseId}
          disabled
          class="w-full bg-[#efefef] rounded-lg px-4 py-3 text-base text-[#333] cursor-not-allowed"
        />
      </div>
      <img
        src="/icons/icon-check-fill.svg"
        alt="Set"
        class="w-5 h-5"
        style="filter: invert(18%) sepia(89%) saturate(2264%) hue-rotate(254deg) brightness(87%) contrast(97%);"
      />
    </div>
  </div>

  <!-- Guest Editor ID (editable) -->
  <div>
    <label for="guest-editor-id" class="block text-sm text-[#777777] mb-2">Guest editor ID</label>
    <div class="flex items-center gap-2">
      <div class="flex-1">
        <input
          id="guest-editor-id"
          type="text"
          bind:value={guestEditorId}
          on:focus={startGuestEditorEdit}
          placeholder="Enter guest editor ID..."
          class="w-full bg-[#efefef] rounded-lg px-4 py-3 text-base outline-none transition-all"
          class:ring-2={guestEditorEditing}
          class:ring-[#5422b0]={guestEditorEditing}
        />
      </div>
      {#if guestEditorId.trim()}
        <img
          src="/icons/icon-check-fill.svg"
          alt="Set"
          class="w-5 h-5"
          style="filter: invert(18%) sepia(89%) saturate(2264%) hue-rotate(254deg) brightness(87%) contrast(97%);"
        />
      {:else}
        <img
          src="/icons/icon-circle.svg"
          alt="Not set"
          class="w-5 h-5"
          style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
        />
      {/if}
    </div>

    {#if guestEditorEditing}
      <div class="flex items-center gap-2 mt-2">
        <button
          type="button"
          on:click={cancelGuestEditorEdit}
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
          on:click={saveGuestEditorId}
          disabled={guestEditorSaving}
          class="px-4 py-1 rounded-full bg-[#5422b0] text-white text-sm font-medium transition-opacity"
          class:opacity-50={guestEditorSaving}
        >
          {guestEditorSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    {/if}
  </div>

  <!-- Story Fallback Image -->
  <div>
    <span class="block text-sm text-[#777777] mb-2">Story fallback image</span>
    
    {#if fallbackImageUrl}
      <div class="relative w-24 h-24">
        <img
          src={fallbackImageUrl}
          alt="Fallback"
          class="w-full h-full object-cover rounded-lg"
        />
        <button
          type="button"
          on:click={removeFallbackImage}
          class="absolute -top-2 -right-2 w-5 h-5 bg-white rounded-full shadow flex items-center justify-center"
          aria-label="Remove image"
        >
          <img
            src="/icons/icon-close.svg"
            alt=""
            class="w-3 h-3"
            style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
          />
        </button>
      </div>
    {:else}
      <label 
        class="w-24 h-24 border-2 border-dashed border-[#777777] rounded-lg flex items-center justify-center cursor-pointer hover:border-[#5422b0] transition-colors"
        class:opacity-50={uploadingFallback}
      >
        <input
          type="file"
          accept="image/*"
          on:change={handleFallbackImageUpload}
          class="sr-only"
          disabled={uploadingFallback}
        />
        {#if uploadingFallback}
          <div class="w-6 h-6 border-2 border-[#777777] border-t-transparent rounded-full animate-spin"></div>
        {:else}
          <img
            src="/icons/icon-upload.svg"
            alt="Upload"
            class="w-6 h-6"
            style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
          />
        {/if}
      </label>
    {/if}
  </div>

  <!-- Danger Zone -->
  <div class="mt-8">
    <span class="text-sm text-[#777777]">Danger zone</span>
    
    <div class="mt-3 space-y-3">
      <div class="bg-[#d60202] text-white py-3 px-4 rounded-lg text-center text-sm font-medium">
        Delete all groups, members and stories
      </div>
      
      <input
        type="text"
        bind:value={deleteConfirmText}
        placeholder="Type the word: {CONFIRM_WORD}"
        class="w-full bg-white border-2 border-[#d60202] rounded-lg px-4 py-3 text-base outline-none"
      />
      
      <button
        type="button"
        on:click={clearCourse}
        disabled={!canDelete || deleting}
        class="w-full bg-[#d60202] text-white py-3 px-4 rounded-lg text-sm font-medium uppercase transition-opacity"
        class:opacity-50={!canDelete || deleting}
      >
        {deleting ? 'DELETING...' : 'DELETE EVERYTHING. ARE YOU SURE'}
      </button>
    </div>
  </div>
</div>
