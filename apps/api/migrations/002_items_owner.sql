-- Recreate items with ownership. Dev template: wipe existing rows.
DROP TABLE IF EXISTS items;

CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX items_user_id_idx ON items (user_id);
