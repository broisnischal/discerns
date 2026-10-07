import { LoaderCircleIcon, LockIcon } from "lucide-react";
import { useState } from "react";

import { VISIBILITY_META } from "#/components/item-list.tsx";
import { KIND_META } from "#/components/kind-badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "#/components/ui/field.tsx";
import { Input } from "#/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import {
  ITEM_KINDS,
  ITEM_VISIBILITIES,
  type ItemKind,
  type ItemVisibility,
} from "#/lib/db/schema/types.ts";

export interface ItemDraft {
  title: string;
  content: string;
  kind: ItemKind;
  language: string;
  tags: string;
  visibility: ItemVisibility;
}

const PLACEHOLDERS: Record<ItemKind, string> = {
  text: "Paste or write anything",
  prompt: "You are a careful code reviewer. For each change...",
  memory: "We deploy on Fridays only after the staging smoke test passes.",
  env: "DATABASE_URL=postgres://...\nAPI_KEY=...",
  code: "export function retry() { ... }",
};

export function parseTags(value: string) {
  return value
    .split(/[\s,]+/)
    .map((tag) => tag.replace(/^#/, "").trim().toLowerCase())
    .filter(Boolean);
}

export function ItemEditor({
  initial,
  kindLocked = false,
  canChangeVisibility = true,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  initial: ItemDraft;
  kindLocked?: boolean;
  canChangeVisibility?: boolean;
  submitLabel: string;
  pending: boolean;
  onSubmit: (draft: ItemDraft) => void;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const set = <K extends keyof ItemDraft>(key: K, value: ItemDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const isEnv = draft.kind === "env";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!pending) onSubmit(isEnv ? { ...draft, visibility: "private" } : draft);
      }}
      aria-busy={pending}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="title">Title</FieldLabel>
          <Input
            id="title"
            value={draft.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Code review prompt"
            maxLength={200}
            required
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field>
            <FieldLabel>Kind</FieldLabel>
            <Select
              value={draft.kind}
              onValueChange={(kind) => set("kind", kind as ItemKind)}
              disabled={kindLocked}
            >
              <SelectTrigger className="w-full" aria-label="Kind">
                <SelectValue>{(value: ItemKind) => KIND_META[value].label}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ITEM_KINDS.map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {KIND_META[kind].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel>Who can see it</FieldLabel>
            <Select
              value={isEnv ? "private" : draft.visibility}
              onValueChange={(visibility) => set("visibility", visibility as ItemVisibility)}
              disabled={isEnv || !canChangeVisibility}
            >
              <SelectTrigger className="w-full" aria-label="Who can see it">
                <SelectValue>{(value: ItemVisibility) => VISIBILITY_META[value].label}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ITEM_VISIBILITIES.map((visibility) => (
                  <SelectItem key={visibility} value={visibility}>
                    {VISIBILITY_META[visibility].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {draft.kind === "code" && (
            <Field>
              <FieldLabel htmlFor="language">Language</FieldLabel>
              <Input
                id="language"
                value={draft.language}
                onChange={(e) => set("language", e.target.value)}
                placeholder="ts"
                maxLength={40}
              />
            </Field>
          )}
        </div>

        {isEnv && (
          <p className="flex items-start gap-2 rounded-xl bg-muted p-3 text-sm text-muted-foreground">
            <LockIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Env items are encrypted before they are stored and stay private. Share them with
            specific people only.
          </p>
        )}

        <Field>
          <FieldLabel htmlFor="content">Content</FieldLabel>
          <Textarea
            id="content"
            value={draft.content}
            onChange={(e) => set("content", e.target.value)}
            placeholder={PLACEHOLDERS[draft.kind]}
            className="min-h-72 font-mono text-sm"
            spellCheck={!isEnv && draft.kind !== "code"}
            autoComplete="off"
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="tags">Tags</FieldLabel>
          <Input
            id="tags"
            value={draft.tags}
            onChange={(e) => set("tags", e.target.value)}
            placeholder="review, backend"
          />
          <FieldDescription>
            Separate with commas or spaces. Claude can search by tag.
          </FieldDescription>
        </Field>

        <div className="flex justify-end gap-2">
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
      </FieldGroup>
    </form>
  );
}
