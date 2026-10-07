import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LoaderCircleIcon } from "lucide-react";
import { useEffect } from "react";

import { Button } from "#/components/ui/button.tsx";
import { $acceptInvite } from "#/lib/items/functions.ts";
import { itemKeys } from "#/lib/items/queries.ts";

export const Route = createFileRoute("/_auth/invite/$token")({
  component: AcceptInvite,
});

function AcceptInvite() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { mutate, isError, error } = useMutation({
    mutationFn: $acceptInvite,
    onSuccess: async ({ itemId }) => {
      await queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
      await navigate({ to: "/p/$id", params: { id: itemId }, replace: true });
    },
  });

  // Accepting is idempotent from the user's point of view, so run it once on arrival.
  useEffect(() => {
    mutate({ data: { token } });
  }, [mutate, token]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      {isError ? (
        <>
          <h1 className="text-xl font-semibold">Couldn&apos;t open this invite</h1>
          <p className="text-sm text-balance text-muted-foreground">{error.message}</p>
          <Button render={<Link to="/app" />} nativeButton={false} variant="outline">
            Go to your items
          </Button>
        </>
      ) : (
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
          Opening the shared item
        </p>
      )}
    </div>
  );
}
