import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { z } from "zod";

import { ItemEditor } from "#/components/item-editor.tsx";
import { PageHeader } from "#/components/page-header.tsx";
import { toast } from "#/components/ui/toast.tsx";
import { ITEM_KINDS } from "#/lib/db/schema/types.ts";
import { $createItem } from "#/lib/items/functions.ts";
import { itemKeys } from "#/lib/items/queries.ts";

export const Route = createFileRoute("/_auth/app/new")({
  validateSearch: z.object({
    kind: z.enum(ITEM_KINDS).optional().catch(undefined),
    project: z.string().optional().catch(undefined),
  }),
  head: () => ({ meta: [{ title: "New item" }] }),
  component: NewItem,
});

function NewItem() {
  const { kind, project } = Route.useSearch();
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
    <div className="flex flex-col gap-6">
      <PageHeader
        back={
          project
            ? { to: "/app/items", label: "Back", search: { project } }
            : { to: "/app/items", label: "Items" }
        }
        title="New item"
      />
      <ItemEditor
        initial={{
          title: "",
          content: "",
          kind: kind ?? "text",
          language: "",
          tags: [],
          visibility: "private",
          project: project ?? null,
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
              tags: draft.tags,
              visibility: draft.visibility,
              project: draft.project,
            },
          })
        }
      />
    </div>
  );
}
