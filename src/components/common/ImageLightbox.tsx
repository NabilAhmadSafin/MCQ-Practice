import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Maximize2 } from 'lucide-react';

interface ImageLightboxProps {
  src: string;
  alt?: string;
  caption?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  src,
  alt,
  caption,
  isOpen,
  onClose
}) => {
  const [scale, setScale] = useState(1);

  // Reset scale whenever opened
  useEffect(() => {
    if (isOpen) {
      setScale(1);
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.35, 3.5));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.35, 0.5));
  const handleReset = () => setScale(1);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt || 'Image zoom modal'}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-xs p-4 sm:p-6 select-none animate-fadeIn"
      onClick={onClose}
    >
      {/* Top Header / Action Toolbar */}
      <div
        className="absolute top-4 inset-x-4 max-w-4xl mx-auto flex items-center justify-between text-white z-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 truncate max-w-md">
          {caption ? (
            <span className="text-xs sm:text-sm font-medium text-zinc-200 truncate">{caption}</span>
          ) : alt ? (
            <span className="text-xs sm:text-sm font-medium text-zinc-300 truncate">{alt}</span>
          ) : (
            <span className="text-xs text-zinc-400">Diagram Details</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 bg-zinc-900/80 border border-zinc-700/80 rounded-lg p-1">
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom In"
            aria-label="Zoom in"
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-200 hover:text-white transition"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom Out"
            aria-label="Zoom out"
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-200 hover:text-white transition"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleReset}
            title="Reset Zoom"
            aria-label="Reset zoom"
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-200 hover:text-white transition text-xs font-mono"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-zinc-700 mx-1" />
          <button
            type="button"
            onClick={onClose}
            title="Close Lightbox"
            aria-label="Close"
            className="p-1.5 rounded bg-zinc-800 hover:bg-red-600/80 text-white transition"
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
          src={src}
          alt={alt || 'Enlarged diagram'}
          style={{
            transform: `scale(${scale})`,
            transition: 'transform 0.15s ease-out'
          }}
          className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl cursor-grab active:cursor-grabbing"
          draggable={false}
        />
      </div>

      {/* Caption at bottom if provided */}
      {caption && (
        <div
          className="absolute bottom-4 max-w-xl mx-auto px-4 py-2 bg-zinc-900/90 border border-zinc-800 rounded-lg text-center text-xs text-zinc-300"
          onClick={e => e.stopPropagation()}
        >
          {caption}
        </div>
      )}
    </div>
  );
};
