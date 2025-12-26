<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { fly } from 'svelte/transition'
  import {
    writeDrawerOpen,
    previewDrawerOpen,
    editingStory,
    session,
    teamColors,
    showNotification
  } from '$lib/stores'
  import { uploadImage, getOptimizedUrl } from '$lib/cloudinary'
  import { createStory, updateStory, publishStory, acquireLock, releaseLock, refreshLock } from '$lib/stories'
  import { logActivity } from '$lib/activity'
  import type { ContentBlock } from '$lib/types'
  import YouTubeModal from './YouTubeModal.svelte'
  import LinkModal from './LinkModal.svelte'
  import PreviewDrawer from './PreviewDrawer.svelte'
  import LockWarning from './LockWarning.svelte'

  let title = ''
  let featuredImageUrl: string | null = null
  let featuredImageCaption = ''
  let contentBlocks: ContentBlock[] = []
  let editorElement: HTMLDivElement
  let fileInput: HTMLInputElement
  let imageFileInput: HTMLInputElement

  let showYouTubeModal = false
  let showLinkModal = false
  let selectedText = ''

  let showPublishToolbar = false
  let showSaveToolbar = false
  let saving = false
  let lastSavedTime: number | null = null
  let autoSaveTimer: ReturnType<typeof setTimeout> | null = null

  let isBoldActive = false
  let isHeadingActive = false
  let isLinkActive = false
  
  // Store selection/range before opening modals
  let savedRange: Range | null = null

  // Lock state
  let isLocked = false
  let lockedBy: string | null = null
  let lockRefreshTimer: ReturnType<typeof setInterval> | null = null

  const AUTOSAVE_DELAY = 3000
  const LOCK_REFRESH_INTERVAL = 60 * 1000 // Refresh lock every minute

  $: wordCount = countWords()
  $: canPublish = title.trim().length > 0 && !!$session?.teamName
  $: isEditingExisting = !!$editingStory.id
  $: isPublishedStory = $editingStory.status === 'published'

  // Reset state when drawer opens
  $: if ($writeDrawerOpen) {
    initializeDrawer()
  }

  async function initializeDrawer() {
    const story = $editingStory
    
    // Reset lock state
    isLocked = false
    lockedBy = null
    clearLockRefreshTimer()
    
    if (story.id) {
      // Editing existing story - try to acquire lock
      if ($session) {
        const lockResult = await acquireLock(story.id, $session.name)
        if (!lockResult.success) {
          // Story is locked by someone else
          isLocked = true
          lockedBy = lockResult.error?.replace('Story is being edited by ', '') || 'another user'
        } else {
          // Lock acquired - start refresh timer
          startLockRefreshTimer(story.id)
        }
      }
      
      // Load story data
      title = story.title
      featuredImageUrl = story.featuredImageUrl
      featuredImageCaption = story.featuredImageCaption
      contentBlocks = [...story.content]
      lastSavedTime = story.lastSaved
    } else {
      // New story - always blank
      title = ''
      featuredImageUrl = null
      featuredImageCaption = ''
      contentBlocks = []
      lastSavedTime = null
    }
    showPublishToolbar = false
    saving = false
    // Clear editor after DOM updates
    setTimeout(() => {
      if (editorElement) {
        if (story.id && contentBlocks.length > 0) {
          renderContentToEditor()
        } else {
          editorElement.innerHTML = ''
        }
      }
    }, 0)
  }

  function startLockRefreshTimer(storyId: string) {
    if (lockRefreshTimer) clearInterval(lockRefreshTimer)
    lockRefreshTimer = setInterval(async () => {
      if ($session) {
        await refreshLock(storyId, $session.name)
      }
    }, LOCK_REFRESH_INTERVAL)
  }

  function clearLockRefreshTimer() {
    if (lockRefreshTimer) {
      clearInterval(lockRefreshTimer)
      lockRefreshTimer = null
    }
  }

  onMount(() => {
    document.addEventListener('selectionchange', handleSelectionChange)
  })

  onDestroy(() => {
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
    clearLockRefreshTimer()
    document.removeEventListener('selectionchange', handleSelectionChange)
  })

  function handleSelectionChange() {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      isBoldActive = false
      isHeadingActive = false
      isLinkActive = false
      return
    }

    const range = selection.getRangeAt(0)
    if (!editorElement?.contains(range.commonAncestorContainer)) {
      isBoldActive = false
      isHeadingActive = false
      isLinkActive = false
      return
    }

    // Reset states
    isHeadingActive = false
    isBoldActive = false
    isLinkActive = false

    // Walk up the DOM tree to check for heading, bold, or link
    let node: Node | null = range.commonAncestorContainer
    
    while (node && node !== editorElement) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement
        const tagName = el.tagName.toLowerCase()
        
        if (tagName === 'h2') {
          isHeadingActive = true
          // Headings are never bold - exit immediately
          isBoldActive = false
          return
        }
        if (tagName === 'strong' || tagName === 'b') {
          isBoldActive = true
        }
        if (tagName === 'a') {
          isLinkActive = true
        }
      }
      node = node.parentNode
    }

    // Also check via queryCommandState for bold (only if not in heading)
    if (!isBoldActive) {
      isBoldActive = document.queryCommandState('bold')
    }
  }

  function countWords(): number {
    let text = title + ' '
    contentBlocks.forEach(block => {
      if (block.text) text += block.text + ' '
      if (block.items) text += block.items.join(' ') + ' '
    })
    const words = text.trim().split(/\s+/).filter(w => w.length > 0)
    return words.length
  }

  function renderContentToEditor() {
    if (!editorElement) return
    editorElement.innerHTML = ''
    contentBlocks.forEach(block => {
      const el = createBlockElement(block)
      if (el) editorElement.appendChild(el)
    })
  }

  function createBlockElement(block: ContentBlock): HTMLElement | null {
    switch (block.type) {
      case 'paragraph':
        const p = document.createElement('p')
        p.textContent = block.text || ''
        p.className = 'mb-4'
        return p
      case 'heading':
        const h2 = document.createElement('h2')
        h2.textContent = block.text || ''
        h2.className = 'text-xl font-bold my-4'
        return h2
      case 'bold':
        const strong = document.createElement('p')
        strong.innerHTML = `<strong>${block.text || ''}</strong>`
        strong.className = 'mb-4'
        return strong
      case 'separator':
        const hr = document.createElement('hr')
        hr.className = 'w-1/2 mx-auto my-4 border-[#777777]'
        return hr
      case 'image':
        const figure = document.createElement('figure')
        figure.className = 'image-figure relative mt-4 mb-2'
        figure.contentEditable = 'false'
        
        const imgWrapper = document.createElement('div')
        imgWrapper.className = 'relative'
        
        const imgEl = document.createElement('img')
        imgEl.src = getOptimizedUrl(block.url || '')
        imgEl.alt = ''
        imgEl.className = 'w-full rounded-lg'
        
        const imgDeleteBtn = document.createElement('button')
        imgDeleteBtn.className = 'delete-media absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors'
        imgDeleteBtn.setAttribute('aria-label', 'Remove image')
        imgDeleteBtn.innerHTML = '<img src="/icons/icon-close.svg" alt="" class="w-3 h-3 invert" />'
        imgDeleteBtn.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          figure.remove()
          handleEditorInput()
          scheduleAutoSave()
        })
        
        imgWrapper.appendChild(imgEl)
        imgWrapper.appendChild(imgDeleteBtn)
        
        const captionInput = document.createElement('input')
        captionInput.type = 'text'
        captionInput.value = block.caption || ''
        captionInput.placeholder = 'Tap to add caption'
        captionInput.className = 'w-full text-sm text-center text-[#777777] mt-2 mb-2 outline-none placeholder:text-[#999999] bg-transparent'
        captionInput.dataset.imageUrl = block.url || ''
        captionInput.addEventListener('input', () => {
          handleEditorInput()
          scheduleAutoSave()
        })
        
        figure.appendChild(imgWrapper)
        figure.appendChild(captionInput)
        return figure
      case 'youtube':
        const videoDiv = document.createElement('div')
        videoDiv.className = 'youtube-embed relative mb-4 aspect-video bg-[#efefef] rounded-lg'
        videoDiv.contentEditable = 'false'
        const videoId = extractYouTubeId(block.url || '')
        videoDiv.innerHTML = `
          <iframe 
            src="https://www.youtube.com/embed/${videoId}" 
            class="w-full h-full rounded-lg"
            frameborder="0" 
            allowfullscreen
          ></iframe>
          <button 
            class="delete-media absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
            aria-label="Remove video"
          >
            <img src="/icons/icon-close.svg" alt="" class="w-3 h-3 invert" />
          </button>
        `
        videoDiv.dataset.youtubeUrl = block.url || ''
        if (block.thumbnailUrl) videoDiv.dataset.thumbnailUrl = block.thumbnailUrl
        
        // Add delete handler
        const vidDeleteBtn = videoDiv.querySelector('.delete-media')
        vidDeleteBtn?.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          videoDiv.remove()
          handleEditorInput()
          scheduleAutoSave()
        })
        
        return videoDiv
      case 'link':
        const linkP = document.createElement('p')
        linkP.innerHTML = `<a href="${block.url}" target="_blank" style="color: #${block.color || $teamColors.primary}; text-decoration: none;">${block.text}</a>`
        linkP.className = 'mb-4'
        return linkP
      default:
        return null
    }
  }

  function extractYouTubeId(url: string): string {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)
    return match ? match[1] : ''
  }

  function parseEditorContent(): ContentBlock[] {
    if (!editorElement) return []
    const blocks: ContentBlock[] = []
    
    editorElement.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim()
        if (text) {
          blocks.push({ type: 'paragraph', text })
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement
        const tagName = el.tagName.toLowerCase()
        
        if (tagName === 'p') {
          // Check if paragraph contains only bold text
          const strong = el.querySelector('strong, b')
          const link = el.querySelector('a')
          
          if (strong && el.textContent === strong.textContent) {
            // Entire paragraph is bold
            blocks.push({ type: 'bold', text: strong.textContent || '' })
          } else if (link && el.textContent === link.textContent) {
            blocks.push({
              type: 'link',
              text: link.textContent || '',
              url: link.getAttribute('href') || '',
              color: $teamColors.primary
            })
          } else {
            // Mixed content or plain text - save as paragraph with HTML preserved
            const text = el.textContent?.trim()
            if (text) blocks.push({ type: 'paragraph', text })
          }
        } else if (tagName === 'h2') {
          blocks.push({ type: 'heading', text: el.textContent || '' })
        } else if (tagName === 'hr') {
          blocks.push({ type: 'separator' })
        } else if (tagName === 'strong' || tagName === 'b') {
          // Standalone bold element (not wrapped in p)
          const text = el.textContent?.trim()
          if (text) blocks.push({ type: 'bold', text })
        } else if (tagName === 'figure') {
          const img = el.querySelector('img')
          const captionEl = el.querySelector('figcaption')
          const captionInput = el.querySelector('input') as HTMLInputElement | null
          if (img) {
            blocks.push({
              type: 'image',
              url: captionInput?.dataset.imageUrl || img.src,
              caption: captionInput?.value || captionEl?.textContent || ''
            })
          }
        } else if (tagName === 'div') {
          // Check for YouTube iframe or placeholder
          if (el.classList.contains('image-placeholder')) {
            // Skip loading placeholder
          } else if (el.classList.contains('youtube-embed')) {
            // YouTube embed with delete button
            const youtubeUrl = el.dataset.youtubeUrl
            const thumbnailUrl = el.dataset.thumbnailUrl
            if (youtubeUrl) {
              blocks.push({ 
                type: 'youtube', 
                url: youtubeUrl,
                thumbnailUrl: thumbnailUrl || undefined
              })
            }
          } else {
            const iframe = el.querySelector('iframe')
            if (iframe) {
              const src = iframe.src
              if (src.includes('youtube')) {
                blocks.push({ type: 'youtube', url: src })
              }
            }
          }
        } else if (tagName === 'br') {
          // Skip line breaks
        } else {
          // Fallback: treat unknown elements as paragraphs
          const text = el.textContent?.trim()
          if (text) blocks.push({ type: 'paragraph', text })
        }
      }
    })
    
    return blocks
  }

  function handleEditorInput() {
    contentBlocks = parseEditorContent()
    scheduleAutoSave()
  }

  function handleEditorPaste(event: ClipboardEvent) {
    event.preventDefault()
    const text = event.clipboardData?.getData('text/plain') || ''
    document.execCommand('insertText', false, text)
  }

  function scheduleAutoSave() {
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
    autoSaveTimer = setTimeout(saveToDatabase, AUTOSAVE_DELAY)
    saveToLocalStorage()
  }

  function saveToLocalStorage() {
    if (!$session) return
    const key = `draft_${$session.courseId}_${$editingStory.id || 'new'}`
    const data = {
      title,
      featuredImageUrl,
      featuredImageCaption,
      contentBlocks,
      savedAt: Date.now()
    }
    localStorage.setItem(key, JSON.stringify(data))
  }

  async function saveToDatabase(): Promise<string | null> {
    if (!$session || !title.trim()) return null
    saving = true

    const storyData = {
      title,
      summary: '',
      featuredImageUrl,
      content: { blocks: contentBlocks },
      teamName: $session.teamName || 'Unassigned'
    }

    let storyId: string | null = $editingStory.id || null

    try {
      if ($editingStory.id) {
        const result = await updateStory($editingStory.id, storyData)
        if (result.error) throw new Error(result.error)
        storyId = $editingStory.id
      } else {
        const result = await createStory({
          courseId: $session.courseId,
          teamName: $session.teamName || 'Unassigned',
          authorName: $session.name,
          title,
          summary: '',
          featuredImageUrl,
          content: { blocks: contentBlocks },
          status: 'draft'
        })
        if (result.error) throw new Error(result.error)
        if (result.data) {
          storyId = result.data.id
          editingStory.update(s => ({ ...s, id: result.data!.id }))
        }
      }
      lastSavedTime = Date.now()
      editingStory.markSaved()
    } catch (err) {
      console.error('Save failed:', err)
      saving = false
      return null
    }
    saving = false
    return storyId
  }

  async function handleImageUpload(event: Event) {
    const input = event.target as HTMLInputElement
    if (!input.files?.length) return

    const file = input.files[0]
    try {
      const result = await uploadImage(file)
      featuredImageUrl = result.url
      scheduleAutoSave()
    } catch {
      showNotification('error', 'Failed to upload image')
    }
    input.value = ''
  }

  async function handleInlineImageUpload(event: Event) {
    const input = event.target as HTMLInputElement
    if (!input.files?.length) return

    const file = input.files[0]
    
    // Save cursor position before upload
    const selection = window.getSelection()
    let insertRange: Range | null = null
    if (selection && selection.rangeCount > 0 && editorElement?.contains(selection.anchorNode)) {
      insertRange = selection.getRangeAt(0).cloneRange()
    }
    
    // Create placeholder with loading spinner
    const placeholder = document.createElement('div')
    placeholder.className = 'image-placeholder mt-4 mb-2 aspect-video bg-[#efefef] rounded-lg flex items-center justify-center animate-pulse'
    placeholder.contentEditable = 'false'
    placeholder.innerHTML = `
      <div class="flex flex-col items-center gap-2 text-[#999999]">
        <svg class="w-8 h-8 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="text-sm">Uploading...</span>
      </div>
    `
    
    // Insert placeholder at cursor or end
    if (insertRange && editorElement?.contains(insertRange.commonAncestorContainer)) {
      insertRange.insertNode(placeholder)
    } else if (editorElement) {
      editorElement.appendChild(placeholder)
    }
    
    try {
      const result = await uploadImage(file)
      
      // Create figure element with editable caption and delete button
      const figure = document.createElement('figure')
      figure.className = 'image-figure relative mt-4 mb-2'
      figure.contentEditable = 'false'
      
      const imgWrapper = document.createElement('div')
      imgWrapper.className = 'relative'
      
      const img = document.createElement('img')
      img.src = getOptimizedUrl(result.url)
      img.alt = ''
      img.className = 'w-full rounded-lg opacity-0 transition-opacity duration-300'
      img.onload = () => {
        img.classList.remove('opacity-0')
        img.classList.add('opacity-100')
      }
      
      const deleteBtn = document.createElement('button')
      deleteBtn.className = 'delete-media absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors'
      deleteBtn.setAttribute('aria-label', 'Remove image')
      deleteBtn.innerHTML = '<img src="/icons/icon-close.svg" alt="" class="w-3 h-3 invert" />'
      deleteBtn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        figure.remove()
        handleEditorInput()
        scheduleAutoSave()
      })
      
      imgWrapper.appendChild(img)
      imgWrapper.appendChild(deleteBtn)
      
      const captionInput = document.createElement('input')
      captionInput.type = 'text'
      captionInput.placeholder = 'Tap to add caption'
      captionInput.className = 'w-full text-sm text-center text-[#777777] mt-2 mb-2 outline-none placeholder:text-[#999999] bg-transparent'
      captionInput.dataset.imageUrl = result.url
      captionInput.addEventListener('input', () => {
        handleEditorInput()
        scheduleAutoSave()
      })
      
      figure.appendChild(imgWrapper)
      figure.appendChild(captionInput)
      
      // Replace placeholder with actual image
      placeholder.replaceWith(figure)
      
      handleEditorInput()
      scheduleAutoSave()
    } catch {
      placeholder.remove()
      showNotification('error', 'Failed to upload image')
    }
    input.value = ''
  }

  function insertHeading() {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    
    const range = selection.getRangeAt(0)
    
    // Check if we're already in a heading - if so, convert back to paragraph
    let node: Node | null = range.commonAncestorContainer
    let h2Element: HTMLElement | null = null
    
    while (node && node !== editorElement) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement
        if (el.tagName.toLowerCase() === 'h2') {
          h2Element = el
          break
        }
      }
      node = node.parentNode
    }
    
    if (h2Element) {
      // Convert heading back to paragraph
      const p = document.createElement('p')
      p.textContent = h2Element.textContent || ''
      p.className = 'mb-4'
      h2Element.replaceWith(p)
      
      // Restore selection in the new paragraph
      const newRange = document.createRange()
      newRange.selectNodeContents(p)
      selection.removeAllRanges()
      selection.addRange(newRange)
    } else {
      // Convert selected text to heading
      const existingText = selection.toString().trim()
      const h2 = document.createElement('h2')
      h2.textContent = existingText || 'Subhead'
      h2.className = 'text-xl font-bold my-4'
      
      if (existingText) {
        selection.deleteFromDocument()
      }
      
      range.insertNode(h2)
      
      // If we inserted placeholder text, select it so user can type to replace
      if (!existingText) {
        const newRange = document.createRange()
        newRange.selectNodeContents(h2)
        selection.removeAllRanges()
        selection.addRange(newRange)
      }
    }
    
    handleEditorInput()
  }

  function insertBold() {
    // Check if we're in a heading - if so, do nothing
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    let node: Node | null = selection.getRangeAt(0).commonAncestorContainer
    while (node && node !== editorElement) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement
        if (el.tagName.toLowerCase() === 'h2') {
          return // Don't apply bold to headings
        }
      }
      node = node.parentNode
    }

    document.execCommand('bold', false)
    handleEditorInput()
  }

  function insertSeparator() {
    const hr = document.createElement('hr')
    hr.className = 'w-1/2 mx-auto my-4 border-[#777777]'
    
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      range.insertNode(hr)
    } else if (editorElement) {
      editorElement.appendChild(hr)
    }
    
    handleEditorInput()
  }

  function openYouTubeModal() {
    // Save current selection/range before opening modal
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0 && editorElement?.contains(selection.anchorNode)) {
      savedRange = selection.getRangeAt(0).cloneRange()
    } else {
      savedRange = null
    }
    showYouTubeModal = true
  }

  function handleYouTubeAdd(event: CustomEvent<{ url: string; thumbnailUrl?: string }>) {
    const { url, thumbnailUrl } = event.detail
    const videoId = extractYouTubeId(url)
    
    // Create YouTube embed element
    const videoDiv = document.createElement('div')
    videoDiv.className = 'youtube-embed relative mb-4 aspect-video bg-[#efefef] rounded-lg'
    videoDiv.contentEditable = 'false'
    videoDiv.innerHTML = `
      <iframe 
        src="https://www.youtube.com/embed/${videoId}" 
        class="w-full h-full rounded-lg"
        frameborder="0" 
        allowfullscreen
      ></iframe>
      <button 
        class="delete-media absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
        aria-label="Remove video"
      >
        <img src="/icons/icon-close.svg" alt="" class="w-3 h-3 invert" />
      </button>
    `
    videoDiv.dataset.youtubeUrl = url
    if (thumbnailUrl) videoDiv.dataset.thumbnailUrl = thumbnailUrl
    
    // Add delete handler
    const deleteBtn = videoDiv.querySelector('.delete-media')
    deleteBtn?.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      videoDiv.remove()
      handleEditorInput()
      scheduleAutoSave()
    })
    
    // Insert at saved cursor position or end
    if (savedRange && editorElement?.contains(savedRange.commonAncestorContainer)) {
      savedRange.insertNode(videoDiv)
      savedRange.setStartAfter(videoDiv)
      savedRange.collapse(true)
    } else if (editorElement) {
      editorElement.appendChild(videoDiv)
    }
    
    savedRange = null
    handleEditorInput()
    scheduleAutoSave()
    showYouTubeModal = false
  }

  function openLinkModal() {
    const selection = window.getSelection()
    selectedText = selection?.toString() || ''
    
    // Save current selection/range before opening modal
    if (selection && selection.rangeCount > 0 && editorElement?.contains(selection.anchorNode)) {
      savedRange = selection.getRangeAt(0).cloneRange()
    } else {
      savedRange = null
    }
    showLinkModal = true
  }

  function handleLinkAdd(event: CustomEvent<{ text: string; url: string; color: string }>) {
    const { text, url, color } = event.detail
    
    // Create link element
    const link = document.createElement('a')
    link.href = url
    link.target = '_blank'
    link.style.color = `#${color}`
    link.style.textDecoration = 'none'
    link.textContent = text
    
    // If we have a saved range with selected text, replace it
    if (savedRange && editorElement?.contains(savedRange.commonAncestorContainer)) {
      // Delete any selected content first
      savedRange.deleteContents()
      savedRange.insertNode(link)
      savedRange.setStartAfter(link)
      savedRange.collapse(true)
      
      // Restore selection
      const selection = window.getSelection()
      if (selection) {
        selection.removeAllRanges()
        selection.addRange(savedRange)
      }
    } else if (editorElement) {
      // Insert at end as fallback
      const p = document.createElement('p')
      p.className = 'mb-4'
      p.appendChild(link)
      editorElement.appendChild(p)
    }
    
    savedRange = null
    handleEditorInput()
    scheduleAutoSave()
    showLinkModal = false
  }

  function openPreview() {
    previewDrawerOpen.set(true)
  }

  function togglePublishToolbar() {
    showPublishToolbar = !showPublishToolbar
  }

  async function handlePublish() {
    if (!canPublish) return
    
    const storyId = await saveToDatabase()
    
    if (!storyId) {
      showNotification('error', 'Failed to save story')
      return
    }
    
    const result = await publishStory(storyId)
    if (result.error) {
      showNotification('error', 'Failed to publish')
      return
    }
    
    // Log the publish action
    if ($session) {
      await logActivity(
        $session.courseId,
        $session.teamName,
        'published',
        $session.name,
        storyId,
        title
      )
    }
    
    showNotification('success', 'Published!')
    
    // Release lock and close
    await releaseAndClose()
  }

  async function handleSaveChanges() {
    const storyId = await saveToDatabase()
    
    if (!storyId) {
      showNotification('error', 'Failed to save')
      return
    }
    
    // Log the edit action
    if ($session && isEditingExisting) {
      await logActivity(
        $session.courseId,
        $session.teamName,
        'edited',
        $session.name,
        storyId,
        title
      )
    }
    
    showNotification('success', 'Changes saved!')
    
    // Release lock and close
    await releaseAndClose()
  }

  async function releaseAndClose() {
    // Release lock if we have one
    if ($editingStory.id && !isLocked) {
      await releaseLock($editingStory.id)
    }
    clearLockRefreshTimer()
    editingStory.reset()
    writeDrawerOpen.set(false)
    showPublishToolbar = false
    showSaveToolbar = false
  }

  function toggleSaveToolbar() {
    showSaveToolbar = !showSaveToolbar
  }

  async function closeDrawer() {
    if ($editingStory.isDirty && !isLocked) {
      if (!confirm('You have unsaved changes. Discard them?')) return
    }
    await releaseAndClose()
  }

  function handleLockGoBack() {
    editingStory.reset()
    writeDrawerOpen.set(false)
  }

  function removeFeaturedImage() {
    featuredImageUrl = null
    scheduleAutoSave()
  }

  function formatTimeAgo(timestamp: number | null): string {
    if (!timestamp) return ''
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60) return 'Saved'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `Saved ${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `Saved ${hours}h ago`
  }
</script>

{#if $writeDrawerOpen}
  <div
    class="fixed inset-0 z-50 bg-white flex flex-col"
    transition:fly={{ y: '100%', duration: 300 }}
    style="--selection-color: #{$teamColors.secondary};"
  >
    <!-- Header -->
    <header class="flex items-center justify-between px-4 py-3 shrink-0">
      <button
        on:click={closeDrawer}
        class="w-8 h-8 rounded-full bg-[#efefef] flex items-center justify-center"
        aria-label="Close"
      >
        <img
          src="/icons/icon-close.svg"
          alt=""
          class="w-4 h-4"
          style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
        />
      </button>
      
      <div class="flex items-center gap-2 text-sm text-[#777777]">
        {#if saving}
          <span>Saving...</span>
        {:else if lastSavedTime}
          <span>{formatTimeAgo(lastSavedTime)}</span>
        {/if}
      </div>
    </header>

    <!-- Content -->
    <main class="flex-1 px-4 overflow-y-auto pb-4">
      <div class="space-y-1">
        <!-- Title -->
        <textarea
          bind:value={title}
          on:input={scheduleAutoSave}
          placeholder="Title"
          class="title-input w-full text-2xl font-semibold text-[#333333] outline-none placeholder:text-[#999999] resize-none overflow-hidden"
          rows="1"
          maxlength="200"
          on:input={(e) => {
            const target = e.currentTarget;
            target.style.height = 'auto';
            target.style.height = target.scrollHeight + 'px';
          }}
        ></textarea>

        <!-- Featured Image -->
        {#if featuredImageUrl}
          <div class="relative">
            <img
              src={getOptimizedUrl(featuredImageUrl)}
              alt="Featured"
              class="w-full rounded-lg"
            />
            <button
              on:click={removeFeaturedImage}
              class="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center"
              aria-label="Remove image"
            >
              <img src="/icons/icon-close.svg" alt="" class="w-3 h-3 invert" />
            </button>
            <input
              type="text"
              bind:value={featuredImageCaption}
              on:input={scheduleAutoSave}
              placeholder="Tap to add caption"
              class="w-full text-sm text-center text-[#777777] mt-2 outline-none placeholder:text-[#999999]"
            />
          </div>
        {/if}

        <!-- Rich Text Editor -->
        <div
          bind:this={editorElement}
          contenteditable="true"
          on:input={handleEditorInput}
          on:paste={handleEditorPaste}
          class="editor-content min-h-[200px] outline-none text-base text-[#333333] leading-relaxed"
          data-placeholder="Text"
        ></div>
      </div>

      <!-- Word Count - only show when > 0 -->
      {#if wordCount > 0}
        <div class="text-sm text-[#777777] mt-2 text-right">
          {wordCount} {wordCount === 1 ? 'word' : 'words'}
        </div>
      {/if}
    </main>

    <!-- Publish Toolbar (when active) -->
    {#if showPublishToolbar}
      <div class="px-4 pb-2" transition:fly={{ y: 20, duration: 150 }}>
        <div class="flex items-center gap-3 rounded-full px-4 py-2 w-fit ml-auto" style="background-color: #{$teamColors.primary};">
          <button
            on:click={() => showPublishToolbar = false}
            class="w-6 h-6 bg-white rounded-full flex items-center justify-center"
            aria-label="Cancel"
          >
            <img src="/icons/icon-close.svg" alt="" class="w-3 h-3" style="filter: invert(14%) sepia(95%) saturate(3500%) hue-rotate(256deg) brightness(75%) contrast(90%);" />
          </button>
          <button
            on:click={handlePublish}
            disabled={!canPublish}
            class="text-white font-medium disabled:opacity-50"
          >
            Publish Now?
          </button>
        </div>
      </div>
    {/if}

    <!-- Save Changes Toolbar (when active, for published stories) -->
    {#if showSaveToolbar}
      <div class="px-4 pb-2" transition:fly={{ y: 20, duration: 150 }}>
        <div class="flex items-center gap-3 rounded-full px-4 py-2 w-fit ml-auto" style="background-color: #{$teamColors.primary};">
          <button
            on:click={() => showSaveToolbar = false}
            class="w-6 h-6 bg-white rounded-full flex items-center justify-center"
            aria-label="Cancel"
          >
            <img src="/icons/icon-close.svg" alt="" class="w-3 h-3" style="filter: invert(14%) sepia(95%) saturate(3500%) hue-rotate(256deg) brightness(75%) contrast(90%);" />
          </button>
          <button
            on:click={handleSaveChanges}
            disabled={!title.trim()}
            class="text-white font-medium disabled:opacity-50"
          >
            Save Changes?
          </button>
        </div>
      </div>
    {/if}

    <!-- Toolbar -->
    <footer class="border-t border-[#efefef] px-4 py-3 shrink-0 bg-white">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button on:click={() => imageFileInput.click()} class="p-2" aria-label="Add image">
            <img
              src="/icons/icon-image.svg"
              alt=""
              class="w-5 h-5"
              style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
            />
          </button>
          <input
            bind:this={imageFileInput}
            type="file"
            accept="image/*"
            class="hidden"
            on:change={handleInlineImageUpload}
          />

          <button 
            on:click={insertHeading} 
            class="w-9 h-9 flex items-center justify-center rounded-full transition-all duration-150"
            style={isHeadingActive ? `background-color: #${$teamColors.secondary};` : ''}
            aria-label="Add subhead"
          >
            <img
              src="/icons/icon-heading.svg"
              alt=""
              class="w-5 h-5 transition-transform duration-150"
              class:scale-110={isHeadingActive}
              style={isHeadingActive 
                ? `filter: invert(14%) sepia(95%) saturate(3500%) hue-rotate(256deg) brightness(75%) contrast(90%);` 
                : "filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"}
            />
          </button>

          <button 
            on:click={insertBold} 
            class="w-9 h-9 flex items-center justify-center rounded-full transition-all duration-150"
            style={isBoldActive ? `background-color: #${$teamColors.secondary};` : ''}
            aria-label="Bold text"
          >
            <img
              src="/icons/icon-bold.svg"
              alt=""
              class="w-5 h-5 transition-transform duration-150"
              class:scale-110={isBoldActive}
              style={isBoldActive 
                ? `filter: invert(14%) sepia(95%) saturate(3500%) hue-rotate(256deg) brightness(75%) contrast(90%);` 
                : "filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"}
            />
          </button>

          <button on:click={insertSeparator} class="p-2" aria-label="Add separator">
            <img
              src="/icons/icon-separator.svg"
              alt=""
              class="w-5 h-5"
              style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
            />
          </button>

          <button on:click={openYouTubeModal} class="p-2" aria-label="Add YouTube">
            <img
              src="/icons/icon-youtube.svg"
              alt=""
              class="w-5 h-5"
              style="filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"
            />
          </button>

          <button 
            on:click={openLinkModal} 
            class="w-9 h-9 flex items-center justify-center rounded-full transition-all duration-150"
            style={isLinkActive ? `background-color: #${$teamColors.secondary};` : ''}
            aria-label="Add link"
          >
            <img
              src="/icons/icon-link.svg"
              alt=""
              class="w-5 h-5 transition-transform duration-150"
              class:scale-110={isLinkActive}
              style={isLinkActive 
                ? `filter: invert(14%) sepia(95%) saturate(3500%) hue-rotate(256deg) brightness(75%) contrast(90%);` 
                : "filter: invert(47%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(55%) contrast(92%);"}
            />
          </button>
        </div>

        <div class="w-px h-6 bg-[#efefef]"></div>

        <div class="flex items-center gap-3">
          <button on:click={openPreview} class="p-2" aria-label="Preview">
            <img
              src="/icons/icon-preview.svg"
              alt=""
              class="w-5 h-5"
              style="filter: invert(14%) sepia(95%) saturate(3500%) hue-rotate(256deg) brightness(75%) contrast(90%);"
            />
          </button>
          {#if isPublishedStory}
            <!-- Save icon for editing published stories -->
            <button
              on:click={toggleSaveToolbar}
              class="p-2 outline-none focus:outline-none"
              aria-label="Save Changes"
            >
              <img
                src={showSaveToolbar ? '/icons/icon-publish-fill.svg' : '/icons/icon-publish.svg'}
                alt=""
                class="w-5 h-5"
                style="filter: invert(14%) sepia(95%) saturate(3500%) hue-rotate(256deg) brightness(75%) contrast(90%);"
              />
            </button>
          {:else}
            <!-- Publish button for drafts -->
            <button
              on:click={togglePublishToolbar}
              class="p-2 outline-none focus:outline-none"
              aria-label="Publish"
            >
              <img
                src={showPublishToolbar ? '/icons/icon-publish-fill.svg' : '/icons/icon-publish.svg'}
                alt=""
                class="w-5 h-5"
                style="filter: invert(14%) sepia(95%) saturate(3500%) hue-rotate(256deg) brightness(75%) contrast(90%);"
              />
            </button>
          {/if}
        </div>
      </div>
    </footer>

    <!-- Hidden file input for featured image -->
    <input
      bind:this={fileInput}
      type="file"
      accept="image/*"
      class="hidden"
      on:change={handleImageUpload}
    />
  </div>

  <!-- Modals -->
  <YouTubeModal
    open={showYouTubeModal}
    on:add={handleYouTubeAdd}
    on:close={() => showYouTubeModal = false}
  />

  <LinkModal
    open={showLinkModal}
    initialText={selectedText}
    on:add={handleLinkAdd}
    on:close={() => showLinkModal = false}
  />

  <!-- Preview Drawer -->
  <PreviewDrawer
    {title}
    summary=""
    {featuredImageUrl}
    {featuredImageCaption}
    {contentBlocks}
  />

  <!-- Lock Warning Modal -->
  {#if isLocked && lockedBy}
    <LockWarning {lockedBy} on:goback={handleLockGoBack} />
  {/if}
{/if}

<style>
  [data-placeholder]:empty:before {
    content: attr(data-placeholder);
    color: #999999;
  }

  .title-input {
    word-wrap: break-word;
    overflow-wrap: break-word;
    white-space: pre-wrap;
  }

  .editor-content :global(p) {
    margin-bottom: 1rem;
  }

  .editor-content :global(h2) {
    margin-top: 1rem;
    margin-bottom: 1rem;
  }

  .editor-content::selection,
  .editor-content :global(*)::selection {
    background-color: var(--selection-color) !important;
  }

  .title-input::selection {
    background-color: var(--selection-color) !important;
  }
</style>
