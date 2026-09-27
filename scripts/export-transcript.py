#!/usr/bin/env python3
"""Export Claude Code session JSONL → public-safe Markdown.

Keeps: the owner's messages, the assistant's visible replies, one line per tool call (name + description).
Drops: system reminders, CLAUDE.md/memory context, tool results, thinking, hook output.
Redacts: emails, secret-looking tokens, 1Password/Supabase/Fly URLs, home paths.
Usage: export_transcript.py out.md session1.jsonl [session2.jsonl ...]
"""
import json, re, sys
from datetime import datetime, timedelta, timezone

ET = timezone(timedelta(hours=-4))
from pathlib import Path
_TERMS = Path(__file__).resolve().parent.parent / "private" / "redact-terms.txt"
PRIVATE = [
    (re.compile(re.escape(term.strip()), re.I), repl.strip())
    for line in (_TERMS.read_text().splitlines() if _TERMS.exists() else [])
    if "=>" in line and not line.lstrip().startswith("#")
    for term, repl in [line.split("=>", 1)]
]
REDACT = [
    # Private names (other projects, sessions, the design system's origin) live in the gitignored
    # private/redact-terms.txt, one "term => replacement" per line, so this public script never names them.
    (re.compile(r"^.*(?:data-summon|triple-click|hidden/summon|summon mode|agent-keyboard\.fly\.dev).*$", re.M | re.I), "[widget integration details redacted]"),
    (re.compile(r"-Users-[^-\s/]+-"), "-~-"),
    (re.compile(r"installation is `\d+`", re.I), "installation is `[id]`"),

    (re.compile(r"https://share\.1password\.com/\S+"), "[1Password share link redacted]"),
    (re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+"), "[email]"),
    (re.compile(r"https?://[\w.-]*supabase\.(co|com)\S*"), "[supabase url]"),
    (re.compile(r"\b(sk|pk|rk|ghp|gho|github_pat|xox[abp]|fm2|FlyV1)[_-][\w-]{10,}"), "[token]"),
    (re.compile(r"\beyJ[\w-]{20,}\.[\w-]{10,}\.[\w-]{10,}"), "[jwt]"),
    (re.compile(r"\b[A-Z0-9]{10}\b(?=.*(key|Key|KEY))"), "[key id]"),
    (re.compile(r"postgres\.[a-z0-9]{10,}"), "[db user]"),
    (re.compile(r"/(?:Users|home)/[^/\s]+/"), "~/"),
    (re.compile(r"/private/tmp/claude-501/[^\s)`'\"]+"), "[scratch]"),
    (re.compile(r"session_[A-Za-z0-9]{20,}"), "[session]"),
]
DROP_USER = ("Another Claude session sent a message", "{\"type\":\"idle_notification\"", "{\"type\": \"idle_notification\"", "<system-reminder>", "<local-command", "<command-name>", "<task-notification>", "Base directory for this skill", "<teammate-message", "Caveat:", "[Request interrupted")


def clean(text: str) -> str:
    text = re.sub(r"<system-reminder>.*?</system-reminder>", "", text, flags=re.S)
    for pat, rep in PRIVATE:
        text = pat.sub(rep, text)
    for pat, rep in REDACT:
        text = pat.sub(rep, text)
    return text.strip()


def when(ts: str) -> str:
    return datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone(ET).strftime("%b %d %H:%M ET")


def export(path: str, out: list[str]) -> None:
    out.append(f"\n\n# Session {path.rsplit('/', 1)[-1].split('.')[0][:8]}\n")
    for line in open(path):
        try:
            d = json.loads(line)
        except ValueError:
            continue
        if d.get("isSidechain") or d.get("isMeta"):
            continue
        msg, ts = d.get("message") or {}, d.get("timestamp", "")
        if d.get("type") == "queue-operation" and d.get("operation") == "enqueue":
            raw = d.get("content") if isinstance(d.get("content"), str) else ""
            if raw and not raw.lstrip().startswith(("<task-notification", "<teammate-message", "<cross-session")) and not raw.lstrip().startswith(DROP_USER):
                text = clean(re.sub(r"</?pasted_content[^>]*>", "", raw))
                if text:
                    out.append(f"\n**Vibhas** (while Claude was working) · {when(ts)}\n\n{text}\n")
            continue
        role, content = msg.get("role"), msg.get("content")
        parts = content if isinstance(content, list) else [{"type": "text", "text": content or ""}]
        if d.get("type") == "user" and role == "user":
            texts = [p.get("text", "") for p in parts if p.get("type") == "text"]
            text = "\n".join(t for t in texts if t and not t.lstrip().startswith(DROP_USER))
            text = clean(text)
            if text:
                out.append(f"\n**Vibhas** · {when(ts)}\n\n{text}\n")
        elif d.get("type") == "assistant":
            for p in parts:
                if p.get("type") == "text" and clean(p.get("text", "")):
                    out.append(f"\n**Claude** · {when(ts)}\n\n{clean(p['text'])}\n")
                elif p.get("type") == "tool_use":
                    inp = p.get("input") or {}
                    desc = inp.get("description") or inp.get("summary") or inp.get("skill") or inp.get("subagent_type") or ""
                    out.append(f"- `{p.get('name')}` {clean(str(desc))[:140]}")


if __name__ == "__main__":
    out = ["# Session transcript: Campfire reconciliation take-home",
           "Exported from Claude Code. System context, tool outputs and private details are removed; tool calls are summarized one per line."]
    for path in sys.argv[2:]:
        export(path, out)
    open(sys.argv[1], "w").write("\n".join(line.rstrip() for line in "\n".join(out).splitlines()).rstrip() + "\n")
    print(sys.argv[1], sum(len(x) for x in out), "chars")
