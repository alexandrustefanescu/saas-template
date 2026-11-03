import { ActionButton } from "@react-spectrum/s2/ActionButton";
import { Form } from "@react-spectrum/s2/Form";
import { Skeleton } from "@react-spectrum/s2/Skeleton";
import { Text } from "@react-spectrum/s2/Text";
import { TextField } from "@react-spectrum/s2/TextField";
import { Cell, Column, Row, TableBody, TableHeader, TableView } from "@react-spectrum/s2/TableView";
import Add from "@react-spectrum/s2/icons/Add";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { PageBreadcrumbs } from "#/components/page-breadcrumbs";
import { spectrumStyles } from "#/spectrum-styles";

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

const placeholderItems = [
  { id: "1", name: "Weekly status report draft", createdAt: "Nov 3, 2026, 6:39 PM" },
  { id: "2", name: "Customer onboarding checklist", createdAt: "Nov 2, 2026, 1:12 PM" },
  { id: "3", name: "Invoice reminder follow-up", createdAt: "Nov 1, 2026, 9:04 AM" },
  { id: "4", name: "Product feedback summary", createdAt: "Oct 30, 2026, 4:22 PM" },
];

/** Route pending UI that mirrors the loaded Items page layout. */
export function ItemsSkeleton() {
  return (
    <Skeleton isLoading>
      <section className={layout} aria-busy="true" aria-label="Loading items">
        <PageBreadcrumbs
          items={[
            { id: "home", label: "Home", href: "/" },
            { id: "items", label: "Items" },
          ]}
        />
        <div className={style({ display: "flex", flexDirection: "column", gap: 4 })}>
          <Text styles={style({ font: "heading-xl", margin: 0 })}>Items</Text>
          <Text styles={style({ font: "body", margin: 0 })}>
            Scan, sort, and add items for your account.
          </Text>
        </div>

        <Form>
          <div className={toolbar}>
            <TextField
              label="Name"
              defaultValue="New item name placeholder"
              styles={spectrumStyles(style({ width: "full", flexGrow: 1, minWidth: 0 }))}
            />
            <ActionButton aria-label="Add item">
              <Add />
            </ActionButton>
          </div>
        </Form>

        <TableView
          aria-label="Items"
          selectionMode="multiple"
          density="spacious"
          styles={spectrumStyles(
            style({ width: "full", flexGrow: 1, minHeight: 0, height: "full" }),
          )}
        >
          <TableHeader>
            <Column id="name" isRowHeader>
              Name
            </Column>
            <Column id="createdAt">Created</Column>
          </TableHeader>
          <TableBody items={placeholderItems}>
            {(item) => (
              <Row id={item.id}>
                <Cell>
                  <Text>{item.name}</Text>
                </Cell>
                <Cell>
                  <Text>{item.createdAt}</Text>
                </Cell>
              </Row>
            )}
          </TableBody>
        </TableView>
      </section>
    </Skeleton>
  );
}
