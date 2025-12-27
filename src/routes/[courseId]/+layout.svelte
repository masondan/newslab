<script lang="ts">
  import { page } from '$app/stores'
  import { session, isLoggedIn } from '$lib/stores'
  import { goto } from '$app/navigation'
  import FooterNav from '$components/FooterNav.svelte'
  import WriteDrawer from '$components/WriteDrawer.svelte'
  import StoryReaderDrawer from '$components/StoryReaderDrawer.svelte'

  $: {
    if (!$isLoggedIn) {
      goto('/')
    }
  }
</script>

<div class="min-h-screen bg-white">
  <slot />
  <FooterNav />
  <WriteDrawer />
  <StoryReaderDrawer />
</div>
