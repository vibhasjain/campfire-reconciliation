import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react"
import { EntityChip } from "@/components/common/EntityChip"

/** Inline chip for a mention node (id = "<type>:<id>"). */
export function MentionView({ node }: ReactNodeViewProps) {
  const [type, ...rest] = String(node.attrs.id).split(":")
  return (
    <NodeViewWrapper as="span" className="mx-px inline-block align-baseline" contentEditable={false}>
      <EntityChip entity={{ type, id: rest.join(":"), label: String(node.attrs.label ?? rest.join(":")) }} variant="mention" />
    </NodeViewWrapper>
  )
}
