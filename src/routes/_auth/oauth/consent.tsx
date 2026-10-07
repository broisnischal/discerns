import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";

import { CheckIcon, LoaderCircleIcon } from "#/components/icons.ts";
import { Button } from "#/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "#/components/ui/card.tsx";
import { authClient } from "#/lib/auth/auth-client.ts";
import { useAuthSuspense } from "#/lib/auth/hooks.ts";
import { $getConsentDetails } from "#/lib/auth/oauth-functions.ts";

export const Route = createFileRoute("/_auth/oauth/consent")({
  head: () => ({ meta: [{ title: "Allow access" }] }),
  component: ConsentPage,
});

function ConsentPage() {
  const { user } = useAuthSuspense();
  // The signature covers the raw query. The router's searchStr is re-serialized and turns
  // the repeated ba_param keys into one JSON array, which fails verification.
  const query = useRouter().history.location.search.replace(/^\?/, "");

  const details = useQuery({
    queryKey: ["oauth-consent", query],
    queryFn: ({ signal }) => $getConsentDetails({ data: { query }, signal }),
    retry: false,
    staleTime: Infinity,
  });

  // The client plugin reads the signed OAuth query from the URL and posts the decision.
  const decide = useMutation({
    mutationFn: async (accept: boolean) => {
      const result = await authClient.oauth2.consent({ accept });
      if (result.error) throw new Error(result.error.message ?? "Couldn't finish connecting");
      return result.data;
    },
    onSuccess: (data) => {
      if (data?.url) window.location.href = data.url;
    },
  });

  if (details.isPending) {
    return (
      <p className="mx-auto flex max-w-md items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
        Checking the request
      </p>
    );
  }

  if (details.isError) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-xl font-semibold">Can&apos;t connect</h1>
        <p className="mt-2 text-sm text-muted-foreground">{details.error.message}</p>
      </div>
    );
  }

  const { clientName, redirectHost, permissions } = details.data;

  return (
    <div className="mx-auto max-w-md py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Allow {clientName} to use your account?</CardTitle>
          <CardDescription>
            Signed in as {user?.email}
            {redirectHost && (
              <>
                . You&apos;ll return to{" "}
                <span className="font-medium text-foreground">{redirectHost}</span>
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2 text-sm">
            {permissions.map((permission) => (
              <li key={permission} className="flex items-start gap-2">
                <CheckIcon
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                {permission}
              </li>
            ))}
          </ul>
          {decide.isError && (
            <p className="mt-4 text-sm text-destructive">{decide.error.message}</p>
          )}
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="ghost" disabled={decide.isPending} onClick={() => decide.mutate(false)}>
            Deny
          </Button>
          <Button disabled={decide.isPending} onClick={() => decide.mutate(true)}>
            {decide.isPending && <LoaderCircleIcon className="animate-spin" aria-hidden="true" />}
            Allow
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
