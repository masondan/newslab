import { supabase } from './supabase'

export type ActivityAction = 
  | 'published'
  | 'unpublished'
  | 'edited'
  | 'pinned'
  | 'unpinned'
  | 'deleted'
  | 'joined_team'
  | 'left_team'
  | 'promoted_editor'
  | 'demoted_editor'

export interface ActivityLogEntry {
  id: string
  course_id: string
  team_name: string | null
  journalist_name: string | null
  action: ActivityAction
  story_id: string | null
  story_title: string | null
  details: Record<string, unknown> | null
  created_at: string
}

export async function logActivity(
  courseId: string,
  teamName: string | null,
  action: ActivityAction,
  journalistName: string | null,
  storyId?: string | null,
  storyTitle?: string | null,
  details?: Record<string, unknown>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('activity_log')
    .insert({
      course_id: courseId,
      team_name: teamName,
      journalist_name: journalistName,
      action,
      story_id: storyId || null,
      story_title: storyTitle || null,
      details: details || null
    })

  if (error) {
    console.error('Activity log error:', error)
    return { error: error.message }
  }

  return { error: null }
}

export async function getActivityLog(
  courseId: string,
  limit = 100
): Promise<{ data: ActivityLogEntry[]; error: string | null }> {
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return { data: [], error: error.message }
  }

  return { data: data || [], error: null }
}
