// Maximum input file size accepted before compression. Anything larger is rejected
// so a malicious or accidental large upload can't OOM the canvas. iPhone HEIC
// photos are typically 4–6 MB; this gives plenty of headroom while bounding risk.
export const MAX_PHOTO_INPUT_BYTES = 30 * 1024 * 1024 // 30 MB

const ACCEPTED_PHOTO_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
])

export async function compressImage(
  file: File,
  maxDim = 1600,
  quality = 0.7
): Promise<Blob> {
  if (file.size > MAX_PHOTO_INPUT_BYTES) {
    throw new Error(`Photo too large (${(file.size / 1_048_576).toFixed(1)} MB). Max ${(MAX_PHOTO_INPUT_BYTES / 1_048_576).toFixed(0)} MB.`)
  }
  if (file.type && !ACCEPTED_PHOTO_TYPES.has(file.type)) {
    throw new Error(`Unsupported image type: ${file.type}`)
  }
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    const objectUrl = URL.createObjectURL(file)
    const cleanup = () => URL.revokeObjectURL(objectUrl)
    img.onload = () => {
      let { width, height } = img
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          cleanup()
          if (blob) resolve(blob)
          else reject(new Error('Failed to compress image'))
        },
        'image/jpeg',
        quality
      )
    }
    img.onerror = () => {
      cleanup()
      reject(new Error('Failed to load image'))
    }
    img.src = objectUrl
  })
}
