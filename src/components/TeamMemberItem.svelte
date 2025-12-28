<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  export let name: string
  export let isEditor: boolean = false
  export let isCurrentUser: boolean = false
  export let canRemove: boolean = false
  export let canToggleEditor: boolean = false
  export let primaryColor: string = '5422b0'
  export let secondaryColor: string = 'f0e6f7'
  export let isConfirmingLeave: boolean = false
  export let isLeaving: boolean = false
  export let isConfirmingEditorToggle: boolean = false
  export let isTogglingEditor: boolean = false

  const dispatch = createEventDispatcher<{
    remove: { name: string }
    startLeave: { name: string }
    confirmLeave: { name: string }
    cancelLeave: void
    startEditorToggle: { name: string; willBeEditor: boolean }
    confirmEditorToggle: { name: string; willBeEditor: boolean }
    cancelEditorToggle: void
  }>()

  function handleRemoveClick() {
    dispatch('startLeave', { name })
  }

  function handleConfirmLeave() {
    dispatch('confirmLeave', { name })
  }

  function handleCancelLeave() {
    dispatch('cancelLeave')
  }

  function handleEditorClick() {
    if (!canToggleEditor) return
    dispatch('startEditorToggle', { name, willBeEditor: !isEditor })
  }

  function handleConfirmEditorToggle() {
    dispatch('confirmEditorToggle', { name, willBeEditor: !isEditor })
  }

  function handleCancelEditorToggle() {
    dispatch('cancelEditorToggle')
  }

  $: isHighlighted = isConfirmingLeave || isConfirmingEditorToggle
  $: isDisabled = isConfirmingLeave || isConfirmingEditorToggle
</script>

<div class="border-b border-[#e0e0e0]">
  <!-- Name row with conditional background -->
  <div 
    class="flex items-center py-3 transition-colors"
    style={isHighlighted ? `background-color: #${secondaryColor};` : ''}
  >
    {#if canRemove}
      <button
        type="button"
        on:click={handleRemoveClick}
        class="mr-3 flex-shrink-0"
        aria-label="Remove {name} from team"
        disabled={isDisabled}
      >
        <img
          src="/icons/icon-close.svg"
          alt=""
          class="w-4 h-4"
          style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
        />
      </button>
    {:else}
      <div class="w-4 mr-3"></div>
    {/if}

    <span class="flex-1 text-base text-[#333333]">
      {name}{isCurrentUser ? ' (you)' : ''}
    </span>

    <button
      type="button"
      on:click={handleEditorClick}
      disabled={!canToggleEditor || isDisabled}
      class="flex-shrink-0"
      class:cursor-not-allowed={!canToggleEditor}
      class:opacity-50={!canToggleEditor || isDisabled}
      aria-label={isEditor ? 'Remove editor status' : 'Make editor'}
    >
      {#if isEditor}
        <img
          src="/icons/icon-check.svg"
          alt="Editor"
          class="w-5 h-5"
          style="filter: invert(18%) sepia(89%) saturate(2264%) hue-rotate(254deg) brightness(87%) contrast(97%);"
        />
      {:else}
        <img
          src="/icons/icon-circle.svg"
          alt="Not editor"
          class="w-5 h-5"
          style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
        />
      {/if}
    </button>
  </div>

  <!-- Leave team toolbar (LEFT-aligned) -->
  {#if isConfirmingLeave}
    <div class="flex justify-start mt-3 pb-3">
      <div 
        class="flex items-center rounded-full px-4 py-2 text-white text-sm font-medium"
        style="background-color: #{primaryColor};"
      >
        <button
          type="button"
          on:click={handleConfirmLeave}
          disabled={isLeaving}
          class="transition-opacity"
          class:opacity-50={isLeaving}
        >
          {#if isLeaving}
            {isCurrentUser ? 'Leaving...' : 'Removing...'}
          {:else}
            {isCurrentUser ? 'Leave team' : 'Remove'}
          {/if}
        </button>
        <span class="mx-3 opacity-60">|</span>
        <button
          type="button"
          on:click={handleCancelLeave}
          disabled={isLeaving}
          class="transition-opacity hover:opacity-80"
        >
          Cancel
        </button>
      </div>
    </div>
  {/if}

  <!-- Editor toggle toolbar (RIGHT-aligned) -->
  {#if isConfirmingEditorToggle}
    <div class="flex justify-end mt-3 pb-3">
      <div 
        class="flex items-center rounded-full px-4 py-2 text-white text-sm font-medium"
        style="background-color: #{primaryColor};"
      >
        <button
          type="button"
          on:click={handleConfirmEditorToggle}
          disabled={isTogglingEditor}
          class="transition-opacity"
          class:opacity-50={isTogglingEditor}
        >
          {#if isTogglingEditor}
            {isEditor ? 'Removing...' : 'Adding...'}
          {:else}
            {isEditor ? 'Remove editor' : 'Add editor'}
          {/if}
        </button>
        <span class="mx-3 opacity-60">|</span>
        <button
          type="button"
          on:click={handleCancelEditorToggle}
          disabled={isTogglingEditor}
          class="transition-opacity hover:opacity-80"
        >
          Cancel
        </button>
      </div>
    </div>
  {/if}
</div>
