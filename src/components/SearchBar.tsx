import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { clsx } from "clsx";
import { formatShortcut } from "../lib/platform";
import { appActions } from "../stores/app-store";

interface SearchBarProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
}

interface SearchMatch {
  index: number;
  start: number;
  length: number;
}

export function SearchBar({ isOpen, onClose, content }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Compute matches with useMemo
  const matches = useMemo((): SearchMatch[] => {
    if (!query.trim()) return [];

    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const foundMatches: SearchMatch[] = [];
    let pos = 0;

    while (pos < lowerContent.length) {
      const index = lowerContent.indexOf(lowerQuery, pos);
      if (index === -1) break;
      foundMatches.push({
        index: foundMatches.length,
        start: index,
        length: query.length,
      });
      pos = index + 1;
    }

    return foundMatches;
  }, [query, content]);

  // Reset current index when matches change
  const validIndex = matches.length > 0 ? Math.min(currentIndex, matches.length - 1) : 0;

  // Update global search state for highlighting
  useEffect(() => {
    if (isOpen && query) {
      appActions.setSearchQuery(query);
    } else {
      appActions.setSearchQuery("");
    }
  }, [isOpen, query]);

  // Track previous isOpen state to detect close
  const prevIsOpenRef = useRef(isOpen);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  // Scroll to current match when it changes
  useEffect(() => {
    if (matches.length === 0 || !query) return;

    const match = matches[validIndex];
    if (!match) return;

    // Find the element containing this text and scroll to it
    // Use a small delay to let the DOM update with highlights
    const timer = setTimeout(() => {
      const highlights = document.querySelectorAll(".search-highlight-current");
      if (highlights.length > 0) {
        highlights[0].scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [validIndex, matches, query]);

  const handleClose = useCallback(() => {
    setQuery("");
    setCurrentIndex(0);
    appActions.setSearchQuery("");
    onClose();
  }, [onClose]);

  const goToNext = useCallback(() => {
    if (matches.length === 0) return;
    const next = (validIndex + 1) % matches.length;
    setCurrentIndex(next);
    appActions.setSearchMatchIndex(next);
  }, [validIndex, matches.length]);

  const goToPrev = useCallback(() => {
    if (matches.length === 0) return;
    const prev = (validIndex - 1 + matches.length) % matches.length;
    setCurrentIndex(prev);
    appActions.setSearchMatchIndex(prev);
  }, [validIndex, matches.length]);

  // Stop all key events from propagating to prevent scroll interference
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Always stop propagation to prevent other handlers (like scroll)
    e.stopPropagation();

    if (e.key === "Escape") {
      e.preventDefault();
      handleClose();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        goToPrev();
      } else {
        goToNext();
      }
    } else if (e.key === "F3") {
      e.preventDefault();
      if (e.shiftKey) {
        goToPrev();
      } else {
        goToNext();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="absolute top-2 right-4 z-40 flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] shadow-lg"
      onKeyDown={(e) => e.stopPropagation()}
    >
      {/* Search input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setCurrentIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Find in document..."
          className="w-64 px-3 py-1.5 pr-16 text-sm rounded
            bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]
            placeholder:text-[var(--color-text-muted)]
            border border-[var(--color-border)]
            focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)]"
        />
        {/* Match count */}
        {query && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-muted)]">
            {matches.length > 0 ? `${validIndex + 1}/${matches.length}` : "0/0"}
          </span>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={goToPrev}
          disabled={matches.length === 0}
          className={clsx(
            "p-1.5 rounded transition-colors",
            "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]",
            "hover:bg-[var(--color-bg-tertiary)]",
            "disabled:opacity-30 disabled:cursor-not-allowed"
          )}
          title="Previous match (Shift+Enter)"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button
          onClick={goToNext}
          disabled={matches.length === 0}
          className={clsx(
            "p-1.5 rounded transition-colors",
            "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]",
            "hover:bg-[var(--color-bg-tertiary)]",
            "disabled:opacity-30 disabled:cursor-not-allowed"
          )}
          title="Next match (Enter)"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Close button */}
      <button
        onClick={handleClose}
        className="p-1.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
        title="Close (Escape)"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Keyboard hint */}
      <span className="text-xs text-[var(--color-text-muted)] opacity-50 ml-1">
        {formatShortcut("F")}
      </span>
    </div>
  );
}

