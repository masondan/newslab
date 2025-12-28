<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  export let name: string
  export let isEditor: boolean = false
  export let isCurrentUser: boolean = false
  export let canRemove: boolean = false
  export let canToggleEditor: boolean = false
  export let primaryColor: string = '5422b0'

  const dispatch = createEventDispatcher<{
    remove: { name: string }
    toggleEditor: { name: string; isEditor: boolean }
  }>()

  function handleRemove() {
    dispatch('remove', { name })
  }

  function handleToggleEditor() {
    if (!canToggleEditor) return
    dispatch('toggleEditor', { name, isEditor: !isEditor })
  }
</script>

<div class="flex items-center py-3 border-b border-[#e0e0e0]">
  {#if canRemove}
    <button
      type="button"
      on:click={handleRemove}
      class="mr-3 flex-shrink-0"
      aria-label="Remove {name} from team"
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
    on:click={handleToggleEditor}
    disabled={!canToggleEditor}
    class="flex-shrink-0"
    class:cursor-not-allowed={!canToggleEditor}
    class:opacity-50={!canToggleEditor}
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
