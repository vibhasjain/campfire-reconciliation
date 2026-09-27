// Tiptap setup for the composer: plain paragraphs, inline @ mention chips,
// Enter to send / Shift+Enter newline, and a tiny bridge that hands suggestion state to React pickers.
import { Extension, type JSONContent } from "@tiptap/core"
import StarterKit from "@tiptap/starter-kit"
import { Placeholder } from "@tiptap/extensions"
import Mention from "@tiptap/extension-mention"
import { PluginKey } from "@tiptap/pm/state"
import { ReactNodeViewRenderer } from "@tiptap/react"
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion"
import { MentionView } from "./MentionView"
import { createStore } from "@/data/store"
import type { EntityRef } from "@/data/types"

export type Suggest = { char: "@"; query: string; rect: DOMRect | null; command: (item: { id: string; label: string }) => void }
/** Plain object shared by the editor extensions (created once) and React (pickers, submit). */
export function makeBridge() {
  let onKey: ((e: KeyboardEvent) => boolean) | null = null
  let submit = () => {}
  let update: (e: { isEmpty: boolean; getJSON(): JSONContent }) => void = () => {}
  return {
    state: createStore<Suggest | null>(null),
    /** The open picker registers its key handler. */
    setKeyHandler: (fn: typeof onKey) => void (onKey = fn),
    key: (e: KeyboardEvent) => onKey?.(e) ?? false,
    setSubmit: (fn: () => void) => void (submit = fn),
    submit: () => submit(),
    /** onUpdate handler (draft saving) — swapped when the draft context changes, without touching editor options. */
    setUpdate: (fn: typeof update) => void (update = fn),
    update: (e: Parameters<typeof update>[0]) => update(e),
  }
}
export type SuggestBridge = ReturnType<typeof makeBridge>

/** Mention node id is "<type>:<id>" for agents and teammates. */
export const parseMentionId = (id: string): EntityRef => {
  const [type, ...rest] = id.split(":")
  return { type, id: rest.join(":") }
}

function suggestion(char: "@", bridge: SuggestBridge) {
  const toState = (p: SuggestionProps): Suggest => ({
    char,
    query: p.query,
    rect: p.clientRect?.() ?? null,
    command: (item) => p.command(item),
  })
  return {
    char,
    pluginKey: new PluginKey("composer-mention"),
    allowSpaces: false,
    items: () => [],
    render: () => ({
      onStart: (p: SuggestionProps) => bridge.state.set(() => toState(p)),
      onUpdate: (p: SuggestionProps) => bridge.state.set(() => toState(p)),
      onKeyDown: ({ event }: SuggestionKeyDownProps) => {
        if (event.key === "Escape") {
          bridge.state.set(() => null)
          return true
        }
        return bridge.key(event)
      },
      onExit: () => bridge.state.set(() => null),
    }),
  }
}

export function composerExtensions(opts: { placeholder: string; bridge: SuggestBridge }) {
  const Submit = Extension.create({
    name: "submitOnEnter",
    priority: 1000, // before the core Enter keymap; yields to an open picker
    addKeyboardShortcuts() {
      return {
        Enter: () => {
          if (opts.bridge.state.get()) return false
          opts.bridge.submit()
          return true
        },
        "Shift-Enter": ({ editor }) => editor.commands.setHardBreak(),
      }
    },
  })
  return [
    StarterKit.configure({
      blockquote: false, bold: false, bulletList: false, code: false, codeBlock: false, heading: false, horizontalRule: false,
      italic: false, listItem: false, listKeymap: false, link: false, orderedList: false, strike: false, underline: false,
      trailingNode: false, dropcursor: false,
    }),
    Placeholder.configure({ placeholder: opts.placeholder }),
    Mention.extend({ addNodeView: () => ReactNodeViewRenderer(MentionView) }).configure({
      renderText: ({ node }) => `@${node.attrs.label ?? ""}`,
      suggestions: [suggestion("@", opts.bridge)],
    }),
    Submit,
  ]
}

/** Doc → message text with `[[type:id]]` tokens, plus the refs it mentions. */
export function serialize(doc: JSONContent): { text: string; mentions: EntityRef[] } {
  const mentions: EntityRef[] = []
  const inline = (n: JSONContent): string => {
    if (n.type === "text") return n.text ?? ""
    if (n.type === "hardBreak") return "\n"
    if (n.type === "mention") {
      const ref = { ...parseMentionId(String(n.attrs?.id)), label: String(n.attrs?.label ?? "") }
      if (!mentions.some((m) => m.type === ref.type && m.id === ref.id)) mentions.push(ref)
      return `[[${ref.type}:${ref.id}]]`
    }
    return (n.content ?? []).map(inline).join("")
  }
  const text = (doc.content ?? []).map(inline).join("\n").trim()
  return { text, mentions }
}
