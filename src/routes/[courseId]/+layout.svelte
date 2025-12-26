<script lang="ts">
  import { page } from '$app/stores'
  import { session, isLoggedIn } from '$lib/stores'
  import { goto } from '$app/navigation'

  $: {
    // Protect route: redirect to splash if not logged in
    if (!$isLoggedIn) {
      goto('/')
    }
  }
</script>

<slot />
