import { Composer, type ComposerProps } from "./Composer"

/** Reusable docked form; its host supplies conversation context. */
export default function DockedComposer(props: Omit<ComposerProps, "variant">) {
  return <Composer {...props} variant="docked" />
}
