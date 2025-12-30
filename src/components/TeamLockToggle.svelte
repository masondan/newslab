<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  export let locked: boolean = false
  export let disabled: boolean = false
  export let primaryColor: string = '5422b0'

  const dispatch = createEventDispatcher<{ toggle: { locked: boolean } }>()

  function handleToggle() {
    if (disabled) return
    dispatch('toggle', { locked: !locked })
  }
</script>

<div class="space-y-3">
  <div class="flex items-center justify-between pb-1 border-b border-[#e0e0e0]">
    <span class="text-sm text-[#777777]">Team lock</span>

    <button
      type="button"
      on:click={handleToggle}
      disabled={disabled}
      class="relative w-12 h-6 rounded-full transition-colors duration-200"
      class:cursor-not-allowed={disabled}
      class:opacity-50={disabled}
      style="background-color: {locked ? `#${primaryColor}` : '#ccc'};"
      role="switch"
      aria-checked={locked}
      aria-label="Lock team"
    >
      <span
        class="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"
        style="left: {locked ? '28px' : '4px'};"
      ></span>
    </button>
  </div>

  <p class="text-sm text-[#999999]">This prevents others from joining your group.</p>
</div>
