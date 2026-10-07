import { queryOptions } from "@tanstack/react-query";

import type { ListItemsInput } from "#/lib/items/schemas.ts";
import type { LogTail } from "#/lib/items/service.server.ts";

import {
  $getBilling,
  $getItem,
  $getVersion,
  $listCollaborators,
  $listContacts,
  $listItems,
  $listProjectMembers,
  $listProjects,
  $listSharers,
  $listVersions,
  $tailLog,
} from "./functions";

export const itemKeys = {
  all: ["items"] as const,
  lists: () => [...itemKeys.all, "list"] as const,
  detail: (id: string) => [...itemKeys.all, "detail", id] as const,
};

export const itemListQueryOptions = (input: ListItemsInput) =>
  queryOptions({
    queryKey: [...itemKeys.lists(), input],
    queryFn: ({ signal }) => $listItems({ data: input, signal }),
  });

export const sharersQueryOptions = () =>
  queryOptions({
    queryKey: [...itemKeys.all, "sharers"],
    queryFn: ({ signal }) => $listSharers({ signal }),
  });

export const itemQueryOptions = (id: string) =>
  queryOptions({
    queryKey: itemKeys.detail(id),
    queryFn: ({ signal }) => $getItem({ data: { id }, signal }),
  });

export const versionsQueryOptions = (id: string) =>
  queryOptions({
    queryKey: [...itemKeys.detail(id), "versions"],
    queryFn: ({ signal }) => $listVersions({ data: { id }, signal }),
  });

export const versionQueryOptions = (id: string, version: number) =>
  queryOptions({
    queryKey: [...itemKeys.detail(id), "versions", version],
    queryFn: ({ signal }) => $getVersion({ data: { id, version }, signal }),
    staleTime: Infinity, // versions never change
  });

export const collaboratorsQueryOptions = (id: string) =>
  queryOptions({
    queryKey: [...itemKeys.detail(id), "collaborators"],
    queryFn: ({ signal }) => $listCollaborators({ data: { id }, signal }),
  });

/**
 * Live tail of a log. Each refetch asks only for entries after the cursor it already
 * holds and appends them, so polling stays cheap however long the log gets.
 */
export const logTailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: [...itemKeys.detail(id), "tail"],
    queryFn: async ({ client, signal }): Promise<LogTail> => {
      const prev = client.getQueryData<LogTail>([...itemKeys.detail(id), "tail"]);
      const tail = await $tailLog({ data: { id, after: prev?.cursor ?? 0, limit: 1000 }, signal });
      return { ...tail, entries: [...(prev?.entries ?? []), ...tail.entries] };
    },
    staleTime: 0,
    refetchInterval: (query) => (query.state.data?.caughtUp === false ? 0 : 2000),
  });

export const projectKeys = {
  all: ["projects"] as const,
  members: (id: string) => [...projectKeys.all, "members", id] as const,
};

export const projectsQueryOptions = () =>
  queryOptions({
    queryKey: projectKeys.all,
    queryFn: ({ signal }) => $listProjects({ signal }),
  });

export const projectMembersQueryOptions = (id: string) =>
  queryOptions({
    queryKey: projectKeys.members(id),
    queryFn: ({ signal }) => $listProjectMembers({ data: { id }, signal }),
  });

export const contactsQueryOptions = () =>
  queryOptions({
    queryKey: ["contacts"],
    queryFn: ({ signal }) => $listContacts({ signal }),
  });

export const billingQueryOptions = () =>
  queryOptions({
    queryKey: ["billing"],
    queryFn: ({ signal }) => $getBilling({ signal }),
  });
