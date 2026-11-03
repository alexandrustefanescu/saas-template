import { useState } from "react";
import { Form } from "@react-spectrum/s2/Form";
import { TextField } from "@react-spectrum/s2/TextField";
import { ToastQueue } from "@react-spectrum/s2/Toast";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { Button } from "#/components/button";
import { Body, SectionTitle } from "#/components/typography";
import { spectrumStyles } from "#/spectrum-styles";
import { ApiError } from "#/lib/api/client";
import {
  createWebhook,
  deleteWebhook,
  listWebhookDeliveries,
  listWebhooks,
  pingWebhook,
  type WebhookDelivery,
  type WebhookEndpoint,
} from "#/lib/api/webhooks";

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

type Props = {
  initialEndpoints: WebhookEndpoint[];
};

export function WebhooksPanel({ initialEndpoints }: Props) {
  const [endpoints, setEndpoints] = useState(initialEndpoints);
  const [url, setUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deliveriesById, setDeliveriesById] = useState<Record<string, WebhookDelivery[]>>({});

  async function refresh() {
    const next = await listWebhooks();
    setEndpoints(next);
  }

  return (
    <section className={section} aria-labelledby="settings-webhooks-heading">
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
            setCreating(true);
            try {
              const created = await createWebhook({
                url: url.trim(),
                events: ["item.created"],
              });
              setRevealedSecret(created.secret ?? null);
              setUrl("");
              ToastQueue.positive("Webhook endpoint created.", { timeout: 4000 });
              await refresh();
            } catch (error) {
              const message =
                error instanceof ApiError ? error.message : "Could not create webhook.";
              ToastQueue.negative(message, { timeout: 5000 });
            } finally {
              setCreating(false);
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
        <Button type="submit" isDisabled={creating || !url.trim()}>
          {creating ? "Creating…" : "Add webhook"}
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
        endpoints.map((endpoint) => {
          const deliveries = deliveriesById[endpoint.id] ?? [];
          return (
            <div key={endpoint.id} className={card}>
              <code className={mono}>{endpoint.url}</code>
              <Body>
                Events: {endpoint.events.join(", ")}
                {createdAt(endpoint) ? ` · Added ${createdAt(endpoint)}` : ""}
              </Body>
              <div className={rowActions}>
                <Button
                  variant="secondary"
                  isDisabled={busyId === endpoint.id}
                  onPress={() => {
                    void (async () => {
                      setBusyId(endpoint.id);
                      try {
                        await pingWebhook(endpoint.id);
                        ToastQueue.positive("Test ping delivered.", { timeout: 4000 });
                        const nextDeliveries = await listWebhookDeliveries(endpoint.id);
                        setDeliveriesById((current) => ({
                          ...current,
                          [endpoint.id]: nextDeliveries,
                        }));
                      } catch (error) {
                        const message =
                          error instanceof ApiError ? error.message : "Could not send test ping.";
                        ToastQueue.negative(message, { timeout: 5000 });
                        try {
                          const nextDeliveries = await listWebhookDeliveries(endpoint.id);
                          setDeliveriesById((current) => ({
                            ...current,
                            [endpoint.id]: nextDeliveries,
                          }));
                        } catch {
                          // Keep the previous delivery list if refresh fails.
                        }
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
                    void (async () => {
                      setBusyId(endpoint.id);
                      try {
                        const nextDeliveries = await listWebhookDeliveries(endpoint.id);
                        setDeliveriesById((current) => ({
                          ...current,
                          [endpoint.id]: nextDeliveries,
                        }));
                      } catch (error) {
                        const message =
                          error instanceof ApiError ? error.message : "Could not load deliveries.";
                        ToastQueue.negative(message, { timeout: 5000 });
                      } finally {
                        setBusyId(null);
                      }
                    })();
                  }}
                >
                  Show deliveries
                </Button>
                <Button
                  variant="secondary"
                  isDisabled={busyId === endpoint.id}
                  onPress={() => {
                    void (async () => {
                      setBusyId(endpoint.id);
                      try {
                        await deleteWebhook(endpoint.id);
                        setDeliveriesById((current) => {
                          const next = { ...current };
                          delete next[endpoint.id];
                          return next;
                        });
                        if (revealedSecret) setRevealedSecret(null);
                        ToastQueue.positive("Webhook deleted.", { timeout: 4000 });
                        await refresh();
                      } catch (error) {
                        const message =
                          error instanceof ApiError ? error.message : "Could not delete webhook.";
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
              {deliveries.length > 0 ? (
                <div className={style({ display: "flex", flexDirection: "column", gap: 8 })}>
                  {deliveries.map((delivery) => (
                    <Body key={delivery.id}>
                      {deliveryCreatedAt(delivery)} · {delivery.event} · {deliveryStatus(delivery)}
                    </Body>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })
      )}
    </section>
  );
}
