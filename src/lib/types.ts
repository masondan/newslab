export type UserRole = 'journalist' | 'trainer' | 'guest_editor'

export interface Session {
  courseId: string
  name: string
  role: UserRole
  teamName: string | null
  sessionToken: string
  loginTimestamp: number
}

export interface NewsLab {
  id: string
  course_id: string
  trainer_id: string
  guest_editor_id: string | null
  fallback_image_url: string | null
  created_at: string
  updated_at: string
}

export interface Journalist {
  id: string
  course_id: string
  name: string
  team_name: string | null
  is_editor: boolean
  created_at: string
  updated_at: string
}

export interface Team {
  id: string
  course_id: string
  team_name: string
  primary_color: string
  secondary_color: string
  logo_url: string | null
  public_share_token: string | null
  share_enabled: boolean
  created_at: string
  updated_at: string
}

export interface Story {
  id: string
  course_id: string
  team_name: string
  author_name: string
  title: string
  summary: string | null
  featured_image_url: string | null
  content: { blocks: ContentBlock[] } | null
  status: 'draft' | 'published'
  is_pinned: boolean
  pin_index: number | null
  pin_timestamp: string | null
  locked_by: string | null
  locked_at: string | null
  created_at: string
  updated_at: string
}

export interface ContentBlock {
  type: 'paragraph' | 'heading' | 'bold' | 'list' | 'separator' | 'image' | 'youtube' | 'vimeo' | 'link'
  text?: string
  items?: string[]
  listType?: 'ordered' | 'unordered'
  url?: string
  width?: number
  height?: number
  aspectRatio?: string
  thumbnailUrl?: string
  title?: string
  color?: string
}
