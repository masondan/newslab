<script lang="ts">
  import { notification } from '../lib/stores'
</script>

{#if $notification}
  <div 
    class="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg transition-all duration-300"
    class:bg-green-600={$notification.type === 'success'}
    class:bg-red-600={$notification.type === 'error'}
    class:bg-accent-brand={$notification.type === 'info'}
  >
    <p class="text-white text-sm font-medium">{$notification.message}</p>
  </div>
{/if}
