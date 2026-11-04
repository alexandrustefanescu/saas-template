export const queryKeys = {
  account: {
    me: () => ["account", "me"] as const,
  },
  items: {
    all: () => ["items"] as const,
    detail: (id: string) => ["items", id] as const,
  },
  webhooks: {
    all: () => ["webhooks"] as const,
    deliveries: (id: string) => ["webhooks", id, "deliveries"] as const,
  },
  notifications: {
    all: () => ["notifications"] as const,
  },
  organisations: {
    all: () => ["organisations"] as const,
  },
};

/** Org-scoped server lists that must refresh after set-active. */
export const orgScopedQueryKeys = [
  queryKeys.items.all(),
  queryKeys.webhooks.all(),
  queryKeys.notifications.all(),
] as const;
