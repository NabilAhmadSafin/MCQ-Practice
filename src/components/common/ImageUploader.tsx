import React, { useState, useRef } from 'react';
import { Upload, X, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import { validateImageFile, storeImage, deleteMediaFile } from '../../services/imageStorageService';
import type { QuestionImage } from '../../types';

interface ImageUploaderProps {
  images: QuestionImage[];
  onChange: (images: QuestionImage[]) => void;
  maxImages?: number;
  label?: string;
  description?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  images,
  onChange,
  maxImages = 6,
  label = 'Question Images / Diagrams',
  description = 'Add one or more diagrams, charts, or figures (PNG, JPG, WebP).'
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setErrorMessage(null);
    setIsUploading(true);

    const newImages = [...images];

    try {
      for (const file of Array.from(files)) {
        if (newImages.length >= maxImages) {
          setErrorMessage(`Maximum limit of ${maxImages} images reached.`);
          break;
        }

        const validation = validateImageFile(file);
        if (!validation.valid) {
          setErrorMessage(validation.error || 'Invalid image file.');
          continue;
        }

        const stored = await storeImage(file, file.name);
        stored.order = newImages.length;
        newImages.push(stored);
      }

      onChange(newImages);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error uploading image.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleRemove = async (index: number) => {
    const item = images[index];
    if (item && item.id) {
      await deleteMediaFile(item.id).catch(() => {});
    }
    const updated = images.filter((_, i) => i !== index).map((img, i) => ({ ...img, order: i }));
    onChange(updated);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const copy = [...images];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    const reordered = copy.map((img, i) => ({ ...img, order: i }));
    onChange(reordered);
  };

  const handleUpdateMeta = (index: number, field: 'caption' | 'altText', val: string) => {
    const updated = [...images];
    updated[index] = { ...updated[index], [field]: val };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-xs font-medium text-[var(--lc-text-secondary)]">
            {label} (<span className="tabular-nums">{images.length}</span>)
          </label>
          {description && (
            <p className="text-xs text-[var(--lc-text-muted)] mt-0.5">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Upload Dropzone */}
      {images.length < maxImages && (
        <div
          onDragOver={e => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-[14px] p-5 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 ${
            isDragOver
              ? 'border-indigo-400 bg-indigo-500/12'
              : 'border-[var(--lc-border)] hover:border-indigo-400/50 bg-white/[0.025]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/jpg"
            onChange={e => e.target.files && handleFiles(e.target.files)}
            className="hidden"
          />

          {isUploading ? (
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold py-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Optimizing and compressing image...</span>
            </div>
          ) : (
            <>
              <div className="w-10 h-10 rounded-[10px] bg-indigo-500/15 border border-indigo-400/25 text-indigo-300 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--lc-text)]">
                  Click to upload or drag &amp; drop image
                </p>
                <p className="text-[11px] text-[var(--lc-text-muted)] mt-0.5">
                  PNG, JPG, or WebP (automatically optimized for fast loading)
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-[10px] bg-rose-500/12 border border-rose-400/30 text-rose-200 text-xs">
          {errorMessage}
        </div>
      )}

      {/* Image Gallery Cards */}
      {images.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {images.map((img, idx) => (
            <div
              key={img.id || idx}
              className="lc-glass-subtle rounded-[12px] p-3 space-y-2.5"
            >
              <div className="flex items-start gap-3">
                <div className="w-20 h-20 shrink-0 rounded-[10px] overflow-hidden border border-[var(--lc-border)] bg-black/25 flex items-center justify-center">
                  <img
                    src={img.url}
                    alt={img.altText || `Image ${idx + 1}`}
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <input
                    type="text"
                    value={img.caption || ''}
                    onChange={e => handleUpdateMeta(idx, 'caption', e.target.value)}
                    placeholder="Caption (e.g. Figure 1: Circuit Diagram)"
                    className="lc-input w-full text-xs px-2.5 py-1.5"
                  />
                  <input
                    type="text"
                    value={img.altText || ''}
                    onChange={e => handleUpdateMeta(idx, 'altText', e.target.value)}
                    placeholder="Alt text / Description for screen readers"
                    className="lc-input w-full text-[11px] px-2.5 py-1.5"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="p-1.5 rounded-[8px] text-[var(--lc-text-muted)] hover:text-rose-400 hover:bg-rose-500/12 transition-colors"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {images.length > 1 && (
                <div className="flex items-center justify-between text-[11px] text-[var(--lc-text-muted)] pt-2 border-t border-[var(--lc-divider)]">
                  <span className="tabular-nums">Image #{idx + 1}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMove(idx, 'up')}
                      className="p-1 rounded-[8px] hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === images.length - 1}
                      onClick={() => handleMove(idx, 'down')}
                      className="p-1 rounded-[8px] hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
