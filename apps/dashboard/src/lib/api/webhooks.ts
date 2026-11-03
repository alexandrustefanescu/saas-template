import { api } from "./client";

export type WebhookEndpoint = {
  id: string;
  userId?: string;
  user_id?: string;
  organizationId?: string;
  organization_id?: string;
  url: string;
  secret?: string | null;
  events: string[];
  createdAt?: string;
  created_at?: string;
};

export type WebhookDelivery = {
  id: string;
  endpointId?: string;
  endpoint_id?: string;
  event: string;
  success: boolean;
  statusCode?: number | null;
  status_code?: number | null;
  error?: string | null;
  createdAt?: string;
  created_at?: string;
};

export function listWebhooks() {
  return api<WebhookEndpoint[]>("/v1/webhooks");
}

export function createWebhook(input: { url: string; events: string[] }) {
  return api<WebhookEndpoint>("/v1/webhooks", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteWebhook(id: string) {
  return api<void>(`/v1/webhooks/${id}`, { method: "DELETE" });
}

export function pingWebhook(id: string) {
  return api<WebhookDelivery>(`/v1/webhooks/${id}/ping`, { method: "POST" });
}

export function listWebhookDeliveries(id: string) {
  return api<WebhookDelivery[]>(`/v1/webhooks/${id}/deliveries`);
}
