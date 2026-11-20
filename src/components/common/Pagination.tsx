import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange
}) => {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white/[0.025] border-t border-[var(--lc-divider)] text-xs text-[var(--lc-text-secondary)]">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="tabular-nums">
          Showing <span className="font-semibold text-[var(--lc-text)]">{startItem}</span> to{' '}
          <span className="font-semibold text-[var(--lc-text)]">{endItem}</span> of{' '}
          <span className="font-semibold text-[var(--lc-text)]">{totalItems}</span> questions
        </span>
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={e => onPageSizeChange(Number(e.target.value))}
              className="lc-select px-2 py-1 text-xs tabular-nums"
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-[8px] hover:bg-white/[0.08] disabled:opacity-35 disabled:cursor-not-allowed text-[var(--lc-text-secondary)] hover:text-[var(--lc-text)] transition-colors"
          title="First page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-[8px] hover:bg-white/[0.08] disabled:opacity-35 disabled:cursor-not-allowed text-[var(--lc-text-secondary)] hover:text-[var(--lc-text)] transition-colors"
          title="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="px-3 py-1 font-medium text-[var(--lc-text)] tabular-nums">
          Page {currentPage} of {totalPages || 1}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded-[8px] hover:bg-white/[0.08] disabled:opacity-35 disabled:cursor-not-allowed text-[var(--lc-text-secondary)] hover:text-[var(--lc-text)] transition-colors"
          title="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded-[8px] hover:bg-white/[0.08] disabled:opacity-35 disabled:cursor-not-allowed text-[var(--lc-text-secondary)] hover:text-[var(--lc-text)] transition-colors"
          title="Last page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
