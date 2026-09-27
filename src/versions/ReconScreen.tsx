import V1 from "./v1"
import V2 from "./v2"
import V3 from "./v3"

const VERSIONS = { 1: V1, 2: V2, 3: V3 } as const

export default function ReconScreen({ version }: { version: 1 | 2 | 3 }) {
  const Version = VERSIONS[version]
  return <Version />
}
