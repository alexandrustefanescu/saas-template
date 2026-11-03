import { api } from "./client";

export type Item = {
  id: string;
  userId?: string;
  user_id?: string;
  organizationId?: string;
  organization_id?: string;
  name: string;
  createdAt?: string;
  created_at?: string;
};

export function listItems() {
  return api<Item[]>("/v1/items");
}

export function createItem(input: { name: string }) {
  return api<Item>("/v1/items", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getItem(id: string) {
  return api<Item>(`/v1/items/${id}`);
}

export function deleteItem(id: string) {
  return api<void>(`/v1/items/${id}`, { method: "DELETE" });
}
