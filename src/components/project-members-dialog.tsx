import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { LoaderCircleIcon, UserPlusIcon, XIcon } from "#/components/icons.ts";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog.tsx";
import { Input } from "#/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select.tsx";
import { toast } from "#/components/ui/toast.tsx";
import type { MemberRole } from "#/lib/db/schema/types.ts";
import { initials } from "#/lib/format.ts";
import { $shareProject, $unshareProject } from "#/lib/items/functions.ts";
import {
  contactsQueryOptions,
  projectKeys,
  projectMembersQueryOptions,
} from "#/lib/items/queries.ts";
import type { ProjectSummary } from "#/lib/items/service.server.ts";

const ROLE_LABEL: Record<MemberRole, string> = { viewer: "Can view", editor: "Can edit" };

/** Who is in a project. Adding someone gives them every item in it, now and later. */
export function ProjectMembersDialog({
  project,
  onClose,
}: {
  project: ProjectSummary;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [role, setRole] = useState<MemberRole>("viewer");
  const members = useQuery(projectMembersQueryOptions(project.id));
  const contacts = useQuery(contactsQueryOptions());
  const canManage = project.access === "owner";

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: projectKeys.members(project.id) }),
      queryClient.invalidateQueries({ queryKey: contactsQueryOptions().queryKey }),
    ]);
  const onError = (error: Error) => toast.add({ type: "error", description: error.message });

  const share = useMutation({
    mutationFn: $shareProject,
    onSuccess: async (result) => {
      await refresh();
      toast.add({ type: "success", description: `${result.name} is in ${project.name}.` });
    },
    onError,
  });
  const unshare = useMutation({ mutationFn: $unshareProject, onSuccess: refresh, onError });

  const memberIds = new Set(members.data?.members.map((m) => m.userId));
  const suggestions = (contacts.data ?? []).filter((c) => !memberIds.has(c.id)).slice(0, 6);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>People in {project.name}</DialogTitle>
          <DialogDescription>
            Everyone here sees every item in the project, including ones added later.
          </DialogDescription>
        </DialogHeader>

        {canManage && (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const email = new FormData(form).get("email");
              if (typeof email !== "string" || !email) return;
              share.mutate(
                { data: { id: project.id, email, role } },
                { onSuccess: () => form.reset() },
              );
            }}
          >
            <Input
              name="email"
              type="email"
              placeholder="name@example.com"
              aria-label="Email address"
              required
              className="flex-1"
            />
            <Select value={role} onValueChange={(r) => setRole(r as MemberRole)} items={ROLE_LABEL}>
              <SelectTrigger size="sm" className="w-28" aria-label="Role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Can view</SelectItem>
                <SelectItem value="editor">Can edit</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" disabled={share.isPending}>
              {share.isPending && <LoaderCircleIcon className="animate-spin" aria-hidden="true" />}
              Add
            </Button>
          </form>
        )}

        {canManage && suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((c) => (
              <button
                key={c.id}
                type="button"
                disabled={share.isPending}
                onClick={() => share.mutate({ data: { id: project.id, email: c.email, role } })}
                className="inline-flex h-7 items-center gap-1.5 rounded-full bg-muted ps-1 pe-2.5 text-xs font-medium transition-colors duration-150 hover:bg-selected hover:text-selected-foreground focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
              >
                <Avatar size="sm" className="size-5">
                  {c.image && <AvatarImage src={c.image} alt="" />}
                  <AvatarFallback className="text-[0.55rem]">{initials(c.name)}</AvatarFallback>
                </Avatar>
                <UserPlusIcon className="size-3.5 opacity-60" aria-hidden="true" />
                {c.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex max-h-72 flex-col gap-3 overflow-y-auto">
          {members.isPending ? (
            <p className="text-sm text-muted-foreground">Loading people</p>
          ) : members.data ? (
            <>
              <Person name={members.data.owner.name} email={members.data.owner.email}>
                <span className="text-xs text-muted-foreground">Owner</span>
              </Person>
              {members.data.members.map((member) => (
                <Person
                  key={member.userId}
                  name={member.name}
                  email={member.email}
                  image={member.image}
                >
                  {canManage ? (
                    <div className="flex items-center gap-1">
                      <Select
                        value={member.role}
                        disabled={share.isPending}
                        onValueChange={(next) =>
                          share.mutate({
                            data: { id: project.id, email: member.email, role: next as MemberRole },
                          })
                        }
                        items={ROLE_LABEL}
                      >
                        <SelectTrigger size="sm" className="w-28" aria-label="Role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Can view</SelectItem>
                          <SelectItem value="editor">Can edit</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove ${member.name}`}
                        onClick={() =>
                          unshare.mutate({ data: { id: project.id, email: member.email } })
                        }
                      >
                        <XIcon aria-hidden="true" />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">{ROLE_LABEL[member.role]}</span>
                  )}
                </Person>
              ))}
              {members.data.members.length === 0 && (
                <p className="text-sm text-muted-foreground">Only you so far.</p>
              )}
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Person({
  name,
  email,
  image,
  children,
}: {
  name: string;
  email: string;
  image?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <Avatar size="sm">
        {image && <AvatarImage src={image} alt="" />}
        <AvatarFallback>{initials(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{name}</div>
        <div className="truncate text-xs text-muted-foreground">{email}</div>
      </div>
      {children}
    </div>
  );
}
