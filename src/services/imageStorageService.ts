import { db, type StoredMediaFile } from '../db';
import type { QuestionImage } from '../types';

// In-memory memoized cache of object URLs: storagePath/id -> objectUrl
const objectUrlCache = new Map<string, string>();

/**
 * Validates whether the file is an acceptable image format
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];

  const lowerName = file.name.toLowerCase();
  const hasValidExt = allowedExtensions.some(ext => lowerName.endsWith(ext));
  const hasValidMime = allowedMimeTypes.includes(file.type);

  if (!hasValidExt && !hasValidMime) {
    return { valid: false, error: 'Only JPG, JPEG, PNG, and WebP images are supported.' };
  }

  // Cap initial upload at 15MB before optimization
  const maxBytes = 15 * 1024 * 1024;
  if (file.size > maxBytes) {
    return { valid: false, error: 'Image file is too large (max 15MB before compression).' };
  }

  return { valid: true };
}

/**
 * Compresses and resizes an image on an offscreen HTMLCanvas element.
 * Retains sharp lines for diagrams and formulas while reducing file size drastically.
 */
export async function optimizeImage(
  fileOrBlob: File | Blob,
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 0.85
): Promise<{ blob: Blob; width: number; height: number; mimeType: string }> {
  // If it's SVG, keep SVG as is to preserve vector quality
  if (fileOrBlob.type === 'image/svg+xml') {
    return { blob: fileOrBlob, width: 800, height: 600, mimeType: 'image/svg+xml' };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Calculate aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ blob: fileOrBlob, width, height, mimeType: fileOrBlob.type || 'image/jpeg' });
          return;
        }

        // Draw image smoothly
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Prefer image/webp if supported, else fallback to image/jpeg
        const targetFormat = 'image/webp';
        canvas.toBlob(
          optimizedBlob => {
            if (optimizedBlob && optimizedBlob.size < fileOrBlob.size) {
              resolve({ blob: optimizedBlob, width, height, mimeType: targetFormat });
            } else if (optimizedBlob && fileOrBlob.size > 200 * 1024) {
              // If the original was large, use compressed version even if comparable
              resolve({ blob: optimizedBlob, width, height, mimeType: targetFormat });
            } else {
              // Keep original if it's already tiny
              resolve({ blob: fileOrBlob, width, height, mimeType: fileOrBlob.type || 'image/jpeg' });
            }
          },
          targetFormat,
          quality
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(fileOrBlob);
  });
}

/**
 * Stores an image in the local media storage table and returns a lightweight QuestionImage reference.
 */
export async function storeImage(
  fileOrBlob: File | Blob,
  filename?: string,
  altText?: string,
  caption?: string
): Promise<QuestionImage> {
  const name = filename || (fileOrBlob instanceof File ? fileOrBlob.name : 'image.webp');
  const { blob, width, height, mimeType } = await optimizeImage(fileOrBlob);

  const id = 'img_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  const storagePath = `media/${id}`;

  const record: StoredMediaFile = {
    id,
    name,
    mimeType,
    size: blob.size,
    data: blob,
    createdAt: Date.now()
  };

  await db.mediaFiles.put(record);

  // Create and cache object URL
  const objectUrl = URL.createObjectURL(blob);
  objectUrlCache.set(storagePath, objectUrl);
  objectUrlCache.set(id, objectUrl);

  return {
    id,
    storagePath,
    url: objectUrl,
    altText: altText || name,
    caption: caption || '',
    order: 0,
    width,
    height
  };
}

/**
 * Stores an image from a Data URL (base64) or Blob URL
 */
export async function storeImageFromDataUrl(
  dataUrl: string,
  filename = 'extracted_image.png',
  altText = ''
): Promise<QuestionImage> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return storeImage(blob, filename, altText);
}

/**
 * Resolves a storage path or image object to a usable URL for rendering in <img>
 */
export async function resolveImageUrl(imageOrPath: QuestionImage | string | undefined): Promise<string> {
  if (!imageOrPath) return '';

  const path = typeof imageOrPath === 'string' ? imageOrPath : (imageOrPath.storagePath || imageOrPath.url || '');

  // If already an external URL, data URL, or direct blob URL
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }

  // Check cache
  if (objectUrlCache.has(path)) {
    return objectUrlCache.get(path)!;
  }

  // Extract ID from media/{id} or raw id
  const id = path.replace(/^media\//, '');
  if (objectUrlCache.has(id)) {
    return objectUrlCache.get(id)!;
  }

  try {
    const record = await db.mediaFiles.get(id);
    if (record && record.data) {
      const url = URL.createObjectURL(record.data);
      objectUrlCache.set(path, url);
      objectUrlCache.set(id, url);
      return url;
    }
  } catch (err) {
    console.warn('Failed to resolve image from mediaFiles:', err);
  }

  // If typeof image is object and has fallback url
  if (typeof imageOrPath === 'object' && imageOrPath.url) {
    return imageOrPath.url;
  }

  return '';
}

/**
 * Synchronously checks if URL is already memoized in cache
 */
export function getCachedImageUrl(imageOrPath: QuestionImage | string | undefined): string | null {
  if (!imageOrPath) return null;
  const path = typeof imageOrPath === 'string' ? imageOrPath : (imageOrPath.storagePath || imageOrPath.url || '');
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  const id = path.replace(/^media\//, '');
  return objectUrlCache.get(path) || objectUrlCache.get(id) || null;
}

/**
 * Finds an uploaded media file by its original filename (used during bulk import)
 */
export async function findMediaByFilename(filename: string): Promise<QuestionImage | null> {
  const cleanName = filename.toLowerCase().trim();
  const allMedia = await db.mediaFiles.toArray();
  const match = allMedia.find(m => m.name.toLowerCase().trim() === cleanName || m.id === cleanName);
  if (!match) return null;

  const url = await resolveImageUrl(match.id);
  return {
    id: match.id,
    storagePath: `media/${match.id}`,
    url,
    altText: match.name,
    caption: '',
    order: 0
  };
}

/**
 * Deletes an image from storage
 */
export async function deleteMediaFile(id: string): Promise<void> {
  const cleanId = id.replace(/^media\//, '');
  const url = objectUrlCache.get(cleanId);
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
  objectUrlCache.delete(cleanId);
  objectUrlCache.delete(`media/${cleanId}`);
  await db.mediaFiles.delete(cleanId);
}
