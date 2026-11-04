import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "#/lib/api/client";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
} from "#/lib/api/notifications";
import { queryKeys } from "./keys";

async function listNotificationsSafe() {
  try {
    return await listNotifications();
  } catch (error) {
    // Notifications require an active organisation; treat as empty until one exists.
    if (error instanceof ApiError && error.status === 400) {
      return [] as Notification[];
    }
    throw error;
  }
}

export function notificationsQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.notifications.all(),
    queryFn: listNotificationsSafe,
  });
}

export function useNotificationsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    ...notificationsQueryOptions(),
    enabled: options?.enabled ?? true,
  });
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all() });
      const previous = queryClient.getQueryData<Notification[]>(queryKeys.notifications.all());
      queryClient.setQueryData<Notification[]>(queryKeys.notifications.all(), (current) =>
        (current ?? []).map((row) => (row.id === id ? { ...row, unread: false } : row)),
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.notifications.all(), context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    },
  });
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all() });
      const previous = queryClient.getQueryData<Notification[]>(queryKeys.notifications.all());
      queryClient.setQueryData<Notification[]>(queryKeys.notifications.all(), (current) =>
        (current ?? []).map((row) => ({ ...row, unread: false })),
      );
      return { previous };
    },
    onError: (_error, _void, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.notifications.all(), context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    },
  });
}
