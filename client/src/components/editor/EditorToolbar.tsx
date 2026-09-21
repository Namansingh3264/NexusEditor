"use client"

import * as React from "react"
import type { Editor } from "@tiptap/react"
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from "lucide-react"

import { Toggle } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"

type ToolbarAction = {
  icon: React.ElementType
  label: string
  run: () => void
  isActive: boolean
}

export default function EditorToolbar({
  editor,
  disabled = false,
}: {
  editor: Editor | null
  disabled?: boolean
}) {
  /**
   * Tiptap mutates the editor in place, so React has no reason to re-render
   * when the selection changes. Without this subscription the toolbar's
   * active states were frozen at their initial values.
   */
  const [, forceRender] = React.useReducer((value: number) => value + 1, 0)

  React.useEffect(() => {
    if (!editor) return

    editor.on("transaction", forceRender)
    return () => {
      editor.off("transaction", forceRender)
    }
  }, [editor])

  if (!editor) {
    return <div className="h-12 border-b border-slate-200 bg-white" />
  }

  const groups: ToolbarAction[][] = [
    [
      {
        icon: Undo2,
        label: "Undo",
        run: () => editor.chain().focus().undo().run(),
        isActive: false,
      },
      {
        icon: Redo2,
        label: "Redo",
        run: () => editor.chain().focus().redo().run(),
        isActive: false,
      },
    ],
    [
      {
        icon: Heading1,
        label: "Heading 1",
        run: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        isActive: editor.isActive("heading", { level: 1 }),
      },
      {
        icon: Heading2,
        label: "Heading 2",
        run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        isActive: editor.isActive("heading", { level: 2 }),
      },
      {
        icon: Heading3,
        label: "Heading 3",
        run: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        isActive: editor.isActive("heading", { level: 3 }),
      },
    ],
    [
      {
        icon: Bold,
        label: "Bold",
        run: () => editor.chain().focus().toggleBold().run(),
        isActive: editor.isActive("bold"),
      },
      {
        icon: Italic,
        label: "Italic",
        run: () => editor.chain().focus().toggleItalic().run(),
        isActive: editor.isActive("italic"),
      },
      {
        icon: Strikethrough,
        label: "Strikethrough",
        run: () => editor.chain().focus().toggleStrike().run(),
        isActive: editor.isActive("strike"),
      },
      {
        icon: Highlighter,
        label: "Highlight",
        run: () => editor.chain().focus().toggleHighlight().run(),
        isActive: editor.isActive("highlight"),
      },
    ],
    [
      {
        icon: AlignLeft,
        label: "Align left",
        run: () => editor.chain().focus().setTextAlign("left").run(),
        isActive: editor.isActive({ textAlign: "left" }),
      },
      {
        icon: AlignCenter,
        label: "Align center",
        run: () => editor.chain().focus().setTextAlign("center").run(),
        isActive: editor.isActive({ textAlign: "center" }),
      },
      {
        icon: AlignRight,
        label: "Align right",
        run: () => editor.chain().focus().setTextAlign("right").run(),
        isActive: editor.isActive({ textAlign: "right" }),
      },
    ],
    [
      {
        icon: List,
        label: "Bullet list",
        run: () => editor.chain().focus().toggleBulletList().run(),
        isActive: editor.isActive("bulletList"),
      },
      {
        icon: ListOrdered,
        label: "Numbered list",
        run: () => editor.chain().focus().toggleOrderedList().run(),
        isActive: editor.isActive("orderedList"),
      },
      {
        icon: Quote,
        label: "Quote",
        run: () => editor.chain().focus().toggleBlockquote().run(),
        isActive: editor.isActive("blockquote"),
      },
      {
        icon: Code2,
        label: "Code block",
        run: () => editor.chain().focus().toggleCodeBlock().run(),
        isActive: editor.isActive("codeBlock"),
      },
    ],
  ]

  return (
    <div className="sticky top-16 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center gap-1 overflow-x-auto px-3 py-1.5 scrollbar-hidden">
        {groups.map((group, groupIndex) => (
          <React.Fragment key={group[0].label}>
            {groupIndex > 0 ? (
              <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-slate-200" />
            ) : null}

            {group.map((action) => (
              <Toggle
                key={action.label}
                size="sm"
                aria-label={action.label}
                title={action.label}
                pressed={action.isActive}
                disabled={disabled}
                onPressedChange={action.run}
                className={cn(
                  "size-8 shrink-0 text-slate-600 data-[state=on]:bg-indigo-50 data-[state=on]:text-indigo-700",
                )}
              >
                <action.icon className="size-4" />
              </Toggle>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
