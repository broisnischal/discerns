import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";

import { CodeEditor, LANGUAGE_NAMES, languageFor } from "#/components/code-editor.tsx";
import { LoaderCircleIcon, LockIcon } from "#/components/icons.ts";
import { VISIBILITY_META } from "#/components/item-list.tsx";
import { KIND_META, KindIcon } from "#/components/kind-badge.tsx";
import { TagInput } from "#/components/tag-input.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select.tsx";
import { toast } from "#/components/ui/toast.tsx";
import {
  ITEM_KINDS,
  ITEM_VISIBILITIES,
  type ItemKind,
  type ItemVisibility,
} from "#/lib/db/schema/types.ts";
import { projectsQueryOptions } from "#/lib/items/queries.ts";
import { cn } from "#/lib/utils.ts";

export interface ItemDraft {
  title: string;
  content: string;
  kind: ItemKind;
  language: string;
  tags: string[];
  visibility: ItemVisibility;
  /** Project id, or null for unfiled. */
  project: string | null;
}

const PLACEHOLDERS: Record<ItemKind, string> = {
  text: "Paste or write anything",
  prompt: "You are a careful code reviewer. For each change...",
  memory: "We deploy on Fridays only after the staging smoke test passes.",
  env: "DATABASE_URL=postgres://...\nAPI_KEY=...",
  code: "export function retry() { ... }",
  log: "Optional first line. Your agents and collaborators append the rest as they work.",
};

const NO_PROJECT = "__none";

const VISIBILITY_ITEMS = Object.fromEntries(
  ITEM_VISIBILITIES.map((visibility) => [visibility, VISIBILITY_META[visibility].label]),
);

export function parseTags(value: string) {
  return value
    .split(/[\s,]+/)
    .map((tag) => tag.replace(/^#/, "").trim().toLowerCase())
    .filter(Boolean);
}

/** Kind picker: a segmented control over native radios, so keyboard and screen readers come free. */
function KindPicker({
  value,
  onChange,
  disabled,
}: {
  value: ItemKind;
  onChange: (kind: ItemKind) => void;
  disabled: boolean;
}) {
  const name = useId();
  return (
    <fieldset
      className="flex w-fit max-w-full flex-wrap gap-1 rounded-2xl bg-muted/70 p-1"
      disabled={disabled}
    >
      <legend className="sr-only">Kind</legend>
      {ITEM_KINDS.map((kind) => {
        const checked = kind === value;
        return (
          <label
            key={kind}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-xl py-1.5 ps-1.5 pe-3 text-sm font-medium transition-colors duration-150 has-focus-visible:ring-3 has-focus-visible:ring-ring/30",
              checked
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
              disabled && !checked && "cursor-not-allowed opacity-40",
            )}
          >
            <input
              type="radio"
              name={name}
              value={kind}
              checked={checked}
              onChange={() => onChange(kind)}
              className="sr-only"
            />
            <KindIcon kind={kind} size="sm" className={cn(!checked && "opacity-70")} />
            {KIND_META[kind].label}
          </label>
        );
      })}
    </fieldset>
  );
}

export function ItemEditor({
  initial,
  kindLocked = false,
  contentLocked = false,
  canChangeVisibility = true,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  initial: ItemDraft;
  kindLocked?: boolean;
  /** Logs are append-only, so editing hides the content field. */
  contentLocked?: boolean;
  canChangeVisibility?: boolean;
  submitLabel: string;
  pending: boolean;
  onSubmit: (draft: ItemDraft) => void;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const set = <K extends keyof ItemDraft>(key: K, value: ItemDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));
  const projects = useQuery(projectsQueryOptions());

  const isEnv = draft.kind === "env";

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (pending) return;
        if (!contentLocked && draft.kind !== "log" && !draft.content.trim()) {
          toast.add({ type: "error", description: "Add some content before saving." });
          return;
        }
        onSubmit(isEnv ? { ...draft, visibility: "private" } : draft);
      }}
      aria-busy={pending}
    >
      <KindPicker value={draft.kind} onChange={(kind) => set("kind", kind)} disabled={kindLocked} />

      <div className="flex flex-col overflow-hidden surface transition-shadow duration-150 focus-within:ring-3 focus-within:ring-ring/30">
        <input
          aria-label="Title"
          value={draft.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Title (optional, taken from the first line if empty)"
          maxLength={200}
          autoComplete="off"
          className="h-12 w-full bg-transparent px-4 text-base font-medium outline-none placeholder:text-muted-foreground"
        />
        {!contentLocked && (
          <div className="border-t">
            <CodeEditor
              ariaLabel="Content"
              value={draft.content}
              onChange={(content) => set("content", content)}
              language={languageFor(draft.kind, draft.language)}
              placeholder={PLACEHOLDERS[draft.kind]}
              lineNumbers={draft.kind === "code"}
              spellCheck={!isEnv && draft.kind !== "code"}
            />
          </div>
        )}
      </div>
      {isEnv && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <LockIcon className="size-4 shrink-0" aria-hidden="true" />
          Encrypted before it is stored. Only people you add by email can open it.
        </p>
      )}

      <div className="divide-y border-y">
        {!isEnv && (
          <div className="settings-row">
            <Label htmlFor="visibility" className="text-muted-foreground">
              Who can see it
            </Label>
            <Select
              value={draft.visibility}
              onValueChange={(visibility) => set("visibility", visibility as ItemVisibility)}
              disabled={!canChangeVisibility}
              items={VISIBILITY_ITEMS}
            >
              <SelectTrigger id="visibility" className="w-full sm:ms-auto sm:w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ITEM_VISIBILITIES.map((visibility) => (
                  <SelectItem key={visibility} value={visibility}>
                    {VISIBILITY_META[visibility].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="settings-row">
          <Label htmlFor="project" className="text-muted-foreground">
            Project
          </Label>
          <Select
            value={draft.project ?? NO_PROJECT}
            onValueChange={(value) => set("project", value === NO_PROJECT ? null : value)}
            items={{
              [NO_PROJECT]: "No project",
              ...Object.fromEntries((projects.data ?? []).map((p) => [p.id, p.name])),
            }}
          >
            <SelectTrigger id="project" className="w-full sm:ms-auto sm:w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_PROJECT}>No project</SelectItem>
              {(projects.data ?? [])
                .filter((p) => p.access !== "viewer")
                .map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div className="settings-row sm:items-start">
          <Label htmlFor="tags" className="text-muted-foreground sm:pt-1.5">
            Tags
          </Label>
          <TagInput
            id="tags"
            value={draft.tags}
            onChange={(tags) => set("tags", tags)}
            placeholder="review, backend"
            className="w-full sm:ms-auto sm:w-72"
          />
        </div>
        {draft.kind === "code" && (
          <div className="settings-row">
            <Label htmlFor="language" className="text-muted-foreground">
              Language
            </Label>
            <Input
              id="language"
              list="language-options"
              value={draft.language}
              onChange={(e) => set("language", e.target.value)}
              placeholder="ts"
              maxLength={40}
              autoComplete="off"
              className="w-full sm:ms-auto sm:w-72"
            />
            <datalist id="language-options">
              {LANGUAGE_NAMES.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircleIcon className="animate-spin" aria-hidden="true" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
