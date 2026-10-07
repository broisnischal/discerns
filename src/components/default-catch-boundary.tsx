import {
  ErrorComponent,
  type ErrorComponentProps,
  Link,
  rootRouteId,
  useMatch,
  useRouter,
} from "@tanstack/react-router";

import { TriangleAlertIcon } from "#/components/icons.ts";

import { Button } from "./ui/button";

export function DefaultCatchBoundary({ error }: Readonly<ErrorComponentProps>) {
  const router = useRouter();
  const isRoot = useMatch({
    strict: false,
    select: (state) => state.id === rootRouteId,
  });

  console.error(error);

  return (
    <div className="mx-auto flex max-w-md min-w-0 flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <span
        aria-hidden="true"
        className="grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive"
      >
        <TriangleAlertIcon className="size-7" />
      </span>
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-pretty text-muted-foreground">
        Try again. If it keeps happening, go back and retry from there.
      </p>
      {import.meta.env.DEV && (
        <div className="w-full text-start">
          <ErrorComponent error={error} />
        </div>
      )}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            router.invalidate();
          }}
        >
          Try again
        </Button>
        {isRoot ? (
          <Button render={<Link to="/" />} nativeButton={false}>
            Go home
          </Button>
        ) : (
          <Button
            render={
              <Link
                to="/"
                onClick={(e) => {
                  e.preventDefault();
                  window.history.back();
                }}
              />
            }
            nativeButton={false}
          >
            Go back
          </Button>
        )}
      </div>
    </div>
  );
}
