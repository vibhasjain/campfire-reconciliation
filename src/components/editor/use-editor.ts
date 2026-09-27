import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { Editor, type EditorOptions } from "@tiptap/react"

type Options = Partial<EditorOptions>
type Callback = (...args: unknown[]) => unknown

const CALLBACKS = [
  "onBeforeCreate", "onCreate", "onUpdate", "onSelectionUpdate", "onTransaction", "onFocus", "onBlur", "onDestroy",
  "onContentError", "onDrop", "onPaste", "onDelete", "onMount", "onUnmount",
] as const
const mounted = new WeakSet<Editor>()
const pendingDestroy = new WeakMap<Editor, ReturnType<typeof setTimeout>>()

function create(options: Options, latest: () => Options) {
  const forward = Object.fromEntries(
    CALLBACKS.map((k) => [k, (...args: unknown[]) => (latest()[k] as Callback | undefined)?.(...args)])
  )
  const editor = new Editor({ ...options, ...forward })
  // an editor built by a render React threw away never mounts; free it
  setTimeout(() => !mounted.has(editor) && editor.destroy(), 1000)
  return editor
}

/**
 * tiptap's `useEditor` without its render-time race. tiptap destroys a fresh editor unless its component mounts
 * within 1ms; in a time-sliced render (route change, half-sheet) the mount comes later, so its editor store flips
 * to null mid-render and React throws the whole render away, redoes it synchronously and paints the editor a frame
 * late. Here the editor lives as long as the mounted component. Options are read once; callbacks always call the
 * latest ones.
 */
export function useEditor(options: Options): Editor {
  const latest = useRef(options)
  useLayoutEffect(() => {
    latest.current = options
  })
  // the ref is only read by the callbacks, after mount
  // eslint-disable-next-line react-hooks/refs
  const [editor, setEditor] = useState(() => create(options, () => latest.current))
  useEffect(() => {
    // destroyed before mounting (a render suspended past the orphan timeout): start over
    if (editor.isDestroyed) return setEditor(create(latest.current, () => latest.current))
    mounted.add(editor)
    clearTimeout(pendingDestroy.get(editor)) // StrictMode's immediate remount keeps the editor
    return () => void pendingDestroy.set(editor, setTimeout(() => editor.destroy()))
  }, [editor])
  return editor
}
