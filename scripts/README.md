# James Dean demo seed

Creates **James Dean** with a 5-customer demo circle and shares it with **mckinleycundiff@gmail.com**.

**Requirements**

1. You have signed into CustomerCircle at least once with Google (`mckinleycundiff@gmail.com`).
2. Migration [`../supabase/migrations/20261112000000_shared_circle_read.sql`](../supabase/migrations/20261112000000_shared_circle_read.sql) applied in Supabase.
3. PR with **Shared with me** (beta 1.20) deployed.

**Run locally (recommended)**

```bash
cd /path/to/customercircle
npm install @supabase/supabase-js@2 --no-save
export SUPABASE_URL=https://igfzsivcupfcigzrmltw.supabase.co
export SUPABASE_SERVICE_ROLE_KEY='<from Supabase → Settings → API → service_role>'
node scripts/seed-james-dean-share.mjs
```

Then open CustomerCircle as McKinley → **More → Shared with me → James Dean**.

Demo James login (optional): `james.dean.demo+customercircle@gmail.com` / `JamesDeanDemo2026!`
