import { Flame } from "lucide-react"
import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar"
import { recon } from "@/recon/useRecon"
import type { Actor } from "@/recon/data"
import { cn } from "@/lib/utils"

const colors: Record<Actor, string> = {
  maya: "bg-brand-tint text-brand",
  daniel: "bg-accent-blue-tint text-accent-blue-text",
  priya: "bg-accent-purple-tint text-accent-purple-text",
  ember: "bg-brand text-ai",
}
export function ParticipantAvatar({
  actor,
  className,
}: {
  actor: Actor
  className?: string
}) {
  const teammate = recon.getState().teammates[actor]
  return (
    <Avatar size="sm" className={cn("size-6", className)} title={teammate.name}>
      <AvatarFallback className={cn("text-[9px] font-medium", colors[actor])}>
        {actor === "ember" ? <Flame className="size-4" /> : teammate.initials}
      </AvatarFallback>
    </Avatar>
  )
}
export function ParticipantStack({ actors }: { actors: Actor[] }) {
  return (
    <AvatarGroup className="-space-x-1.5">
      {[...new Set(actors)].slice(0, 3).map((actor) => (
        <ParticipantAvatar key={actor} actor={actor} className="size-5" />
      ))}
    </AvatarGroup>
  )
}
