import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Form } from "@react-spectrum/s2/Form";
import { TextField } from "@react-spectrum/s2/TextField";
import { ToastQueue } from "@react-spectrum/s2/Toast";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { Button } from "#/components/button";
import { Body, SectionTitle } from "#/components/typography";
import { spectrumStyles } from "#/spectrum-styles";
import { ApiError } from "#/lib/api/client";
import type { WebhookDelivery, WebhookEndpoint } from "#/lib/api/webhooks";
import {
  useCreateWebhookMutation,
  useDeleteWebhookMutation,
  usePingWebhookMutation,
  useWebhooksQuery,
  webhookDeliveriesQueryOptions,
} from "#/queries/webhooks";

const section = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "start",
  gap: 16,
  width: "full",
  boxSizing: "border-box",
});

const card = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  width: "full",
  maxWidth: 640,
  padding: 16,
  borderRadius: "xl",
  backgroundColor: "gray-100",
  boxSizing: "border-box",
});

const rowActions = style({
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
});

const mono = style({
  font: "code-sm",
  color: "gray-900",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  width: "full",
});

function createdAt(endpoint: WebhookEndpoint) {
  return endpoint.created_at ?? endpoint.createdAt ?? "";
}

function deliveryCreatedAt(delivery: WebhookDelivery) {
  return delivery.created_at ?? delivery.createdAt ?? "";
}

function deliveryStatus(delivery: WebhookDelivery) {
  const code = delivery.status_code ?? delivery.statusCode;
  if (delivery.success) return code ? `OK ${code}` : "OK";
  if (delivery.error) return delivery.error;
  return code ? `Failed ${code}` : "Failed";
}

function WebhookDeliveries({ endpointId, enabled }: { endpointId: string; enabled: boolean }) {
  const {
    data = [],
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    ...webhookDeliveriesQueryOptions(endpointId),
    enabled,
  });

  if (!enabled) return null;
  if (isPending) return <Body>Loading deliveries…</Body>;
  if (isError) {
    return (
      <Body>
        {error instanceof Error ? error.message : "Could not load deliveries."}{" "}
        <button type="button" onClick={() => void refetch()}>
          Retry
        </button>
      </Body>
    );
  }
  if (data.length === 0) return <Body>No deliveries yet.</Body>;

  return (
    <div className={style({ display: "flex", flexDirection: "column", gap: 8 })}>
      {data.map((delivery) => (
        <Body key={delivery.id}>
          {deliveryCreatedAt(delivery)} · {delivery.event} · {deliveryStatus(delivery)}
        </Body>
      ))}
    </div>
  );
}

export function WebhooksPanel() {
  const { data, isPending, isError, error, isFetching, refetch } = useWebhooksQuery();
  const createMutation = useCreateWebhookMutation();
  const deleteMutation = useDeleteWebhookMutation();
  const pingMutation = usePingWebhookMutation();

  const [url, setUrl] = useState("");
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openDeliveries, setOpenDeliveries] = useState<Record<string, boolean>>({});

  const endpoints = data ?? [];
  const backgroundBusy = isFetching && !isPending;

  if (isPending) {
    return (
      <section className={section} aria-labelledby="settings-webhooks-heading">
        <SectionTitle id="settings-webhooks-heading">Webhooks</SectionTitle>
        <Body>Loading…</Body>
      </section>
    );
  }

  if (isError) {
    return (
      <section className={section} aria-labelledby="settings-webhooks-heading">
        <SectionTitle id="settings-webhooks-heading">Webhooks</SectionTitle>
        <Body>{error instanceof Error ? error.message : "Could not load webhooks."}</Body>
        <Button variant="secondary" onPress={() => void refetch()}>
          Try again
        </Button>
      </section>
    );
  }

  return (
    <section
      className={section}
      aria-labelledby="settings-webhooks-heading"
      style={{ opacity: backgroundBusy ? 0.85 : 1, transition: "opacity 160ms ease" }}
    >
      <SectionTitle id="settings-webhooks-heading">Webhooks</SectionTitle>
      <Body>
        Register endpoints that receive signed <code>item.created</code> events for your account.
      </Body>

      <Form
        styles={spectrumStyles(
          style({
            display: "flex",
            flexDirection: "column",
            gap: 12,
            width: "full",
            maxWidth: 640,
          }),
        )}
        onSubmit={(event) => {
          event.preventDefault();
          void (async () => {
            try {
              const created = await createMutation.mutateAsync({
                url: url.trim(),
                events: ["item.created"],
              });
              setRevealedSecret(created.secret ?? null);
              setUrl("");
              ToastQueue.positive("Webhook endpoint created.", { timeout: 4000 });
            } catch (err) {
              const message = err instanceof ApiError ? err.message : "Could not create webhook.";
              ToastQueue.negative(message, { timeout: 5000 });
            }
          })();
        }}
      >
        <TextField
          label="Endpoint URL"
          type="url"
          value={url}
          onChange={setUrl}
          isRequired
          placeholder="https://example.com/hooks"
        />
        <Body>Subscribed event: item.created</Body>
        <Button type="submit" isDisabled={createMutation.isPending || !url.trim()}>
          {createMutation.isPending ? "Creating…" : "Add webhook"}
        </Button>
      </Form>

      {revealedSecret ? (
        <div className={card}>
          <Body>Copy this signing secret now. It will not be shown again.</Body>
          <code className={mono}>{revealedSecret}</code>
          <Button
            variant="secondary"
            onPress={() => {
              void navigator.clipboard.writeText(revealedSecret).then(
                () => ToastQueue.positive("Secret copied.", { timeout: 3000 }),
                () => ToastQueue.negative("Could not copy secret.", { timeout: 4000 }),
              );
            }}
          >
            Copy secret
          </Button>
        </div>
      ) : null}

      {endpoints.length === 0 ? (
        <Body>No webhook endpoints yet.</Body>
      ) : (
        endpoints.map((endpoint) => (
          <div key={endpoint.id} className={card}>
            <code className={mono}>{endpoint.url}</code>
            <Body>
              Events: {endpoint.events.join(", ")}
              {createdAt(endpoint) ? ` · Added ${createdAt(endpoint)}` : ""}
            </Body>
            <div className={rowActions}>
              <Button
                variant="secondary"
                isDisabled={busyId === endpoint.id || pingMutation.isPending}
                onPress={() => {
                  void (async () => {
                    setBusyId(endpoint.id);
                    try {
                      await pingMutation.mutateAsync(endpoint.id);
                      ToastQueue.positive("Test ping delivered.", { timeout: 4000 });
                      setOpenDeliveries((current) => ({ ...current, [endpoint.id]: true }));
                    } catch (err) {
                      const message =
                        err instanceof ApiError ? err.message : "Could not send test ping.";
                      ToastQueue.negative(message, { timeout: 5000 });
                      setOpenDeliveries((current) => ({ ...current, [endpoint.id]: true }));
                    } finally {
                      setBusyId(null);
                    }
                  })();
                }}
              >
                Send test
              </Button>
              <Button
                variant="secondary"
                isDisabled={busyId === endpoint.id}
                onPress={() => {
                  setOpenDeliveries((current) => ({
                    ...current,
                    [endpoint.id]: !current[endpoint.id],
                  }));
                }}
              >
                {openDeliveries[endpoint.id] ? "Hide deliveries" : "Show deliveries"}
              </Button>
              <Button
                variant="secondary"
                isDisabled={busyId === endpoint.id || deleteMutation.isPending}
                onPress={() => {
                  void (async () => {
                    setBusyId(endpoint.id);
                    try {
                      await deleteMutation.mutateAsync(endpoint.id);
                      if (revealedSecret) setRevealedSecret(null);
                      ToastQueue.positive("Webhook deleted.", { timeout: 4000 });
                    } catch (err) {
                      const message =
                        err instanceof ApiError ? err.message : "Could not delete webhook.";
                      ToastQueue.negative(message, { timeout: 5000 });
                    } finally {
                      setBusyId(null);
                    }
                  })();
                }}
              >
                Delete
              </Button>
            </div>
            <WebhookDeliveries
              endpointId={endpoint.id}
              enabled={Boolean(openDeliveries[endpoint.id])}
            />
          </div>
        ))
      )}
    </section>
  );
}
