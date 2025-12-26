import { redirect } from '@sveltejs/kit'
import type { LayoutLoad } from './$types'

export const load: LayoutLoad = async ({ params }) => {
  if (!params.courseId || typeof params.courseId !== 'string') {
    throw redirect(303, '/')
  }

  return {
    courseId: params.courseId
  }
}
