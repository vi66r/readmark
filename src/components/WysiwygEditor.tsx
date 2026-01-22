import { useCallback } from "react";
import { useActiveTab, useIsEditing, appActions } from "../stores/app-store";
import { MilkdownEditor } from "./MilkdownEditor";

export function WysiwygEditor() {
  const activeTab = useActiveTab();
  const isEditing = useIsEditing();

  const handleChange = useCallback(
    (content: string) => {
      if (activeTab && isEditing) {
        appActions.updateTabContent(activeTab.id, content);
      }
    },
    [activeTab, isEditing]
  );

  if (!activeTab) {
    return null;
  }

  return (
    <div className="h-full overflow-y-auto bg-[var(--color-bg-primary)]">
      <MilkdownEditor
        content={activeTab.content}
        editable={isEditing}
        onChange={handleChange}
        className="wysiwyg-mode"
      />
    </div>
  );
}
