# Dev vs production

## Current setup = **development**

The committed [`config.js`](../config.js) points at Supabase project **`igfzsivcupfcigzrmltw`**. All feature work, seeds, and James-style test users belong here until you create a prod project.

| | Development (now) | Production (later) |
|--|-------------------|-------------------|
| Config | `config.js` (`env: 'development'`) | Replace with `config.prod.example.js` values |
| UI | Amber **Development** banner | No banner |
| Offline UI mock | `?preview` on any host | Not used |
| Real Supabase | Default (no `?preview`) | Always |

## Local / hosted dev

1. Serve the repo (`python3 -m http.server`, GitHub Pages, ship.place, etc.).
2. Open the app **without** `?preview` to use the dev database and Google sign-in.
3. Use `?preview` only for quick UI demos with in-memory fake data (no login).

## When you add production

1. Create a new Supabase project.
2. Apply all SQL from [`supabase/migrations/`](../supabase/migrations/).
3. On the **production** deploy only, set `config.js` from [`config.prod.example.js`](../config.prod.example.js).
4. Add prod Google OAuth redirect URLs in Supabase Auth.
5. Never run seed scripts against `env: 'production'` or a non-dev `projectRef`.

## Optional override

For personal experiments, you can add an untracked `config.local.js` after `config.js` in `index.html` that overwrites `window.CC_CONFIG` (not committed).