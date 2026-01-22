import { useRef, useEffect, useCallback } from "react";
import { useActiveTab, appActions } from "../stores/app-store";

export function SourceEditor() {
  const activeTab = useActiveTab();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when component mounts
  useEffect(() => {
    textareaRef.current?.focus();
  }, [activeTab?.id]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (activeTab) {
        appActions.updateTabContent(activeTab.id, e.target.value);
      }
    },
    [activeTab]
  );

  // Handle tab key for indentation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = textarea.value;

        if (e.shiftKey) {
          // Outdent: remove leading spaces/tab from current line
          const lineStart = value.lastIndexOf("\n", start - 1) + 1;
          const lineContent = value.substring(lineStart, start);
          const match = lineContent.match(/^(\t| {2})/);
          if (match) {
            const newValue =
              value.substring(0, lineStart) +
              value.substring(lineStart + match[0].length);
            if (activeTab) {
              appActions.updateTabContent(activeTab.id, newValue);
            }
            // Adjust cursor position
            setTimeout(() => {
              textarea.selectionStart = textarea.selectionEnd =
                start - match[0].length;
            }, 0);
          }
        } else {
          // Indent: insert two spaces
          const newValue =
            value.substring(0, start) + "  " + value.substring(end);
          if (activeTab) {
            appActions.updateTabContent(activeTab.id, newValue);
          }
          // Move cursor after inserted spaces
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + 2;
          }, 0);
        }
      }
    },
    [activeTab]
  );

  if (!activeTab) {
    return null;
  }

  return (
    <div className="h-full overflow-hidden bg-[var(--color-bg-primary)]">
      <textarea
        ref={textareaRef}
        value={activeTab.content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className="source-editor"
        spellCheck={false}
        placeholder="Start writing markdown..."
      />
    </div>
  );
}
