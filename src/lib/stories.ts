import { supabase } from './supabase'
import type { Story, ContentBlock } from './types'

export interface StoryInput {
  courseId: string
  teamName: string
  authorName: string
  title: string
  summary?: string
  featuredImageUrl?: string | null
  content?: { blocks: ContentBlock[] } | null
  status?: 'draft' | 'published'
}

export async function createStory(input: StoryInput): Promise<{ data: Story | null; error: string | null }> {
  const { data, error } = await supabase
    .from('stories')
    .insert({
      course_id: input.courseId,
      team_name: input.teamName,
      author_name: input.authorName,
      title: input.title,
      summary: input.summary || null,
      featured_image_url: input.featuredImageUrl || null,
      content: input.content || null,
      status: input.status || 'draft'
    })
    .select()
    .single()

  if (error) {
    console.error('Create story error:', error)
    return { data: null, error: error.message }
  }

  return { data: mapStory(data), error: null }
}

export async function updateStory(
  id: string,
  updates: Partial<Omit<StoryInput, 'courseId' | 'authorName'>>
): Promise<{ data: Story | null; error: string | null }> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  }

  if (updates.title !== undefined) updateData.title = updates.title
  if (updates.summary !== undefined) updateData.summary = updates.summary
  if (updates.featuredImageUrl !== undefined) updateData.featured_image_url = updates.featuredImageUrl
  if (updates.content !== undefined) updateData.content = updates.content
  if (updates.status !== undefined) updateData.status = updates.status
  if (updates.teamName !== undefined) updateData.team_name = updates.teamName

  const { data, error } = await supabase
    .from('stories')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Update story error:', error)
    return { data: null, error: error.message }
  }

  return { data: mapStory(data), error: null }
}

export async function getStory(id: string): Promise<{ data: Story | null; error: string | null }> {
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: mapStory(data), error: null }
}

export async function getDrafts(courseId: string, authorName: string): Promise<{ data: Story[]; error: string | null }> {
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('course_id', courseId)
    .eq('author_name', authorName)
    .eq('status', 'draft')
    .order('updated_at', { ascending: false })

  if (error) {
    return { data: [], error: error.message }
  }

  return { data: (data || []).map(mapStory), error: null }
}

export async function getPublished(courseId: string, authorName: string): Promise<{ data: Story[]; error: string | null }> {
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('course_id', courseId)
    .eq('author_name', authorName)
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  if (error) {
    return { data: [], error: error.message }
  }

  return { data: (data || []).map(mapStory), error: null }
}

export async function getTeamStream(courseId: string, teamName: string): Promise<{ data: Story[]; error: string | null }> {
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('course_id', courseId)
    .eq('team_name', teamName)
    .eq('status', 'published')
    .order('is_pinned', { ascending: false })
    .order('pin_timestamp', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) {
    return { data: [], error: error.message }
  }

  return { data: (data || []).map(mapStory), error: null }
}

export async function deleteStory(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('stories')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  return { error: null }
}

export async function deleteStories(ids: string[]): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('stories')
    .delete()
    .in('id', ids)

  if (error) {
    return { error: error.message }
  }

  return { error: null }
}

export async function publishStory(id: string): Promise<{ data: Story | null; error: string | null }> {
  return updateStory(id, { status: 'published' })
}

export async function unpublishStory(id: string): Promise<{ data: Story | null; error: string | null }> {
  const { data, error } = await supabase
    .from('stories')
    .update({
      status: 'draft',
      is_pinned: false,
      pin_index: null,
      pin_timestamp: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: mapStory(data), error: null }
}

export async function pinStory(id: string, courseId: string, teamName: string): Promise<{ data: Story | null; error: string | null }> {
  // First, check how many stories are already pinned
  const { data: pinnedStories, error: fetchError } = await supabase
    .from('stories')
    .select('id, pin_timestamp')
    .eq('course_id', courseId)
    .eq('team_name', teamName)
    .eq('is_pinned', true)
    .order('pin_timestamp', { ascending: true })

  if (fetchError) {
    return { data: null, error: fetchError.message }
  }

  // If we already have 3 pinned stories, unpin the oldest one
  if (pinnedStories && pinnedStories.length >= 3) {
    const oldestPinned = pinnedStories[0]
    await supabase
      .from('stories')
      .update({
        is_pinned: false,
        pin_index: null,
        pin_timestamp: null
      })
      .eq('id', oldestPinned.id)
  }

  // Pin the new story
  const { data, error } = await supabase
    .from('stories')
    .update({
      is_pinned: true,
      pin_timestamp: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: mapStory(data), error: null }
}

export async function unpinStory(id: string): Promise<{ data: Story | null; error: string | null }> {
  const { data, error } = await supabase
    .from('stories')
    .update({
      is_pinned: false,
      pin_index: null,
      pin_timestamp: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: mapStory(data), error: null }
}

export async function getTeamInfo(courseId: string, teamName: string): Promise<{ 
  data: { primary_color: string; secondary_color: string; logo_url: string | null; team_name: string } | null; 
  error: string | null 
}> {
  const { data, error } = await supabase
    .from('teams')
    .select('team_name, primary_color, secondary_color, logo_url')
    .eq('course_id', courseId)
    .eq('team_name', teamName)
    .single()

  if (error) {
    // Return defaults if team not found
    return { 
      data: { 
        team_name: teamName || 'Team NewsLab', 
        primary_color: '5422b0', 
        secondary_color: 'f0e6f7', 
        logo_url: null 
      }, 
      error: null 
    }
  }

  return { data, error: null }
}

export async function getFallbackImageUrl(courseId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('newslabs')
    .select('fallback_image_url')
    .eq('course_id', courseId)
    .single()

  if (error || !data) {
    return null
  }

  return data.fallback_image_url
}

const LOCK_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

export function isLockExpired(lockedAt: string | null): boolean {
  if (!lockedAt) return true
  const lockTime = new Date(lockedAt).getTime()
  return Date.now() - lockTime > LOCK_TIMEOUT_MS
}

export interface LockStatus {
  isLocked: boolean
  lockedBy: string | null
  lockedAt: string | null
  isExpired: boolean
  isSelf: boolean
}

export async function checkLock(storyId: string, currentUser: string): Promise<{ data: LockStatus | null; error: string | null }> {
  const { data, error } = await supabase
    .from('stories')
    .select('locked_by, locked_at')
    .eq('id', storyId)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  const lockedBy = data.locked_by as string | null
  const lockedAt = data.locked_at as string | null
  const isExpired = isLockExpired(lockedAt)
  const isSelf = lockedBy === currentUser
  const isLocked = !!lockedBy && !isExpired && !isSelf

  return {
    data: {
      isLocked,
      lockedBy,
      lockedAt,
      isExpired,
      isSelf
    },
    error: null
  }
}

export async function acquireLock(storyId: string, userName: string): Promise<{ success: boolean; error: string | null }> {
  const lockCheck = await checkLock(storyId, userName)
  
  if (lockCheck.error) {
    return { success: false, error: lockCheck.error }
  }

  if (lockCheck.data?.isLocked) {
    return { success: false, error: `Story is being edited by ${lockCheck.data.lockedBy}` }
  }

  const { error } = await supabase
    .from('stories')
    .update({
      locked_by: userName,
      locked_at: new Date().toISOString()
    })
    .eq('id', storyId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

export async function releaseLock(storyId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('stories')
    .update({
      locked_by: null,
      locked_at: null
    })
    .eq('id', storyId)

  if (error) {
    return { error: error.message }
  }

  return { error: null }
}

export async function refreshLock(storyId: string, userName: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('stories')
    .update({
      locked_at: new Date().toISOString()
    })
    .eq('id', storyId)
    .eq('locked_by', userName)

  if (error) {
    return { error: error.message }
  }

  return { error: null }
}

function mapStory(row: Record<string, unknown>): Story {
  return {
    id: row.id as string,
    course_id: row.course_id as string,
    team_name: row.team_name as string,
    author_name: row.author_name as string,
    title: row.title as string,
    summary: row.summary as string | null,
    featured_image_url: row.featured_image_url as string | null,
    content: row.content as { blocks: ContentBlock[] } | null,
    status: row.status as 'draft' | 'published',
    is_pinned: row.is_pinned as boolean,
    pin_index: row.pin_index as number | null,
    pin_timestamp: row.pin_timestamp as string | null,
    locked_by: row.locked_by as string | null,
    locked_at: row.locked_at as string | null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string
  }
}
