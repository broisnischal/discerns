import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { ItemEditor } from "#/components/item-editor.tsx";
import { PageHeader } from "#/components/page-header.tsx";
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
      <p className="surface p-6 text-sm text-muted-foreground">
        You can view this item but not edit it. Ask {item.owner.name} for editor access.
      </p>
    );
  }

  const isOwner = item.access === "owner";
  const isLog = item.kind === "log";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ to: "/p/$id", label: item.title, params: { id } } as never}
        title="Edit item"
      />
      <ItemEditor
        initial={{
          title: item.title,
          content: item.content,
          kind: item.kind,
          language: item.language ?? "",
          tags: item.tags,
          visibility: item.visibility,
          project: item.project?.id ?? null,
        }}
        kindLocked
        canChangeVisibility={isOwner}
        contentLocked={isLog}
        submitLabel={isLog ? "Save" : "Save new version"}
        pending={mutation.isPending}
        onCancel={() => navigate({ to: "/p/$id", params: { id } })}
        onSubmit={(draft) =>
          mutation.mutate({
            data: {
              id,
              title: draft.title,
              ...(!isLog && { content: draft.content }),
              language: draft.language || null,
              tags: draft.tags,
              project: draft.project,
              ...(isOwner && { visibility: draft.visibility }),
            },
          })
        }
      />
    </div>
  );
}
