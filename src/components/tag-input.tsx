import { useId, useRef, useState } from "react";

import { XIcon } from "#/components/icons.ts";
import { cn } from "#/lib/utils.ts";

const normalize = (value: string) => value.replace(/^#/, "").trim().toLowerCase();

/** Chips plus a text field: Enter, comma, or space commits a tag; Backspace removes the last. */
export function TagInput({
  value,
  onChange,
  id,
  placeholder = "Add a tag",
  max = 20,
  className,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  id?: string;
  placeholder?: string;
  max?: number;
  className?: string;
}) {
  const [draft, setDraft] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();

  const commit = (raw: string) => {
    const tags = raw
      .split(/[\s,]+/)
      .map(normalize)
      .filter((tag) => tag && !value.includes(tag));
    if (tags.length) onChange([...value, ...tags].slice(0, max));
    setDraft("");
  };

  return (
    // The wrapper is the visible field; clicking anywhere in it focuses the text input.
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      onClick={() => input.current?.focus()}
      className={cn(
        "flex min-h-8 w-full cursor-text flex-wrap items-center gap-1.5 rounded-2xl bg-input/50 px-2 py-1 transition-[box-shadow] duration-150 focus-within:ring-3 focus-within:ring-ring/30",
        className,
      )}
    >
      {value.length > 0 && (
        <ul id={listId} className="contents" aria-label="Tags">
          {value.map((tag) => (
            <li
              key={tag}
              className="inline-flex h-6 items-center gap-1 rounded-md bg-selected ps-2 pe-1 text-xs font-medium text-selected-foreground"
            >
              #{tag}
              <button
                type="button"
                aria-label={`Remove ${tag}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(value.filter((t) => t !== tag));
                }}
                className="grid size-4 place-items-center rounded-sm hover:bg-selected-foreground/15 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
              >
                <XIcon className="size-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        ref={input}
        id={id}
        value={draft}
        onChange={(e) => {
          const next = e.target.value;
          if (/[\s,]$/.test(next)) commit(next);
          else setDraft(next);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && draft) {
            e.preventDefault();
            commit(draft);
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => draft && commit(draft)}
        onPaste={(e) => {
          const text = e.clipboardData.getData("text");
          if (/[\s,]/.test(text)) {
            e.preventDefault();
            commit(`${draft} ${text}`);
          }
        }}
        placeholder={value.length ? "" : placeholder}
        aria-describedby={value.length ? listId : undefined}
        autoComplete="off"
        className="h-6 min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
