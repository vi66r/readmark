import { useRef, useEffect, useCallback } from "react";
import { useActiveTab, useFocusZone, useAppStore } from "../stores/app-store";
import { MilkdownEditor } from "./MilkdownEditor";
import { MermaidRenderer } from "./MermaidRenderer";

const SCROLL_AMOUNT = 100; // pixels per arrow key press
const SCROLL_AMOUNT_LARGE = 400; // pixels for page up/down

export function PreviewPane() {
  const activeTab = useActiveTab();
  const focusZone = useFocusZone();
  const { commandPaletteOpen, searchOpen, searchQuery, searchMatchIndex } = useAppStore();
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle keyboard scrolling
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't scroll if command palette or search is open
    if (commandPaletteOpen || searchOpen) return;
    
    const container = containerRef.current;
    if (!container) return;

    let scrollAmount = 0;

    switch (e.key) {
      case "ArrowDown":
      case "j":
        scrollAmount = SCROLL_AMOUNT;
        break;
      case "ArrowUp":
      case "k":
        scrollAmount = -SCROLL_AMOUNT;
        break;
      case "PageDown":
      case " ": // Spacebar
        scrollAmount = SCROLL_AMOUNT_LARGE;
        break;
      case "PageUp":
        scrollAmount = -SCROLL_AMOUNT_LARGE;
        break;
      case "Home":
        container.scrollTo({ top: 0, behavior: "smooth" });
        e.preventDefault();
        return;
      case "End":
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
        e.preventDefault();
        return;
      default:
        return;
    }

    if (scrollAmount !== 0) {
      e.preventDefault();
      container.scrollBy({ top: scrollAmount, behavior: "smooth" });
    }
  }, [commandPaletteOpen, searchOpen]);

  // Attach keyboard listener when editor is focused
  useEffect(() => {
    if (focusZone !== "editor") return;

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusZone, handleKeyDown]);

  // Focus container on mount for immediate keyboard access
  useEffect(() => {
    if (focusZone === "editor" && !searchOpen) {
      containerRef.current?.focus();
    }
  }, [focusZone, activeTab?.id, searchOpen]);

  // Highlight search matches in the DOM
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear existing highlights
    const existingHighlights = container.querySelectorAll(".search-highlight, .search-highlight-current");
    existingHighlights.forEach(el => {
      const parent = el.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent || ""), el);
        parent.normalize();
      }
    });

    if (!searchQuery.trim()) return;

    // Walk through all text nodes and highlight matches
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null
    );

    const textNodes: Text[] = [];
    let node;
    while ((node = walker.nextNode())) {
      textNodes.push(node as Text);
    }

    const lowerQuery = searchQuery.toLowerCase();
    let globalMatchIndex = 0;

    textNodes.forEach(textNode => {
      const text = textNode.textContent || "";
      const lowerText = text.toLowerCase();
      
      if (!lowerText.includes(lowerQuery)) return;

      const parent = textNode.parentNode;
      if (!parent) return;

      // Skip if parent is already a highlight
      if ((parent as Element).classList?.contains("search-highlight") || 
          (parent as Element).classList?.contains("search-highlight-current")) {
        return;
      }

      const fragment = document.createDocumentFragment();
      let lastIndex = 0;
      let pos = 0;

      while (pos < lowerText.length) {
        const index = lowerText.indexOf(lowerQuery, pos);
        if (index === -1) break;

        // Add text before match
        if (index > lastIndex) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex, index)));
        }

        // Add highlighted match
        const span = document.createElement("span");
        span.className = globalMatchIndex === searchMatchIndex 
          ? "search-highlight-current" 
          : "search-highlight";
        span.textContent = text.slice(index, index + searchQuery.length);
        fragment.appendChild(span);

        globalMatchIndex++;
        lastIndex = index + searchQuery.length;
        pos = index + 1;
      }

      // Add remaining text
      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
      }

      parent.replaceChild(fragment, textNode);
    });

    // Scroll to current match
    const currentHighlight = container.querySelector(".search-highlight-current");
    if (currentHighlight) {
      currentHighlight.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [searchQuery, searchMatchIndex]);

  if (!activeTab) {
    return null;
  }

  // Check if content has mermaid blocks and render them separately
  const contentWithMermaid = processMermaidBlocks(activeTab.content);

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto bg-[var(--color-bg-primary)] focus:outline-none scroll-smooth"
      tabIndex={0}
    >
      {contentWithMermaid.map((block, index) => (
        <div key={index}>
          {block.type === "mermaid" ? (
            <MermaidRenderer chart={block.content} />
          ) : (
            <MilkdownEditor
              content={block.content}
              editable={false}
              className="preview-mode"
            />
          )}
        </div>
      ))}
    </div>
  );
}

interface ContentBlock {
  type: "markdown" | "mermaid";
  content: string;
}

function processMermaidBlocks(content: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
  
  let lastIndex = 0;
  let match;

  while ((match = mermaidRegex.exec(content)) !== null) {
    // Add markdown content before this mermaid block
    if (match.index > lastIndex) {
      const mdContent = content.slice(lastIndex, match.index).trim();
      if (mdContent) {
        blocks.push({ type: "markdown", content: mdContent });
      }
    }

    // Add mermaid block
    blocks.push({ type: "mermaid", content: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }

  // Add remaining markdown content
  if (lastIndex < content.length) {
    const mdContent = content.slice(lastIndex).trim();
    if (mdContent) {
      blocks.push({ type: "markdown", content: mdContent });
    }
  }

  // If no blocks were created, treat entire content as markdown
  if (blocks.length === 0) {
    blocks.push({ type: "markdown", content });
  }

  return blocks;
}
