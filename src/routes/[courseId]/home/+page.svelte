<script lang="ts">
  import { session } from '$lib/stores'
  import { goto } from '$app/navigation'

  function handleLogout() {
    session.logout()
    goto('/')
  }
</script>

<svelte:head>
  <title>NewsLab - Home</title>
</svelte:head>

<div class="min-h-screen bg-bg-main flex flex-col">
  <!-- Header placeholder -->
  <header class="px-4 py-3 border-b border-color-separator">
    <div class="flex items-center justify-between">
      <h1 class="text-h2 font-bold text-text-primary">Home</h1>
      <button 
        on:click={handleLogout}
        class="text-sm text-accent-brand"
      >
        Logout
      </button>
    </div>
  </header>

  <!-- Main content area -->
  <main class="flex-1 p-4">
    <div class="space-y-4">
      <!-- Tabs placeholder -->
      <div class="flex border-b border-color-separator">
        <button class="px-4 py-2 text-accent-brand border-b-2 border-accent-brand font-medium">
          Drafts
        </button>
        <button class="px-4 py-2 text-text-secondary">
          Published
        </button>
      </div>

      <!-- Empty state -->
      <div class="text-center py-12">
        <p class="text-text-secondary">Nothing to show.</p>
        <p class="text-text-secondary text-sm mt-2">
          First, create or join a team in Settings. Then start writing.
        </p>
      </div>
    </div>
  </main>

  <!-- Footer nav placeholder -->
  <footer class="border-t border-color-separator bg-bg-main px-4 py-2">
    <div class="flex items-center justify-around">
      <button class="p-2">
        <img src="/icons/icon-user-fill.svg" alt="Home" class="w-6 h-6" style="filter: invert(18%) sepia(89%) saturate(2264%) hue-rotate(254deg) brightness(87%) contrast(97%);" />
      </button>
      <button class="relative -mt-4 w-14 h-14 rounded-full bg-accent-brand flex items-center justify-center shadow-lg">
        <img src="/icons/icon-newstory.svg" alt="Write" class="w-6 h-6" style="filter: brightness(0) invert(1);" />
      </button>
      <button class="p-2">
        <img src="/icons/icon-group.svg" alt="Team" class="w-6 h-6 opacity-50" />
      </button>
      <button class="p-2">
        <img src="/icons/icon-settings.svg" alt="Settings" class="w-6 h-6 opacity-50" />
      </button>
    </div>
  </footer>
</div>
