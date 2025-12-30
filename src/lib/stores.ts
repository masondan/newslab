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

// Drawer state stores
export const writeDrawerOpen = writable(false)
export const storyReaderDrawerOpen = writable(false)
export const previewDrawerOpen = writable(false)

// Current story being viewed in StoryReaderDrawer
export const currentViewingStory = writable<{ id: string; title: string; story: import('./types').Story } | null>(null)

// Current story being edited in WriteDrawer
export interface EditingStory {
  id?: string
  title: string
  summary: string
  featuredImageUrl: string | null
  featuredImageCaption: string
  content: import('./types').ContentBlock[]
  teamName: string
  status: 'draft' | 'published'
  isDirty: boolean
  lastSaved: number | null
}

const emptyStory: EditingStory = {
  title: '',
  summary: '',
  featuredImageUrl: null,
  featuredImageCaption: '',
  content: [],
  teamName: '',
  status: 'draft',
  isDirty: false,
  lastSaved: null
}

function createEditingStoryStore() {
  const { subscribe, set, update } = writable<EditingStory>({ ...emptyStory })
  
  return {
    subscribe,
    set,
    update,
    reset: () => set({ ...emptyStory }),
    loadStory: (story: Partial<EditingStory> & { teamName: string }) => {
      set({
        ...emptyStory,
        ...story,
        isDirty: false,
        lastSaved: Date.now()
      })
    },
    markDirty: () => update(s => ({ ...s, isDirty: true })),
    markSaved: () => update(s => ({ ...s, isDirty: false, lastSaved: Date.now() }))
  }
}

export const editingStory = createEditingStoryStore()

// Team color store - derives from session's team or uses default
export const teamColors = writable<{ primary: string; secondary: string }>({
  primary: '5422b0',
  secondary: 'f0e6f7'
})

// Color palettes available for teams
export const COLOR_PALETTES = [
  { name: 'Indigo Bloom', primary: '5422b0', secondary: 'f0e6f7' },
  { name: 'Black Forest', primary: '02441f', secondary: 'f3fde7' },
  { name: 'Yale Blue', primary: '004269', secondary: 'e8f5fd' },
  { name: 'Golden Earth', primary: '935D00', secondary: 'FFF8EB' },
  { name: 'Molten Lava', primary: '801c00', secondary: 'ffedec' },
  { name: 'Inferno', primary: 'ab0000', secondary: 'ffe4e4' },
  { name: 'Graphite', primary: '333333', secondary: 'EFEFEF' }
] as const

