import type { QuestionImage } from '../types';

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];

  const lowerName = file.name.toLowerCase();
  const hasValidExt = allowedExtensions.some(ext => lowerName.endsWith(ext));
  const hasValidMime = allowedMimeTypes.includes(file.type);

  if (!hasValidExt && !hasValidMime) {
    return { valid: false, error: 'Only JPG, JPEG, PNG, and WebP images are supported.' };
  }

  const maxBytes = 15 * 1024 * 1024;
  if (file.size > maxBytes) {
    return { valid: false, error: 'Image file is too large (max 15MB before compression).' };
  }

  return { valid: true };
}

export async function optimizeImage(
  fileOrBlob: File | Blob,
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 0.85
): Promise<{ blob: Blob; width: number; height: number; mimeType: string }> {
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

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const targetFormat = 'image/webp';
        canvas.toBlob(
          optimizedBlob => {
            if (optimizedBlob && optimizedBlob.size < fileOrBlob.size) {
              resolve({ blob: optimizedBlob, width, height, mimeType: targetFormat });
            } else if (optimizedBlob && fileOrBlob.size > 200 * 1024) {
              resolve({ blob: optimizedBlob, width, height, mimeType: targetFormat });
            } else {
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

export async function storeImage(
  fileOrBlob: File | Blob,
  filename?: string,
  altText?: string,
  caption?: string
): Promise<QuestionImage> {
  const name = filename || (fileOrBlob instanceof File ? fileOrBlob.name : 'image.webp');
  const { blob, width, height, mimeType } = await optimizeImage(fileOrBlob);

  const res = await fetch('/api/media/upload-raw', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'x-file-name': encodeURIComponent(name),
      'x-mime-type': mimeType
    },
    body: blob
  });

  if (!res.ok) {
    throw new Error('Failed to save image to computer media folder');
  }

  const saved = await res.json();

  return {
    id: saved.id,
    storagePath: saved.storagePath,
    url: saved.url,
    altText: altText || name,
    caption: caption || '',
    order: 0,
    width,
    height
  };
}

export async function storeImageFromDataUrl(
  dataUrl: string,
  filename = 'extracted_image.png',
  altText = ''
): Promise<QuestionImage> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return storeImage(blob, filename, altText);
}

function toMediaApiUrl(path: string): string {
  if (!path) return '';
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('data:') ||
    path.startsWith('blob:') ||
    path.startsWith('/api/media/')
  ) {
    return path;
  }
  const cleanId = path.replace(/^media\//, '');
  return `/api/media/${encodeURIComponent(cleanId)}`;
}

export async function resolveImageUrl(imageOrPath: QuestionImage | string | undefined): Promise<string> {
  if (!imageOrPath) return '';
  const path =
    typeof imageOrPath === 'string'
      ? imageOrPath
      : imageOrPath.storagePath || imageOrPath.url || '';
  return toMediaApiUrl(path);
}

export function getCachedImageUrl(imageOrPath: QuestionImage | string | undefined): string | null {
  if (!imageOrPath) return null;
  const path =
    typeof imageOrPath === 'string'
      ? imageOrPath
      : imageOrPath.storagePath || imageOrPath.url || '';
  if (!path) return null;
  return toMediaApiUrl(path);
}

export async function findMediaByFilename(filename: string): Promise<QuestionImage | null> {
  const res = await fetch(`/api/media/find?name=${encodeURIComponent(filename)}`);
  if (!res.ok) return null;
  return (await res.json()) as QuestionImage | null;
}

export async function deleteMediaFile(id: string): Promise<void> {
  const cleanId = id.replace(/^media\//, '');
  await fetch(`/api/media/${encodeURIComponent(cleanId)}`, { method: 'DELETE' });
}
