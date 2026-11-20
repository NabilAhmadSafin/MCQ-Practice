import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import type { QuestionImage } from '../../types';
import { resolveImageUrl, getCachedImageUrl } from '../../services/imageStorageService';

interface ImageLightboxProps {
  src?: string;
  image?: QuestionImage;
  alt?: string;
  caption?: string;
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  src,
  image,
  alt,
  caption,
  className = '',
  isOpen: controlledOpen,
  onClose
}) => {
  const isInlineThumbnailMode = Boolean(image) && controlledOpen === undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const [resolvedSrc, setResolvedSrc] = useState<string>(() => {
    if (src) return src;
    if (image) return getCachedImageUrl(image) || image.url || '';
    return '';
  });
  const [scale, setScale] = useState(1);

  const isOpen = isInlineThumbnailMode ? internalOpen : Boolean(controlledOpen);
  const activeSrc = src || resolvedSrc;
  const activeAlt = alt || image?.altText || 'Diagram';
  const activeCaption = caption || image?.caption;

  useEffect(() => {
    if (src) {
      setResolvedSrc(src);
      return;
    }
    if (image && !resolvedSrc) {
      let mounted = true;
      resolveImageUrl(image).then(url => {
        if (mounted && url) setResolvedSrc(url);
      });
      return () => {
        mounted = false;
      };
    }
  }, [src, image, resolvedSrc]);

  useEffect(() => {
    if (isOpen) {
      setScale(1);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (onClose) onClose();
    else setInternalOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.35, 3.5));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.35, 0.5));
  const handleReset = () => setScale(1);

  return (
    <>
      {isInlineThumbnailMode && activeSrc && (
        <img
          src={activeSrc}
          alt={activeAlt}
          onClick={e => {
            e.stopPropagation();
            setInternalOpen(true);
          }}
          className={`cursor-zoom-in ${className}`}
        />
      )}

      {isOpen && activeSrc && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={activeAlt || 'Image zoom modal'}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-lg p-4 sm:p-6 select-none animate-fadeIn"
          onClick={handleClose}
        >
          {/* Floating Glass Toolbar */}
          <div
            className="absolute top-4 inset-x-4 max-w-4xl mx-auto flex items-center justify-between text-white z-10 gap-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="lc-glass flex items-center gap-2 truncate max-w-md px-3.5 py-1.5 rounded-[10px]">
              <span className="text-xs font-medium text-[var(--lc-text)] truncate">
                {activeCaption || activeAlt || 'Diagram Details'}
              </span>
            </div>

            <div className="lc-glass flex items-center gap-1 rounded-[12px] p-1">
              <button
                type="button"
                onClick={handleZoomIn}
                title="Zoom In"
                aria-label="Zoom in"
                className="p-1.5 rounded-[8px] hover:bg-white/10 text-[var(--lc-text)] transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                title="Zoom Out"
                aria-label="Zoom out"
                className="p-1.5 rounded-[8px] hover:bg-white/10 text-[var(--lc-text)] transition-colors"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleReset}
                title="Reset Zoom"
                aria-label="Reset zoom"
                className="p-1.5 rounded-[8px] hover:bg-white/10 text-[var(--lc-text)] transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-4 bg-white/15 mx-1" />
              <button
                type="button"
                onClick={handleClose}
                title="Close Lightbox"
                aria-label="Close"
                className="p-1.5 rounded-[8px] bg-white/10 hover:bg-rose-500 text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Image Container */}
          <div
            className="w-full h-full flex items-center justify-center overflow-auto p-4"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={activeSrc}
              alt={activeAlt || 'Enlarged diagram'}
              style={{
                transform: `scale(${scale})`,
                transition: 'transform 150ms cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              className="max-w-full max-h-[85vh] object-contain rounded-[14px] shadow-2xl cursor-grab active:cursor-grabbing"
              draggable={false}
            />
          </div>

          {activeCaption && (
            <div
              className="lc-glass absolute bottom-4 max-w-xl mx-auto px-4 py-2 rounded-[12px] text-center text-xs text-[var(--lc-text)]"
              onClick={e => e.stopPropagation()}
            >
              {activeCaption}
            </div>
          )}
        </div>
      )}
    </>
  );
};
