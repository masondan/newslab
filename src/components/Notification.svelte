<script lang="ts">
  import { notification, teamColors } from '../lib/stores'
</script>

{#if $notification}
  <div 
    class="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg transition-all duration-300"
    style="background-color: #{$teamColors.secondary}; color: #{$teamColors.primary}"
  >
    <p class="text-sm font-medium">{$notification.message}</p>
  </div>
{/if}
