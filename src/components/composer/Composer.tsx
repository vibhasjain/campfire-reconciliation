// Campfire composer: streaming chat, local attachments, and generic @ mentions.
import { useEffect, useMemo, useRef, useState } from "react"
import { EditorContent, useEditorState, type JSONContent } from "@tiptap/react"
import { useEditor } from "@/components/editor/use-editor"
import { CornerDownLeft, FileText, LayoutList, Paperclip, Square, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EntityChip } from "@/components/common/EntityChip"
import { COMPOSER_ATTR } from "@/app/hotkeys"
import { nextId, useDB } from "@/data/store"
import type { Attachment, EntityRef, ID } from "@/data/types"
import { send, stop, useRun } from "@/agent/engine"
import { cn } from "@/lib/utils"
import { composerExtensions, makeBridge, serialize } from "./editor"
import { SuggestPicker } from "./SuggestPicker"
import { HistoryMenu } from "./ComposerMenus"
import { Arc } from "./Arc"
import { isViewChip, takePrefill, type ComposerChip } from "./context"
import { DEFAULT_MENTIONS, type MentionSource } from "./mention-sources"

export type ComposerProps = {
  variant: "docked" | "page" | "thread"
  /** Non-removable context chips for the conversation. */
  context?: ComposerChip[]
  /** Thread variant: the chat to continue. */
  chatId?: ID
  onSent?: (chatId: ID) => void
  /** Sources for @ mentions; callers can supply teammates. */
  mentionSources?: MentionSource[]
  className?: string
}

const ACCEPT = [
  ".html", ".jsx", ".tsx", ".txt", ".md", ".csv", ".json", ".xml", ".yaml", ".yml", ".svg", ".png", ".jpg", ".jpeg", ".gif", ".webp",
  ".heic", ".pdf", ".docx", ".xlsx", ".pptx", ".mp4", ".mov", ".zip", ".tar", ".gz",
].join(",")
const TEXTUAL = /\.(csv|md|txt|json|xml|ya?ml|html)$/i
// Drafts live only for this browser session; nothing is written to storage.
const drafts = new Map<string, JSONContent>()
const loadDraft = (key: string) => drafts.get(key)
function saveDraft(key: string, doc: JSONContent | null) {
  if (doc) drafts.set(key, doc)
  else drafts.delete(key)
}

const EDITOR_ATTRS = {
  [COMPOSER_ATTR]: "",
  role: "textbox",
  "aria-label": "Ask Ember",
  "aria-multiline": "true",
  class: "max-h-[40vh] overflow-y-auto p-1 text-base leading-[22.5px] font-normal text-fg outline-none whitespace-pre-wrap break-words",
}

export function Composer({ variant, context: contextProp = [], chatId: chatIdProp, onSent, mentionSources = DEFAULT_MENTIONS, className }: ComposerProps) {
  const [prefill] = useState(() => (variant === "page" ? takePrefill() : null))
  const context = useMemo(() => [...contextProp, ...(prefill?.context ?? [])], [contextProp, prefill])
  const [selectedChatId, setSelectedChatId] = useState<ID | undefined>(undefined)
  const chatId = chatIdProp ?? selectedChatId
  const draftKey = variant === "thread" ? `thread:${chatId}` : variant === "page" ? "agent" : `page:${location.pathname}`
  const bridge = useMemo(() => makeBridge(), [])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const running = useDB((d) => (chatId ? d.chats[chatId]?.status === "running" : false))
  const run = useRun(chatId)
  const fileRef = useRef<HTMLInputElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Options are built once and never change identity: tiptap's useEditor calls setOptions (a full ProseMirror
  // setProps pass) on every render whose options differ, and the docked composer re-renders on every navigation.
  const [options] = useState(() => ({
    extensions: composerExtensions({ placeholder: "Ask Ember", bridge }),
    content: prefill ? { type: "doc", content: [{ type: "paragraph", content: prefill.text ? [{ type: "text", text: prefill.text }] : [] }] } : (loadDraft(draftKey) ?? ""),
    autofocus: prefill ? ("end" as const) : false,
    editorProps: { attributes: EDITOR_ATTRS },
    onUpdate: ({ editor: e }: { editor: { isEmpty: boolean; getJSON(): JSONContent } }) => bridge.update(e),
  }))
  const editor = useEditor(options)

  // Per-context drafts: swap content only when the new context's draft differs (no transaction otherwise).
  const shownKey = useRef(draftKey)
  useEffect(() => {
    bridge.setUpdate((e) => {
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => saveDraft(draftKey, e.isEmpty ? null : e.getJSON()), 300)
    })
    if (!editor || shownKey.current === draftKey) return
    const prevKey = shownKey.current
    shownKey.current = draftKey
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveDraft(prevKey, editor.isEmpty ? null : editor.getJSON())
    }
    const next = loadDraft(draftKey)
    if (!next && editor.isEmpty) return
    if (next && JSON.stringify(next) === JSON.stringify(editor.getJSON())) return
    editor.commands.setContent(next ?? "", { emitUpdate: false })
  }, [draftKey, editor, bridge])
  useEffect(() => () => clearTimeout(saveTimer.current), [])
  // derived from the editor (not set from onCreate, which can fire before mount)
  const empty = useEditorState({ editor, selector: ({ editor: e }) => e?.isEmpty ?? true })

  const uploading = attachments.some((a) => a.state === "uploading")
  const canSend = (!empty || attachments.length > 0) && !uploading

  const submit = () => {
    if (!editor || !canSend) return
    if (running && chatId) return
    const { text, mentions } = serialize(editor.getJSON())
    const refs = context.filter((c): c is EntityRef => !isViewChip(c))
    const id = send({ chatId, text, mentions, attachments, context: refs })
    setSelectedChatId(id)
    editor.commands.clearContent()
    clearTimeout(saveTimer.current)
    saveDraft(draftKey, null)
    setAttachments([])
    onSent?.(id)
  }

  useEffect(() => bridge.setSubmit(submit))

  const addFiles = (files: FileList | null) => {
    for (const f of Array.from(files ?? [])) {
      const a: Attachment = { id: nextId("att"), name: f.name, size: f.size, mime: f.type || "application/octet-stream", state: "uploading" }
      setAttachments((xs) => [...xs, a])
      const textP = TEXTUAL.test(f.name) ? f.text().catch(() => undefined) : Promise.resolve(undefined)
      void textP.then((text) =>
        setAttachments((xs) => xs.map((x) => (x.id === a.id ? { ...x, state: "ready", text: text?.slice(0, 200_000) } : x)))
      )
    }
  }

  const busy = running || (!!run && variant === "thread")
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-0.5 rounded-xl border-hair border-line bg-surface p-2 shadow-composer [caret-color:var(--c-brand)]",
        className
      )}
      onMouseDown={(e) => {
        // clicks on the padding focus the editor, like a textarea
        if (e.target === e.currentTarget) {
          e.preventDefault()
          editor?.commands.focus("end")
        }
      }}
    >
      {(context.length > 0 || attachments.length > 0) && (
        <div className="flex flex-wrap gap-1">
          {context.map((c) =>
            isViewChip(c) ? (
              <span key={`view:${c.href}`} className="inline-flex h-[18px] min-w-0 items-center gap-1 rounded-sm border-hair border-line px-1 text-xxs text-fg-3 [&_svg]:size-3">
                {c.icon ?? <LayoutList />}
                <span className="truncate">{c.label}</span>
              </span>
            ) : (
              <EntityChip key={`${c.type}:${c.id}`} entity={c} variant="context" />
            )
          )}
          {attachments.map((a) => (
            <AttachmentChip key={a.id} a={a} onRemove={() => setAttachments((xs) => xs.filter((x) => x.id !== a.id))} />
          ))}
        </div>
      )}
      <EditorContent
        editor={editor}
        className="[&_.is-editor-empty:first-child]:before:pointer-events-none [&_.is-editor-empty:first-child]:before:float-left [&_.is-editor-empty:first-child]:before:h-0 [&_.is-editor-empty:first-child]:before:text-fg-hint [&_.is-editor-empty:first-child]:before:content-[attr(data-placeholder)] [&_p]:min-h-[22.5px]"
      />
      <SuggestPicker bridge={bridge} sources={mentionSources} />
      <div className="flex h-7 items-center justify-between">
        <div className="flex items-center gap-0.5">
          <HistoryMenu onSelect={(id) => { setSelectedChatId(id); onSent?.(id) }} />
          <span className="px-1 text-xxs text-fg-hint">@ to mention Ember or a teammate</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" className="size-7 text-fg-3 hover:text-fg-2" title="Upload file" onClick={() => fileRef.current?.click()}>
            <Paperclip />
          </Button>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept={ACCEPT}
            hidden
            onChange={(e) => {
              addFiles(e.target.files)
              e.target.value = ""
              editor?.commands.focus()
            }}
          />
          {busy && chatId ? (
            <button
              type="button"
              aria-label="Stop"
              onClick={() => stop(chatId)}
              className="flex h-7 w-10 items-center justify-center rounded-md bg-fill-hover text-fg hover:bg-fill-selected"
            >
              <Square className="size-2.5 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              aria-label="Send"
              disabled={!canSend}
              onClick={submit}
              className="flex h-7 w-10 items-center justify-center rounded-md bg-brand-soft text-white hover:bg-brand disabled:bg-fill-hover disabled:text-fg-disabled [&_svg]:size-4"
            >
              <CornerDownLeft />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function AttachmentChip({ a, onRemove }: { a: Attachment; onRemove: () => void }) {
  return (
    <span className="group/att inline-flex h-[18px] max-w-[180px] items-center gap-1 rounded-sm border-hair border-line px-1 text-xxs text-fg-2">
      {a.state === "uploading" ? (
        <Arc size={12} />
      ) : (
        <>
          <FileText className="size-3 shrink-0 text-fg-3 group-hover/att:hidden" />
          <button type="button" aria-label={`Remove ${a.name}`} onClick={onRemove} className="hidden text-fg-3 group-hover/att:block hover:text-fg">
            <X className="size-3" />
          </button>
        </>
      )}
      <span className="truncate">{a.name}</span>
    </span>
  )
}
