import { useMemo, useState } from "react";
import { ActionBar, ActionButton, Text as ActionBarText } from "@react-spectrum/s2/ActionBar";
import { ActionButton as IconButton } from "@react-spectrum/s2/ActionButton";
import { Form } from "@react-spectrum/s2/Form";
import { TextField } from "@react-spectrum/s2/TextField";
import { Content, Heading, IllustratedMessage } from "@react-spectrum/s2/IllustratedMessage";
import {
  Cell,
  Column,
  Row,
  TableBody,
  TableHeader,
  TableView,
  type Selection,
} from "@react-spectrum/s2/TableView";
import { Text } from "@react-spectrum/s2/Text";
import Add from "@react-spectrum/s2/icons/Add";
import Copy from "@react-spectrum/s2/icons/Copy";
import Delete from "@react-spectrum/s2/icons/Delete";
import FolderOpen from "@react-spectrum/s2/illustrations/linear/FolderOpen";
import { ToastQueue } from "@react-spectrum/s2/Toast";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { Button } from "#/components/button";
import { PageBreadcrumbs } from "#/components/page-breadcrumbs";
import { Body, PageTitle } from "#/components/typography";
import { spectrumStyles } from "#/spectrum-styles";
import { ApiError } from "#/lib/api/client";
import type { Item } from "#/lib/api/items";
import { useCreateItemMutation, useDeleteItemMutation, useItemsQuery } from "#/queries/items";

const layout = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: 16,
  width: "full",
  height: "full",
  minHeight: 0,
  flexGrow: 1,
  boxSizing: "border-box",
  padding: 8,
});

const toolbar = style({
  display: "flex",
  flexDirection: {
    default: "column",
    sm: "row",
  },
  alignItems: {
    default: "stretch",
    sm: "end",
  },
  gap: 12,
  width: "full",
  maxWidth: 720,
});

function itemCreatedAt(item: Item) {
  return item.created_at ?? item.createdAt ?? "";
}

function formatCreatedAt(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function selectedIds(selection: Selection, items: Item[]) {
  if (selection === "all") return items.map((item) => item.id);
  return [...selection].map(String);
}

export function ItemsTable() {
  const { data, isPending, isError, error, isFetching, refetch } = useItemsQuery();
  const createMutation = useCreateItemMutation();
  const deleteMutation = useDeleteItemMutation();
  const [name, setName] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set());
  const [deleting, setDeleting] = useState(false);

  const items = data ?? [];
  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        const left = itemCreatedAt(a);
        const right = itemCreatedAt(b);
        if (left < right) return 1;
        if (left > right) return -1;
        return 0;
      }),
    [items],
  );

  const backgroundBusy = isFetching && !isPending;

  async function copySelected() {
    const ids = new Set(selectedIds(selectedKeys, sortedItems));
    const names = sortedItems.filter((item) => ids.has(item.id)).map((item) => item.name);
    if (names.length === 0) return;
    try {
      await navigator.clipboard.writeText(names.join("\n"));
      ToastQueue.positive(names.length === 1 ? "Copied name." : `Copied ${names.length} names.`, {
        timeout: 4000,
      });
    } catch {
      ToastQueue.negative("Could not copy to clipboard.", { timeout: 5000 });
    }
  }

  async function deleteSelected() {
    const ids = selectedIds(selectedKeys, sortedItems);
    if (ids.length === 0) return;
    setDeleting(true);
    try {
      await Promise.all(ids.map((id) => deleteMutation.mutateAsync(id)));
      setSelectedKeys(new Set());
      ToastQueue.positive(ids.length === 1 ? "Item deleted." : `${ids.length} items deleted.`, {
        timeout: 4000,
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not delete items.";
      ToastQueue.negative(message, { timeout: 5000 });
    } finally {
      setDeleting(false);
    }
  }

  if (isPending) {
    return null;
  }

  if (isError) {
    return (
      <section className={layout} aria-labelledby="items-heading">
        <PageTitle id="items-heading">Items</PageTitle>
        <Body>{error instanceof Error ? error.message : "Could not load items."}</Body>
        <Button
          variant="secondary"
          onPress={() => {
            void refetch();
          }}
        >
          Try again
        </Button>
      </section>
    );
  }

  return (
    <section className={layout} aria-labelledby="items-heading">
      <PageBreadcrumbs
        items={[
          { id: "home", label: "Home", href: "/" },
          { id: "items", label: "Items" },
        ]}
      />
      <div className={style({ display: "flex", flexDirection: "column", gap: 4 })}>
        <PageTitle id="items-heading">Items</PageTitle>
        <Body>Scan, sort, and add items for your account.</Body>
      </div>

      <Form
        onSubmit={(event) => {
          event.preventDefault();
          void (async () => {
            const trimmed = name.trim();
            if (!trimmed) return;
            try {
              await createMutation.mutateAsync({ name: trimmed });
              setName("");
              ToastQueue.positive("Item created.", { timeout: 4000 });
            } catch (err) {
              const message = err instanceof ApiError ? err.message : "Could not create item.";
              ToastQueue.negative(message, { timeout: 5000 });
            }
          })();
        }}
      >
        <div
          className={toolbar}
          style={{ opacity: backgroundBusy ? 0.72 : 1, transition: "opacity 160ms ease" }}
        >
          <TextField
            label="Name"
            value={name}
            onChange={setName}
            isRequired
            placeholder="New item name"
            data-testid="items-name"
            styles={spectrumStyles(style({ width: "full", flexGrow: 1, minWidth: 0 }))}
          />
          <IconButton
            type="submit"
            aria-label={createMutation.isPending ? "Adding item" : "Add item"}
            isDisabled={createMutation.isPending || !name.trim()}
            data-testid="items-create"
          >
            <Add />
          </IconButton>
        </div>
      </Form>

      <TableView
        aria-label="Items"
        selectionMode="multiple"
        density="spacious"
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        styles={spectrumStyles(style({ width: "full", flexGrow: 1, minHeight: 0, height: "full" }))}
        renderActionBar={() => (
          <ActionBar isEmphasized>
            <ActionButton
              aria-label="Copy"
              isDisabled={deleting}
              onPress={() => {
                void copySelected();
              }}
            >
              <Copy />
              <ActionBarText>Copy</ActionBarText>
            </ActionButton>
            <ActionButton
              aria-label="Delete"
              isDisabled={deleting}
              data-testid="items-delete"
              onPress={() => {
                void deleteSelected();
              }}
            >
              <Delete />
              <ActionBarText>Delete</ActionBarText>
            </ActionButton>
          </ActionBar>
        )}
      >
        <TableHeader>
          <Column id="name" isRowHeader>
            Name
          </Column>
          <Column id="createdAt">Created</Column>
        </TableHeader>
        <TableBody
          items={sortedItems}
          renderEmptyState={() => (
            <IllustratedMessage>
              <FolderOpen />
              <Heading>No items yet</Heading>
              <Content>Add an item above to get started.</Content>
            </IllustratedMessage>
          )}
        >
          {(item: Item) => (
            <Row id={item.id}>
              <Cell>
                <Text>{item.name}</Text>
              </Cell>
              <Cell>
                <Text>{formatCreatedAt(itemCreatedAt(item))}</Text>
              </Cell>
            </Row>
          )}
        </TableBody>
      </TableView>
    </section>
  );
}
