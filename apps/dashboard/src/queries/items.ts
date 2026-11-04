import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createItem, deleteItem, listItems, type Item } from "#/lib/api/items";
import { queryKeys } from "./keys";

export function itemsQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.items.all(),
    queryFn: listItems,
  });
}

export function useItemsQuery() {
  return useQuery(itemsQueryOptions());
}

export function useCreateItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string }) => createItem(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.items.all() });
    },
  });
}

export function useDeleteItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteItem(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.items.all() });
      const previous = queryClient.getQueryData<Item[]>(queryKeys.items.all());
      queryClient.setQueryData<Item[]>(queryKeys.items.all(), (current) =>
        (current ?? []).filter((item) => item.id !== id),
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.items.all(), context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.items.all() });
    },
  });
}
