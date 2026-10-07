import { useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { LogOutIcon, PlugIcon, PlusIcon } from "lucide-react";

import { ThemeToggle } from "#/components/theme-toggle.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu.tsx";
import { authClient } from "#/lib/auth/auth-client.ts";
import { useAuth } from "#/lib/auth/hooks.ts";
import { authQueryOptions } from "#/lib/auth/queries.ts";
import { initials } from "#/lib/format.ts";
import { APP_NAME } from "#/lib/site.ts";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
      <span
        aria-hidden="true"
        className="grid size-6 place-items-center rounded-md bg-primary font-mono text-xs text-primary-foreground"
      >
        e/
      </span>
      {APP_NAME}
    </Link>
  );
}

export function AppHeader() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-6">
          <Logo />
          {user && (
            <nav className="hidden items-center gap-4 text-sm text-muted-foreground sm:flex">
              <Link
                to="/app"
                activeOptions={{ exact: true }}
                className="hover:text-foreground data-[status=active]:text-foreground"
              >
                Items
              </Link>
              <Link
                to="/app/connect"
                className="hover:text-foreground data-[status=active]:text-foreground"
              >
                Connect Claude
              </Link>
            </nav>
          )}
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button render={<Link to="/app/new" />} nativeButton={false} size="sm">
                <PlusIcon aria-hidden="true" />
                New
              </Button>
              <ThemeToggle />
              <UserMenu user={user} />
            </>
          ) : (
            <>
              <ThemeToggle />
              <Button render={<Link to="/login" />} nativeButton={false} size="sm">
                Sign in
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function UserMenu({ user }: { user: { name: string; email: string; image?: string | null } }) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const signOut = () =>
    authClient.signOut({
      fetchOptions: {
        onResponse: async () => {
          queryClient.setQueryData(authQueryOptions().queryKey, null);
          await router.navigate({ to: "/" });
          await router.invalidate();
        },
      },
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account" />
        }
      >
        <Avatar size="sm">
          {user.image && <AvatarImage src={user.image} alt="" />}
          <AvatarFallback>{initials(user.name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className="font-medium text-foreground">{user.name}</div>
            <div className="truncate text-xs font-normal">{user.email}</div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link to="/app/connect" />}>
          <PlugIcon aria-hidden="true" />
          Connect Claude
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={signOut}>
          <LogOutIcon aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
