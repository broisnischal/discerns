import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { z } from "zod";

import { ItemEditor, parseTags } from "#/components/item-editor.tsx";
import { toast } from "#/components/ui/toast.tsx";
import { ITEM_KINDS } from "#/lib/db/schema/types.ts";
import { $createItem } from "#/lib/items/functions.ts";
import { itemKeys } from "#/lib/items/queries.ts";

export const Route = createFileRoute("/_auth/app/new")({
  validateSearch: z.object({ kind: z.enum(ITEM_KINDS).optional().catch(undefined) }),
  component: NewItem,
});

function NewItem() {
  const { kind } = Route.useSearch();
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: $createItem,
    onSuccess: async ({ id }) => {
      await queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
      await navigate({ to: "/p/$id", params: { id } });
    },
    onError: (error) => toast.add({ type: "error", description: error.message }),
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">New item</h1>
      <ItemEditor
        initial={{
          title: "",
          content: "",
          kind: kind ?? "text",
          language: "",
          tags: "",
          visibility: "private",
        }}
        submitLabel="Save"
        pending={mutation.isPending}
        onCancel={() => router.history.back()}
        onSubmit={(draft) =>
          mutation.mutate({
            data: {
              title: draft.title,
              content: draft.content,
              kind: draft.kind,
              language: draft.language || null,
              tags: parseTags(draft.tags),
              visibility: draft.visibility,
            },
          })
        }
      />
    </div>
  );
}
