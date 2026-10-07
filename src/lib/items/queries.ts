import { queryOptions } from "@tanstack/react-query";

import type { ListItemsInput } from "#/lib/items/schemas.ts";

import {
  $getItem,
  $getVersion,
  $listCollaborators,
  $listItems,
  $listSharers,
  $listVersions,
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
