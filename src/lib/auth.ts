import { supabase } from './supabase'
import type { UserRole, Session } from './types'

// Discriminated unions for better type safety
export type AuthResult = 
  | { success: true; courseId: string; role: UserRole }
  | { success: false; error: string }

export type BylineResult =
  | { success: true; isReturning: boolean; teamName?: string }
  | { success: false; error: string }

// Input validation constants - allows uppercase for trainer IDs
const COURSE_ID_REGEX = /^[a-zA-Z0-9-]{3,20}$/
const BYLINE_REGEX = /^[a-zA-Z0-9\s'-]{1,30}$/

// Hardwired fallback trainer ID - always works as backup entry
const FALLBACK_TRAINER_ID = 'trainer'

export async function validateCourseId(input: string): Promise<AuthResult> {
  const trimmed = input.trim()
  
  // Validate format: alphanumeric + hyphens, 3-20 chars
  if (!COURSE_ID_REGEX.test(trimmed)) {
    return { success: false, error: 'Try again' }
  }
  
  try {
    const { data, error } = await supabase
      .from('newslabs')
      .select('course_id, trainer_id, guest_editor_id')
      .eq('course_id', trimmed)
      .maybeSingle()
    
    // If no match on course_id, try trainer_id
    if (!data || error) {
      const { data: trainerData, error: trainerError } = await supabase
        .from('newslabs')
        .select('course_id, trainer_id, guest_editor_id')
        .eq('trainer_id', trimmed)
        .maybeSingle()
      
      if (trainerData && !trainerError) {
        return { 
          success: true, 
          courseId: trainerData.course_id, 
          role: 'trainer' 
        }
      }
      
      // Try guest_editor_id
      const { data: guestData, error: guestError } = await supabase
        .from('newslabs')
        .select('course_id, trainer_id, guest_editor_id')
        .eq('guest_editor_id', trimmed)
        .maybeSingle()
      
      if (guestData && !guestError) {
        return { 
          success: true, 
          courseId: guestData.course_id, 
          role: 'guest_editor' 
        }
      }
      
      // Try fallback trainer ID - grants trainer access to most recent newslab
      if (trimmed === FALLBACK_TRAINER_ID) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('newslabs')
          .select('course_id')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        
        if (fallbackData && !fallbackError) {
          return { 
            success: true, 
            courseId: fallbackData.course_id, 
            role: 'trainer' 
          }
        }
      }
      
      // No match found
      return { success: false, error: 'Try again' }
    }
    
    return { 
      success: true, 
      courseId: data.course_id, 
      role: 'journalist' 
    }
  } catch (error) {
    console.error('[validateCourseId] Error:', error)
    return { success: false, error: 'Try again' }
  }
}

export async function validateByline(courseId: string, name: string, role: UserRole): Promise<BylineResult> {
  const trimmed = name.trim()
  
  // Validate format
  if (!BYLINE_REGEX.test(trimmed)) {
    return { success: false, error: 'Invalid characters in byline' }
  }
  
  try {
    // Check if journalist with this name already exists
    const { data: existingJournalist, error: checkError } = await supabase
      .from('journalists')
      .select('id, name')
      .eq('course_id', courseId)
      .eq('name', trimmed)
      .maybeSingle()
    
    if (checkError) {
      console.error('[validateByline] Check error:', checkError)
      return { success: false, error: 'Failed to check byline' }
    }
    
    if (existingJournalist) {
      // Fetch full journalist record to get team_name
      const { data: fullJournalist } = await supabase
        .from('journalists')
        .select('team_name')
        .eq('id', existingJournalist.id)
        .single()
      
      return { 
        success: true, 
        isReturning: true,
        teamName: fullJournalist?.team_name || undefined
      }
    }
    
    // Create journalist record for all roles (trainers/guest_editors need to be able to join teams too)
    const { error: insertError } = await supabase
      .from('journalists')
      .insert({
        course_id: courseId,
        name: trimmed,
        is_editor: false,
        team_name: null
      })
    
    if (insertError) {
      console.error('[validateByline] Insert error:', insertError)
      if (insertError.code === '23505' || insertError.message.includes('unique')) {
        return { success: false, error: 'Name taken. Try again' }
      }
      return { success: false, error: 'Failed to create account' }
    }
    
    return { success: true, isReturning: false }
  } catch (error) {
    console.error('[validateByline] Unexpected error:', error)
    return { success: false, error: 'Failed to validate byline' }
  }
}

export function createSession(courseId: string, name: string, role: UserRole, teamName?: string): Session {
  return {
    courseId,
    name,
    role,
    teamName: teamName || null,
    sessionToken: crypto.randomUUID(),
    loginTimestamp: Date.now()
  }
}

export async function validateSession(session: Session): Promise<boolean> {
  if (!session.courseId || !session.name || !session.role) {
    return false
  }
  
  if (session.role === 'journalist') {
    const { data } = await supabase
      .from('journalists')
      .select('id')
      .eq('course_id', session.courseId)
      .eq('name', session.name)
      .single()
    
    return !!data
  }
  
  return true
}
