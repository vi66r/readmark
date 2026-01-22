import { Editor, rootCtx, defaultValueCtx, editorViewOptionsCtx } from "@milkdown/kit/core";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { gfm } from "@milkdown/kit/preset/gfm";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";
import { history } from "@milkdown/kit/plugin/history";
import { clipboard } from "@milkdown/kit/plugin/clipboard";
import { indent } from "@milkdown/kit/plugin/indent";
import { trailing } from "@milkdown/kit/plugin/trailing";

export interface MilkdownConfig {
  defaultValue?: string;
  editable?: boolean;
  onChange?: (markdown: string) => void;
}

export async function createEditor(
  root: HTMLElement,
  config: MilkdownConfig = {}
): Promise<Editor> {
  const { defaultValue = "", editable = true, onChange } = config;

  const editor = await Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root);
      ctx.set(defaultValueCtx, defaultValue);
      ctx.set(editorViewOptionsCtx, {
        editable: () => editable,
      });

      if (onChange) {
        ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
          onChange(markdown);
        });
      }
    })
    .use(commonmark)
    .use(gfm)
    .use(listener)
    .use(history)
    .use(clipboard)
    .use(indent)
    .use(trailing)
    .create();

  return editor;
}

export function destroyEditor(editor: Editor | null) {
  if (editor) {
    editor.destroy();
  }
}
