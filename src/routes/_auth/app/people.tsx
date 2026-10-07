import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { FolderIcon, UsersIcon } from "#/components/icons.ts";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu.tsx";
import { toast } from "#/components/ui/toast.tsx";
import { initials } from "#/lib/format.ts";
import { $shareProject } from "#/lib/items/functions.ts";
import { contactsQueryOptions, projectKeys, projectsQueryOptions } from "#/lib/items/queries.ts";
import type { Contact } from "#/lib/items/service.server.ts";

export const Route = createFileRoute("/_auth/app/people")({
  loader: async ({ context }) => {
    await context.queryClient.query(contactsQueryOptions());
  },
  head: () => ({ meta: [{ title: "People" }] }),
  component: PeoplePage,
});

function PeoplePage() {
  const contacts = useQuery(contactsQueryOptions());

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">People</h1>
        <p className="text-sm text-pretty text-muted-foreground">
          Everyone you share with, and everyone who shares with you. Add any of them to a project to
          share the whole folder.
        </p>
      </div>

      {contacts.data && contacts.data.length > 0 ? (
        <ul className="divide-y surface">
          {contacts.data.map((person) => (
            <PersonRow key={person.id} person={person} />
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed p-10 text-center">
          <span
            aria-hidden="true"
            className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground"
          >
            <UsersIcon className="size-7" />
          </span>
          <div className="space-y-1">
            <p className="font-medium">No one yet</p>
            <p className="text-sm text-pretty text-muted-foreground">
              Share an item or a project with someone by email and they will show up here.
            </p>
          </div>
          <Button render={<Link to="/app/projects" />} nativeButton={false} variant="outline">
            Go to projects
          </Button>
        </div>
      )}
    </div>
  );
}

function PersonRow({ person }: { person: Contact }) {
  const queryClient = useQueryClient();
  const projects = useQuery(projectsQueryOptions());
  const share = useMutation({
    mutationFn: $shareProject,
    onSuccess: async (result, { data }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: contactsQueryOptions().queryKey }),
        queryClient.invalidateQueries({ queryKey: projectKeys.all }),
      ]);
      const name = projects.data?.find((p) => p.id === data.id)?.name ?? "the project";
      toast.add({ type: "success", description: `${result.name} can now view ${name}.` });
    },
    onError: (error) => toast.add({ type: "error", description: error.message }),
  });

  const inProjects = new Set(person.sharedProjects.map((p) => p.id));
  const addable = (projects.data ?? []).filter(
    (p) => p.access === "owner" && !inProjects.has(p.id),
  );
  const shared = [
    person.itemsISharedWithThem > 0 && `${person.itemsISharedWithThem} shared by you`,
    person.itemsTheyShared > 0 && `${person.itemsTheyShared} shared with you`,
  ].filter(Boolean);

  return (
    <li className="flex items-center gap-4 px-4 py-3 sm:px-5">
      <Avatar className="rounded-xl after:rounded-xl">
        {person.image && <AvatarImage src={person.image} alt="" className="rounded-xl" />}
        <AvatarFallback className="rounded-xl">{initials(person.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{person.name}</div>
        <div className="truncate text-sm text-muted-foreground">
          {person.email}
          {shared.length > 0 && ` · ${shared.join(", ")}`}
        </div>
        {person.sharedProjects.length > 0 && (
          <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label="Shared projects">
            {person.sharedProjects.map((p) => (
              <li key={p.id}>
                <Link
                  to="/app/items"
                  search={{ project: p.id }}
                  className="inline-flex h-6 items-center gap-1 rounded-md bg-muted px-2 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
                >
                  <FolderIcon className="size-3" aria-hidden="true" />
                  {p.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      {addable.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="outline" size="sm" disabled={share.isPending} />}
          >
            <FolderIcon aria-hidden="true" />
            Add to project
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Share a whole folder</DropdownMenuLabel>
            {addable.map((p) => (
              <DropdownMenuItem
                key={p.id}
                onClick={() =>
                  share.mutate({ data: { id: p.id, email: person.email, role: "viewer" } })
                }
              >
                <FolderIcon aria-hidden="true" />
                {p.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  );
}
