<script lang="ts">
  import { fly } from 'svelte/transition'
  import { createEventDispatcher } from 'svelte'

  export let lockedBy: string

  const dispatch = createEventDispatcher()
</script>

<div
  class="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
  transition:fly={{ y: 20, duration: 200 }}
>
  <div class="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-xl">
    <div class="w-12 h-12 mx-auto mb-4 rounded-full bg-[#f0e6f7] flex items-center justify-center">
      <img src="/icons/icon-edit.svg" alt="" class="w-6 h-6" style="filter: invert(14%) sepia(95%) saturate(3500%) hue-rotate(256deg) brightness(75%) contrast(90%);" />
    </div>
    
    <h2 class="text-lg font-semibold text-[#333333] mb-2">Story Locked</h2>
    
    <p class="text-[#777777] mb-6">
      This story is being edited by <span class="font-medium text-[#333333]">{lockedBy}</span>. 
      Please try again later.
    </p>

    <button
      on:click={() => dispatch('goback')}
      class="w-full py-3 rounded-full text-white font-medium"
      style="background-color: #5422b0;"
    >
      Go Back
    </button>
  </div>
</div>
