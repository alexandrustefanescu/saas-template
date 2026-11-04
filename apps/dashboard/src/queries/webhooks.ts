import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "#/lib/api/client";
import {
  createWebhook,
  deleteWebhook,
  listWebhookDeliveries,
  listWebhooks,
  pingWebhook,
  type WebhookEndpoint,
} from "#/lib/api/webhooks";
import { queryKeys } from "./keys";

async function listWebhooksSafe() {
  try {
    return await listWebhooks();
  } catch (error) {
    // Webhooks require an active organisation; Settings still loads without them.
    if (error instanceof ApiError && error.status === 400) {
      return [] as WebhookEndpoint[];
    }
    throw error;
  }
}

export function webhooksQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.webhooks.all(),
    queryFn: listWebhooksSafe,
  });
}

export function webhookDeliveriesQueryOptions(id: string) {
  return queryOptions({
    queryKey: queryKeys.webhooks.deliveries(id),
    queryFn: () => listWebhookDeliveries(id),
    enabled: Boolean(id),
  });
}

export function useWebhooksQuery() {
  return useQuery(webhooksQueryOptions());
}

export function useWebhookDeliveriesQuery(id: string) {
  return useQuery(webhookDeliveriesQueryOptions(id));
}

export function useCreateWebhookMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { url: string; events: string[] }) => createWebhook(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.webhooks.all() });
    },
  });
}

export function useDeleteWebhookMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWebhook(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.webhooks.all() });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.webhooks.deliveries(id),
      });
    },
  });
}

export function usePingWebhookMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => pingWebhook(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.webhooks.deliveries(id),
      });
    },
  });
}
