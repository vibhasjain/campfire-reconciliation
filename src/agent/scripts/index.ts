import type { Script } from "../types"
import { reconciliationScript, reconciliationFallback } from "./recon"

/** Keep the grounded fallback last: the engine uses it if a script emits no text. */
export const SCRIPTS: Script[] = [reconciliationScript, reconciliationFallback]
