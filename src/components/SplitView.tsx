import { useActiveTab } from "../stores/app-store";
import { SourceEditor } from "./SourceEditor";
import { MilkdownEditor } from "./MilkdownEditor";
import { MermaidRenderer } from "./MermaidRenderer";

export function SplitView() {
  const activeTab = useActiveTab();

  if (!activeTab) {
    return null;
  }

  // Process mermaid blocks for preview
  const contentBlocks = processMermaidBlocks(activeTab.content);

  return (
    <div className="h-full flex">
      {/* Source side */}
      <div className="flex-1 min-w-0 border-r border-[var(--color-border)]">
        <SourceEditor />
      </div>

      {/* Preview side */}
      <div className="flex-1 min-w-0 overflow-y-auto bg-[var(--color-bg-primary)]">
        {contentBlocks.map((block, index) => (
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
    if (match.index > lastIndex) {
      const mdContent = content.slice(lastIndex, match.index).trim();
      if (mdContent) {
        blocks.push({ type: "markdown", content: mdContent });
      }
    }

    blocks.push({ type: "mermaid", content: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    const mdContent = content.slice(lastIndex).trim();
    if (mdContent) {
      blocks.push({ type: "markdown", content: mdContent });
    }
  }

  if (blocks.length === 0) {
    blocks.push({ type: "markdown", content });
  }

  return blocks;
}
