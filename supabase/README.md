# Supabase SQL

This repository’s committed [`config.js`](../config.js) uses the **development** project (`igfzsivcupfcigzrmltw`). Apply migrations here first; copy to a separate **production** Supabase project when you go live.

Apply [`migrations/20261112000000_shared_circle_read.sql`](migrations/20261112000000_shared_circle_read.sql) in the Supabase SQL editor (or via CLI) so recipients can use **More → Shared with me**.

Requires existing `customers`, `activities`, and `find_ibo` setup from your original CustomerCircle schema.

See [`docs/ENVIRONMENTS.md`](../docs/ENVIRONMENTS.md).
