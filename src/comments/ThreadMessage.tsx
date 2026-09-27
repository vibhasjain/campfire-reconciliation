import type { Message } from "@/data/types"
import type { RunView } from "@/agent/engine"
import { ChatSteps, ChatMarkdown, ChatCard } from "@/features/agent"
import { recon } from "@/recon/useRecon"
import { cn } from "@/lib/utils"
import { ParticipantAvatar } from "./ParticipantAvatar"
import { reactTo, useComments } from "./store"

const EMOJI = ["👍", "✅", "👀"]
export function ThreadMessage({
  message,
  run,
}: {
  message: Message
  run?: RunView
}) {
  const actor =
    message.author ?? (message.role === "assistant" ? "ember" : "maya")
  const reactions = useComments((state) => state.reactions[message.id]) ?? {}
  const name = recon.getState().teammates[actor].name
  return (
    <article
      className="group/message relative flex gap-2.5 py-3"
      data-message-id={message.id}
      data-author={actor}
    >
      <ParticipantAvatar actor={actor} />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex min-h-5 items-center gap-2 pr-14">
          <span className="text-xs font-medium text-fg">{name}</span>
          <time
            dateTime={message.createdAt}
            title={new Date(message.createdAt).toLocaleString()}
            className="text-xxs whitespace-nowrap text-fg-4"
          >
            {relativeTime(message.createdAt)}
          </time>
        </div>
        <div className="[container-type:inline-size] flex min-w-0 flex-col gap-2 [&_table]:text-xs [&_td]:px-2 [&_th]:px-2">
          {message.role === "user" && (
            <ChatMarkdown
              markdown={message.text ?? ""}
              className="gap-2 text-sm leading-5 font-normal"
            />
          )}
          {message.role === "assistant" &&
            message.parts.map((part, index) =>
              part.type === "steps" ? (
                <ChatSteps
                  key={index}
                  part={part}
                  thinking={
                    !!run?.thinking && index === message.parts.length - 1
                  }
                />
              ) : part.type === "text" ? (
                <ChatMarkdown
                  key={index}
                  markdown={part.markdown}
                  streaming={part.streaming}
                  className="gap-2 text-sm leading-5 font-normal"
                />
              ) : (
                <ChatCard key={part.id} card={part.card} />
              )
            )}
          {run && message.parts.length === 0 && (
            <span className="text-xs text-fg-4" role="status">
              Thinking…
            </span>
          )}
          {run?.thinking &&
            message.parts.length > 0 &&
            message.parts.at(-1)?.type !== "steps" && (
              <span className="text-xs text-fg-4">Thinking…</span>
            )}
        </div>
        {Object.entries(reactions).some(([, actors]) => actors.length > 0) && (
          <div className="mt-2 flex gap-1">
            {Object.entries(reactions)
              .filter(([, actors]) => actors.length > 0)
              .map(([emoji, actors]) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => reactTo(message.id, emoji)}
                  aria-label={`React ${emoji}`}
                  aria-pressed={actors.includes("maya")}
                  className={cn(
                    "rounded-md border-hair border-line px-1.5 py-0.5 text-xxs",
                    actors.includes("maya")
                      ? "bg-brand-tint text-brand"
                      : "bg-fill-subtle text-fg-3"
                  )}
                >
                  {emoji} {actors.length}
                </button>
              ))}
          </div>
        )}
      </div>
      <div className="absolute top-1 right-0 flex rounded-md border-hair border-line bg-surface p-0.5 opacity-0 shadow-button transition-opacity group-focus-within/message:opacity-100 group-hover/message:opacity-100">
        {EMOJI.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => reactTo(message.id, emoji)}
            aria-label={`React ${emoji}`}
            aria-pressed={reactions[emoji]?.includes("maya") ?? false}
            className="flex size-6 items-center justify-center rounded-sm text-xs hover:bg-fill-hover focus-visible:bg-fill-hover"
          >
            {emoji}
          </button>
        ))}
      </div>
    </article>
  )
}

function relativeTime(at: string) {
  // Fixture comments are dated relative to this reconciliation's workday.
  const now =
    Date.parse(at) > Date.now()
      ? Date.parse(`${recon.getState().workedOn}T12:00:00`)
      : Date.now()
  const minutes = Math.max(0, Math.floor((now - Date.parse(at)) / 60000))
  if (minutes < 1) return "now"
  if (minutes < 60) return `${minutes}m`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`
  return `${Math.floor(minutes / 1440)}d`
}
