import { writable, derived } from 'svelte/store'
import type { Session } from './types'

const STORAGE_KEY = 'newslab_session'

function createSessionStore() {
  // Initialize from localStorage (browser only)
  let initial: Session | null = null
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY)
    initial = stored ? JSON.parse(stored) : null
  }
  
  const { subscribe, set, update } = writable<Session | null>(initial)
  
  return {
    subscribe,
    set: (session: Session | null) => {
      if (typeof window !== 'undefined') {
        if (session) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
        } else {
          localStorage.removeItem(STORAGE_KEY)
        }
      }
      set(session)
    },
    update,
    logout: () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY)
      }
      set(null)
    }
  }
}

export const session = createSessionStore()

export const isLoggedIn = derived(session, $session => !!$session?.courseId && !!$session?.name)
export const isTrainer = derived(session, $session => $session?.role === 'trainer')
export const isGuestEditor = derived(session, $session => $session?.role === 'guest_editor')
export const isJournalist = derived(session, $session => $session?.role === 'journalist')

export const notification = writable<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

export function showNotification(type: 'success' | 'error' | 'info', message: string, duration = 2000) {
  notification.set({ type, message })
  setTimeout(() => notification.set(null), duration)
}

