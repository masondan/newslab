<script lang="ts">
  import { page } from '$app/stores'
  import { session, writeDrawerOpen, teamColors } from '$lib/stores'

  $: courseId = $session?.courseId || ''
  $: currentPath = $page.url.pathname

  $: isHomePage = currentPath.endsWith('/home')
  $: isStreamPage = currentPath.endsWith('/stream')
  $: isSettingsPage = currentPath.endsWith('/settings')

  function openWriteDrawer() {
    writeDrawerOpen.set(true)
  }

  // Convert hex color to CSS filter
  function hexToFilter(hex: string): string {
    // For team colors, use a generic color filter approach
    // The purple filter: invert(18%) sepia(89%) saturate(2264%) hue-rotate(254deg) brightness(87%) contrast(97%)
    // We'll use a simpler approach: just set the color directly with background
    return `#${hex}`
  }
</script>

<footer class="fixed bottom-0 left-1/2 -translate-x-1/2 max-w-[480px] w-full bg-white z-40 md:shadow-2xl md:rounded-t-lg">
  <div class="border-t border-[#777777]">
    <nav class="flex items-center h-[50px] px-3">
      <!-- Center Section: Home & Write & Stream -->
      <div class="flex-1 flex items-center justify-center">
        <!-- User Home -->
        <a
          href="/{courseId}/home"
          class="flex items-center justify-center px-2"
          aria-label="Home"
        >
          {#if isHomePage}
              <div class="w-6 h-6" style="background-color: #{$teamColors.primary}; -webkit-mask-image: url('/icons/icon-user-fill.svg'); mask-image: url('/icons/icon-user-fill.svg'); -webkit-mask-size: contain; mask-size: contain;"></div>
          {:else}
            <img
              src="/icons/icon-user.svg"
              alt=""
              class="w-6 h-6"
              style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
            />
          {/if}
        </a>

        <!-- Write Button (center, overlaps top border) -->
        <button
          on:click={openWriteDrawer}
          class="flex items-center justify-center mx-2 -mt-5"
          aria-label="Write new story"
        >
          <div class="w-14 h-14" style="background-color: #{$teamColors.primary}; -webkit-mask-image: url('/icons/icon-newstory.svg'); mask-image: url('/icons/icon-newstory.svg'); -webkit-mask-size: contain; mask-size: contain;"></div>
        </button>

        <!-- Team Stream -->
        <a
          href="/{courseId}/stream"
          class="flex items-center justify-center px-2"
          aria-label="Team Stream"
        >
          {#if isStreamPage}
            <div class="w-6 h-6" style="background-color: #{$teamColors.primary}; -webkit-mask-image: url('/icons/icon-group-fill.svg'); mask-image: url('/icons/icon-group-fill.svg'); -webkit-mask-size: contain; mask-size: contain;"></div>
          {:else}
            <img
              src="/icons/icon-group.svg"
              alt=""
              class="w-6 h-6"
              style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
            />
          {/if}
        </a>
      </div>

      <!-- Settings (far right) -->
      <a
        href="/{courseId}/settings"
        class="flex items-center justify-center w-6"
        aria-label="Settings"
      >
        {#if isSettingsPage}
          <div class="w-6 h-6" style="background-color: #{$teamColors.primary}; -webkit-mask-image: url('/icons/icon-settings-fill.svg'); mask-image: url('/icons/icon-settings-fill.svg'); -webkit-mask-size: contain; mask-size: contain;"></div>
        {:else}
          <img
            src="/icons/icon-settings.svg"
            alt=""
            class="w-6 h-6"
            style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
          />
        {/if}
      </a>
    </nav>
  </div>
</footer>
