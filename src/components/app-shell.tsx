import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter, useSearch } from "@tanstack/react-router";
import { useId } from "react";

import {
  FolderIcon,
  FolderPlusIcon,
  HomeIcon,
  LayersIcon,
  LogOutIcon,
  PlugIcon,
  PlusIcon,
  SettingsIcon,
  UsersIcon,
  type Icon,
} from "#/components/icons.ts";
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
import { projectsQueryOptions } from "#/lib/items/queries.ts";
import { APP_NAME } from "#/lib/site.ts";
import { cn } from "#/lib/utils.ts";

/** The app mark: two stacked cards on a blue tile. Same artwork as public/favicon.svg. */
export function LogoMark({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 512 512" aria-hidden="true" className={cn("size-8 shrink-0", className)}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4A86F2" />
          <stop offset="1" stopColor="#2459D6" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="114" fill={`url(#${id})`} />
      <rect x="186" y="98" width="218" height="258" rx="48" fill="#fff" fillOpacity="0.42" />
      <rect x="108" y="154" width="218" height="258" rx="48" fill="#fff" />
      <rect x="152" y="222" width="132" height="32" rx="16" fill="#2E66DE" />
      <rect x="152" y="284" width="88" height="32" rx="16" fill="#2E66DE" />
    </svg>
  );
}

export function Logo({
  withName = false,
  markClassName = "size-9",
}: {
  withName?: boolean;
  markClassName?: string;
}) {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-2.5 rounded-xl font-semibold tracking-tight focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
    >
      <LogoMark className={markClassName} />
      <span className={cn(!withName && "sr-only")}>{APP_NAME}</span>
    </Link>
  );
}

const NAV: {
  to: "/app" | "/app/items" | "/app/new" | "/app/connect" | "/app/people" | "/app/settings";
  label: string;
  icon: Icon;
}[] = [
  { to: "/app", label: "Overview", icon: HomeIcon },
  { to: "/app/items", label: "Items", icon: LayersIcon },
  { to: "/app/new", label: "New item", icon: PlusIcon },
  { to: "/app/people", label: "People", icon: UsersIcon },
  { to: "/app/connect", label: "Connect agents", icon: PlugIcon },
  { to: "/app/settings", label: "Settings", icon: SettingsIcon },
];

const navLinkClass =
  "flex shrink-0 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted/70 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none data-[status=active]:bg-selected data-[status=active]:text-selected-foreground";

/** The user's projects as folders under the main nav; wide screens only, the Items filter covers phones. */
function ProjectNav() {
  const projects = useQuery(projectsQueryOptions());
  if (!projects.data?.length) {
    return (
      <Link
        to="/app/projects"
        className="hidden items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none md:flex"
      >
        <FolderPlusIcon className="size-4" aria-hidden="true" />
        New project
      </Link>
    );
  }
  return (
    <div className="hidden flex-col gap-1 md:flex">
      <div className="flex items-center justify-between px-3 pt-4 pb-1">
        <span className="text-xs font-medium tracking-wide text-muted-foreground/70 uppercase">
          Projects
        </span>
        <Link
          to="/app/projects"
          aria-label="Manage projects"
          className="rounded-md text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
        >
          <SettingsIcon className="size-4" aria-hidden="true" />
        </Link>
      </div>
      {projects.data.slice(0, 8).map((p) => (
        <Link
          key={p.id}
          to="/app/items"
          search={{ project: p.id }}
          activeOptions={{ includeSearch: true }}
          className={cn(navLinkClass, "py-2 text-sm md:text-sm")}
        >
          <FolderIcon className="size-4" aria-hidden="true" />
          <span className="truncate">{p.name}</span>
          <span className="ms-auto text-xs tabular-nums opacity-60">{p.itemCount}</span>
        </Link>
      ))}
      {projects.data.length > 8 && (
        <Link
          to="/app/projects"
          className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          All {projects.data.length} projects
        </Link>
      )}
    </div>
  );
}

/**
 * Page chrome: one centered block with the logo and account controls on the top row,
 * then a narrow nav column beside the content. The auth query is prefetched in the root
 * route, so the server renders the same variant the client hydrates.
 */
function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:bg-card focus:px-3 focus:py-2"
    >
      Skip to content
    </a>
  );
}

/**
 * App frame. Signed in: a sidebar with the logo on top, navigation and projects in the
 * middle, and the account at the bottom; the page starts on the same top edge as the logo.
 * Phones get a top bar and a scrolling nav row instead. Signed out: a slim header.
 * The auth query is prefetched in the root route, so the server renders the right variant.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const projectSelected = Boolean(useSearch({ strict: false }).project);

  if (!user) {
    return (
      <div className="flex min-h-svh flex-col">
        <SkipLink />
        <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-5 sm:px-8">
          <Logo withName />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button render={<Link to="/login" />} nativeButton={false}>
              Sign in
            </Button>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-5 pt-6 pb-16 sm:px-8">
          {children}
        </main>
      </div>
    );
  }

  const nav = NAV.map((item) => (
    <Link
      key={item.to}
      to={item.to}
      activeOptions={
        // Inside a project the project entry is the active one, so Items matches only
        // when no search params are set (an exact, empty match fails).
        item.to === "/app/items" && projectSelected
          ? { exact: true, includeSearch: true }
          : { exact: item.to === "/app", includeSearch: false }
      }
      className={navLinkClass}
    >
      <item.icon className="size-5" aria-hidden="true" />
      {item.label}
    </Link>
  ));

  return (
    <div className="mx-auto w-full max-w-6xl md:grid md:grid-cols-[14.5rem_minmax(0,1fr)] md:gap-10 md:px-8">
      <SkipLink />

      {/* Phones: top bar, then a scrolling row of nav pills. */}
      <div className="md:hidden">
        <header className="flex h-16 items-center justify-between gap-3 px-5 sm:px-8">
          <Logo withName markClassName="size-8" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu user={user} compact />
          </div>
        </header>
        <nav aria-label="Main" className="flex gap-1 overflow-x-auto px-5 pb-2 sm:px-8">
          {nav}
        </nav>
      </div>

      {/* Wider screens: a full-height sidebar. Logo, nav icons, and account share one edge. */}
      <aside className="sticky top-0 hidden h-svh flex-col gap-6 py-8 md:flex">
        <div className="flex h-9 items-center px-3">
          <Logo withName markClassName="size-7" />
        </div>
        <nav aria-label="Main" className="flex flex-col gap-0.5">
          {nav}
        </nav>
        <ProjectNav />
        <div className="mt-auto flex items-center gap-1 border-t pt-4">
          <UserMenu user={user} />
          <ThemeToggle />
        </div>
      </aside>

      <main id="main" className="min-w-0 px-5 pt-4 pb-16 sm:px-8 md:px-0 md:pt-8">
        <div className="mx-auto w-full max-w-3xl">{children}</div>
      </main>
    </div>
  );
}

function UserMenu({
  user,
  compact = false,
}: {
  user: { name: string; email: string; image?: string | null };
  compact?: boolean;
}) {
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
          compact ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Account menu"
              className="overflow-hidden rounded-[10px] p-0 hover:opacity-90"
            />
          ) : (
            <Button
              variant="ghost"
              aria-label="Account menu"
              className="h-auto min-w-0 flex-1 justify-start gap-2.5 rounded-xl px-2 py-1.5"
            />
          )
        }
      >
        <Avatar className="size-8 rounded-[10px] after:rounded-[10px]">
          {user.image && <AvatarImage src={user.image} alt="" className="rounded-[10px]" />}
          <AvatarFallback className="rounded-[10px] text-xs">{initials(user.name)}</AvatarFallback>
        </Avatar>
        {!compact && (
          <span className="min-w-0 flex-1 text-start">
            <span className="block truncate text-sm font-medium">{user.name}</span>
            <span className="block truncate text-xs font-normal text-muted-foreground">
              {user.email}
            </span>
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={compact ? "end" : "start"}
        side={compact ? "bottom" : "top"}
        className="min-w-56"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className="font-medium text-foreground">{user.name}</div>
            <div className="truncate text-xs font-normal">{user.email}</div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link to="/app/settings" />}>
          <SettingsIcon aria-hidden="true" />
          Account settings
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={signOut}>
          <LogOutIcon aria-hidden="true" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
