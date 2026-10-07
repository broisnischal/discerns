import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { ItemEditor, parseTags } from "#/components/item-editor.tsx";
import { toast } from "#/components/ui/toast.tsx";
import { $updateItem } from "#/lib/items/functions.ts";
import { itemKeys, itemQueryOptions } from "#/lib/items/queries.ts";

export const Route = createFileRoute("/_auth/p/$id/edit")({
  loader: async ({ context, params }) => {
    await context.queryClient.query(itemQueryOptions(params.id));
  },
  component: EditItem,
});

function EditItem() {
  const { id } = Route.useParams();
  const { data: item } = useSuspenseQuery(itemQueryOptions(id));
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: $updateItem,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: itemKeys.detail(id) });
      await queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
      await navigate({ to: "/p/$id", params: { id } });
    },
    onError: (error) => toast.add({ type: "error", description: error.message }),
  });

  if (item.access !== "owner" && item.access !== "editor") {
    return (
      <p className="rounded-xl border p-6 text-sm text-muted-foreground">
        You can view this item but not edit it. Ask {item.owner.name} for editor access.
      </p>
    );
  }

  const isOwner = item.access === "owner";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Edit item</h1>
      <ItemEditor
        initial={{
          title: item.title,
          content: item.content,
          kind: item.kind,
          language: item.language ?? "",
          tags: item.tags.join(", "),
          visibility: item.visibility,
        }}
        kindLocked
        canChangeVisibility={isOwner}
        submitLabel="Save new version"
        pending={mutation.isPending}
        onCancel={() => navigate({ to: "/p/$id", params: { id } })}
        onSubmit={(draft) =>
          mutation.mutate({
            data: {
              id,
              title: draft.title,
              content: draft.content,
              language: draft.language || null,
              tags: parseTags(draft.tags),
              ...(isOwner && { visibility: draft.visibility }),
            },
          })
        }
      />
    </div>
  );
}
