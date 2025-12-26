const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export interface UploadResult {
  url: string
  width: number
  height: number
  publicId: string
}

export async function uploadImage(file: File): Promise<UploadResult> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', 'newslab/images')

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  )

  if (!response.ok) {
    throw new Error('Failed to upload image')
  }

  const data = await response.json()
  
  return {
    url: data.secure_url,
    width: data.width,
    height: data.height,
    publicId: data.public_id
  }
}

export function getOptimizedUrl(url: string, width: number = 800): string {
  if (!url.includes('cloudinary.com')) return url
  return url.replace('/upload/', `/upload/w_${width},q_auto,f_auto/`)
}

export function getThumbnailUrl(url: string, size: number = 300): string {
  if (!url.includes('cloudinary.com')) return url
  return url.replace('/upload/', `/upload/w_${size},h_${size},c_fill,q_auto,f_auto/`)
}
