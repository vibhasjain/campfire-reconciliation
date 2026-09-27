import { EntityChip } from "@/components/common/EntityChip"
import type { EntityRef } from "@/data/types"

/** Generic inline agent or teammate mention, with no record navigation. */
export function Mention({ entity }: { entity: EntityRef }) {
  return <EntityChip entity={entity} variant="mention" className="align-bottom" />
}
