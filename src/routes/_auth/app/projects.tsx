import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import {
  EllipsisIcon,
  FolderIcon,
  FolderPlusIcon,
  LoaderCircleIcon,
  PencilIcon,
  Trash2Icon,
  UsersIcon,
} from "#/components/icons.ts";
import { PageHeader } from "#/components/page-header.tsx";
import { ProjectMembersDialog } from "#/components/project-members-dialog.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "#/components/ui/alert-dialog.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { toast } from "#/components/ui/toast.tsx";
import { $createProject, $deleteProject, $updateProject } from "#/lib/items/functions.ts";
import { itemKeys, projectKeys, projectsQueryOptions } from "#/lib/items/queries.ts";
import type { ProjectSummary } from "#/lib/items/service.server.ts";

const field = (data: FormData, name: string) => {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
};

export const Route = createFileRoute("/_auth/app/projects")({
  loader: async ({ context }) => {
    await context.queryClient.query(projectsQueryOptions());
  },
  head: () => ({ meta: [{ title: "Projects" }] }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const projects = useQuery(projectsQueryOptions());
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ to: "/app/items", label: "Items" }}
        icon={FolderIcon}
        title="Projects"
        subtitle="Folders for your items, usually one per repository."
        actions={
          <Button size="sm" onClick={() => setCreating(true)}>
            <FolderPlusIcon aria-hidden="true" />
            New project
          </Button>
        }
      />

      {projects.data && projects.data.length > 0 ? (
        <ul className="divide-y surface">
          {projects.data.map((project) => (
            <ProjectRow key={project.id} project={project} />
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed p-10 text-center">
          <span
            aria-hidden="true"
            className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground"
          >
            <FolderIcon className="size-7" />
          </span>
          <div className="space-y-1">
            <p className="font-medium">No projects yet</p>
            <p className="text-sm text-pretty text-muted-foreground">
              Create one per repository, or ask your agent to create one for the repo it is in.
            </p>
          </div>
          <Button onClick={() => setCreating(true)}>
            <FolderPlusIcon aria-hidden="true" />
            New project
          </Button>
        </div>
      )}

      {creating && <NewProjectDialog onClose={() => setCreating(false)} />}
    </div>
  );
}

function NewProjectDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: $createProject,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: projectKeys.all });
      toast.add({ type: "success", description: "Project created." });
      onClose();
    },
    onError: (error) => toast.add({ type: "error", description: error.message }),
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Link the repository so agents working in it file into this project.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            const name = field(data, "name");
            const key = field(data, "key");
            if (name && !create.isPending) create.mutate({ data: { name, key: key || null } });
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              name="name"
              placeholder="discerns"
              maxLength={100}
              autoComplete="off"
              required
              className="h-9"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-key">
              Repository <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="project-key"
              name="key"
              placeholder="git@github.com:acme/api.git"
              maxLength={300}
              autoComplete="off"
              aria-describedby="project-key-hint"
              className="h-9 font-mono text-[13px]"
            />
            <p id="project-key-hint" className="text-xs text-muted-foreground">
              Paste the output of <code className="font-mono">git remote get-url origin</code>.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <LoaderCircleIcon className="animate-spin" aria-hidden="true" />}
              Create project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProjectRow({ project }: { project: ProjectSummary }) {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<"members" | "rename" | "delete" | null>(null);
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: projectKeys.all }),
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() }),
    ]);
  const onError = (error: Error) => toast.add({ type: "error", description: error.message });

  const rename = useMutation({
    mutationFn: $updateProject,
    onSuccess: async () => {
      await refresh();
      setDialog(null);
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: $deleteProject,
    onSuccess: async () => {
      await refresh();
      toast.add({
        type: "success",
        description: `${project.name} deleted. Its items are unfiled.`,
      });
    },
    onError,
  });

  return (
    <li className="flex items-center gap-4 px-4 py-3 sm:px-5">
      <Link
        to="/app/items"
        search={{ project: project.id }}
        className="flex min-w-0 flex-1 items-center gap-4 rounded-xl focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
      >
        <span
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-selected text-selected-foreground"
        >
          <FolderIcon className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{project.name}</span>
          <span className="block truncate text-sm text-muted-foreground">
            {project.key ?? "No repository linked"}
            {project.access !== "owner" && ` · shared by ${project.ownerName}`}
          </span>
        </span>
      </Link>
      <span className="hidden text-xs text-muted-foreground tabular-nums sm:block">
        {project.itemCount} {project.itemCount === 1 ? "item" : "items"}
      </span>
      <Button variant="outline" size="sm" onClick={() => setDialog("members")}>
        <UsersIcon aria-hidden="true" />
        People
      </Button>
      {project.access === "owner" && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon-sm" aria-label="More actions" />}
          >
            <EllipsisIcon aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setDialog("rename")}>
              <PencilIcon aria-hidden="true" />
              Rename or relink
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => setDialog("delete")}>
              <Trash2Icon aria-hidden="true" />
              Delete project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {dialog === "members" && (
        <ProjectMembersDialog project={project} onClose={() => setDialog(null)} />
      )}
      {dialog === "rename" && (
        <AlertDialog open onOpenChange={(open) => !open && setDialog(null)}>
          <AlertDialogContent
            render={
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const data = new FormData(e.currentTarget);
                  rename.mutate({
                    data: {
                      id: project.id,
                      name: field(data, "name") || project.name,
                      key: field(data, "key") || null,
                    },
                  });
                }}
              />
            }
          >
            <AlertDialogHeader>
              <AlertDialogTitle>Rename {project.name}</AlertDialogTitle>
              <AlertDialogDescription>
                Items stay where they are. Changing the repository changes how agents find it.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`rename-${project.id}`}>Name</Label>
                <Input
                  id={`rename-${project.id}`}
                  name="name"
                  defaultValue={project.name}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`key-${project.id}`}>Repository</Label>
                <Input
                  id={`key-${project.id}`}
                  name="key"
                  defaultValue={project.key ?? ""}
                  placeholder="git@github.com:acme/api.git"
                />
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction type="submit" disabled={rename.isPending}>
                Save
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {dialog === "delete" && (
        <AlertDialog open onOpenChange={(open) => !open && setDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {project.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                The folder goes away and people lose project access. The items inside stay, as
                unfiled items you own.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={remove.isPending}
                onClick={() => remove.mutate({ data: { id: project.id } })}
              >
                Delete project
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </li>
  );
}
