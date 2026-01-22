import { useRef, useEffect, useCallback } from "react";
import { Editor } from "@milkdown/kit/core";
import { replaceAll, getMarkdown } from "@milkdown/kit/utils";
import { createEditor, destroyEditor } from "../lib/milkdown";
import { openUrl } from "../lib/tauri";

interface MilkdownEditorProps {
  content: string;
  editable?: boolean;
  onChange?: (content: string) => void;
  className?: string;
}

export function MilkdownEditor({
  content,
  editable = true,
  onChange,
  className = "",
}: MilkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const contentRef = useRef(content);
  const isInternalUpdate = useRef(false);

  // Update contentRef in an effect (not during render)
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  const handleChange = useCallback(
    (markdown: string) => {
      if (isInternalUpdate.current) {
        isInternalUpdate.current = false;
        return;
      }
      onChange?.(markdown);
    },
    [onChange]
  );

  // Handle link clicks
  const handleClick = useCallback(
    (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a");
      
      if (link && !editable) {
        e.preventDefault();
        const href = link.getAttribute("href");
        if (href && (href.startsWith("http://") || href.startsWith("https://"))) {
          openUrl(href);
        }
      }
    },
    [editable]
  );

  // Initialize editor
  useEffect(() => {
    if (!containerRef.current) return;

    let mounted = true;

    const initEditor = async () => {
      if (!containerRef.current || !mounted) return;

      const editor = await createEditor(containerRef.current, {
        defaultValue: contentRef.current,
        editable,
        onChange: handleChange,
      });

      if (mounted) {
        editorRef.current = editor;
      } else {
        destroyEditor(editor);
      }
    };

    initEditor();

    return () => {
      mounted = false;
      destroyEditor(editorRef.current);
      editorRef.current = null;
    };
  }, [editable, handleChange]);

  // Add click listener for links
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, [handleClick]);

  // Update content when it changes externally
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    // Get current editor content
    const currentContent = editor.action(getMarkdown());
    
    // Only update if content is different (avoid loops)
    if (currentContent !== content) {
      isInternalUpdate.current = true;
      editor.action(replaceAll(content));
    }
  }, [content]);

  return (
    <div
      ref={containerRef}
      className={`milkdown ${className}`}
    />
  );
}
