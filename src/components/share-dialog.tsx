import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircleIcon, Share2Icon, XIcon } from "lucide-react";
import { useState } from "react";

import { CopyButton } from "#/components/copy-button.tsx";
import { VISIBILITY_META } from "#/components/item-list.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#/components/ui/dialog.tsx";
import { Input } from "#/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select.tsx";
import { Separator } from "#/components/ui/separator.tsx";
import { toast } from "#/components/ui/toast.tsx";
import { ITEM_VISIBILITIES, type ItemVisibility, type MemberRole } from "#/lib/db/schema/types.ts";
import { initials } from "#/lib/format.ts";
import { $shareItem, $unshareItem, $updateItem } from "#/lib/items/functions.ts";
import { collaboratorsQueryOptions, itemKeys } from "#/lib/items/queries.ts";
import type { ItemDetail } from "#/lib/items/service.server.ts";

const ROLE_LABEL: Record<MemberRole, string> = { viewer: "Can view", editor: "Can edit" };

function RoleSelect({
  value,
  onChange,
  disabled,
}: {
  value: MemberRole;
  onChange: (role: MemberRole) => void;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value}
      onValueChange={(role) => onChange(role as MemberRole)}
      disabled={disabled}
    >
      <SelectTrigger size="sm" className="w-28" aria-label="Role">
        <SelectValue>{(role: MemberRole) => ROLE_LABEL[role]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="viewer">Can view</SelectItem>
        <SelectItem value="editor">Can edit</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function ShareDialog({ item }: { item: ItemDetail }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<MemberRole>("viewer");
  const queryClient = useQueryClient();
  const collaborators = useQuery({ ...collaboratorsQueryOptions(item.id), enabled: open });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: collaboratorsQueryOptions(item.id).queryKey });

  const share = useMutation({
    mutationFn: $shareItem,
    onSuccess: async (result, { data }) => {
      await refresh();
      toast.add({
        type: "success",
        description:
          result.status === "added"
            ? `${result.name} can now ${data.role === "editor" ? "edit" : "view"} this item.`
            : `Invite created for ${result.email}. Send them the invite link.`,
      });
    },
    onError: (error) => toast.add({ type: "error", description: error.message }),
  });

  const unshare = useMutation({
    mutationFn: $unshareItem,
    onSuccess: refresh,
    onError: (error) => toast.add({ type: "error", description: error.message }),
  });

  const setVisibility = useMutation({
    mutationFn: $updateItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: itemKeys.detail(item.id) }),
    onError: (error) => toast.add({ type: "error", description: error.message }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Share2Icon aria-hidden="true" />
        Share
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share &ldquo;{item.title}&rdquo;</DialogTitle>
          <DialogDescription>
            People you add can find this item in their list and through Claude.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const email = new FormData(form).get("email");
            if (typeof email !== "string" || !email) return;
            share.mutate({ data: { id: item.id, email, role } }, { onSuccess: () => form.reset() });
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
          <RoleSelect value={role} onChange={setRole} />
          <Button type="submit" disabled={share.isPending}>
            {share.isPending && <LoaderCircleIcon className="animate-spin" aria-hidden="true" />}
            Add
          </Button>
        </form>

        <div className="flex max-h-72 flex-col gap-3 overflow-y-auto">
          {collaborators.isPending ? (
            <p className="text-sm text-muted-foreground">Loading people with access</p>
          ) : collaborators.data ? (
            <>
              <Person
                name={collaborators.data.owner.name}
                email={collaborators.data.owner.email}
                image={collaborators.data.owner.image}
                trailing={<span className="text-xs text-muted-foreground">Owner</span>}
              />
              {collaborators.data.members.map((member) => (
                <Person
                  key={member.userId}
                  name={member.name}
                  email={member.email}
                  image={member.image}
                  trailing={
                    <div className="flex items-center gap-1">
                      <RoleSelect
                        value={member.role}
                        disabled={share.isPending}
                        onChange={(next) =>
                          share.mutate({ data: { id: item.id, email: member.email, role: next } })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove ${member.name}`}
                        onClick={() =>
                          unshare.mutate({ data: { id: item.id, email: member.email } })
                        }
                      >
                        <XIcon aria-hidden="true" />
                      </Button>
                    </div>
                  }
                />
              ))}
              {collaborators.data.invites.map((invite) => (
                <Person
                  key={invite.id}
                  name={invite.email}
                  email={`Invited, ${ROLE_LABEL[invite.role].toLowerCase()}`}
                  trailing={
                    <div className="flex items-center gap-1">
                      <CopyButton value={invite.url} label="Copy invite" />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Cancel invite for ${invite.email}`}
                        onClick={() =>
                          unshare.mutate({ data: { id: item.id, email: invite.email } })
                        }
                      >
                        <XIcon aria-hidden="true" />
                      </Button>
                    </div>
                  }
                />
              ))}
            </>
          ) : null}
        </div>

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Link access</span>
            <Select
              value={item.visibility}
              disabled={item.kind === "env" || setVisibility.isPending}
              onValueChange={(visibility) =>
                setVisibility.mutate({
                  data: { id: item.id, visibility: visibility as ItemVisibility },
                })
              }
            >
              <SelectTrigger size="sm" className="w-52" aria-label="Link access">
                <SelectValue>{(value: ItemVisibility) => VISIBILITY_META[value].label}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ITEM_VISIBILITIES.map((visibility) => (
                  <SelectItem key={visibility} value={visibility}>
                    {VISIBILITY_META[visibility].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <CopyButton value={item.url} label="Copy link" />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Person({
  name,
  email,
  image,
  trailing,
}: {
  name: string;
  email: string;
  image?: string | null;
  trailing: React.ReactNode;
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
      {trailing}
    </div>
  );
}
