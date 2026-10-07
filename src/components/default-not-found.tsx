import { Link } from "@tanstack/react-router";

import { AppShell } from "#/components/app-shell.tsx";
import { CompassIcon } from "#/components/icons.ts";
import { Button } from "#/components/ui/button.tsx";

export function DefaultNotFound() {
  return (
    <AppShell>
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <span
          aria-hidden="true"
          className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground"
        >
          <CompassIcon className="size-7" />
        </span>
        <h1 className="text-xl font-semibold">Page not found</h1>
        <p className="text-sm text-pretty text-muted-foreground">
          The link may be wrong, or the page has moved.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            Go back
          </Button>
          <Button render={<Link to="/" />} nativeButton={false}>
            Go home
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
