# AGENTS.md — GWProperty (Astro + React + Leaflet on Netlify)

This repo builds a **static property listings website** from a JSON feed (`public/properties.json`), with:
- Search + filters + sort (client-side)
- Card grid of properties
- Optional map (Leaflet) with markers from `latitude/longitude`

This file is written for humans **and** automation agents to keep changes consistent and safe.

---

## Goals

1. **Easy maintenance:** update `public/properties.json` and redeploy.
2. **Fast + SEO-friendly:** static output from Astro; interactive UI only where needed.
3. **Stable UI:** consistent normalization layer from source JSON to UI model.
4. **Safe changes:** guard rails to prevent breaking the site, leaking secrets, or shipping slow pages.

---

## Guard rails (must follow)

### Data + security
- **Never commit secrets** (AWS keys, signed URLs, tokens) to the repo.
- The property feed may include **pre-signed S3 URLs**. If images return **403**, the site cannot fix it; the bucket/CDN policy must allow browser access.
- Do **not** attempt to “work around” forbidden images with proxying unless explicitly approved (cost/security/legal).
- Keep `public/properties.json` **as read-only input**; don’t mutate it at runtime.

### Performance
- Do not render **2,000+ markers** without constraints:
  - Either **marker clustering** or a hard cap (e.g., `MAX_MARKERS`) must be enabled.
- Avoid heavy libraries for simple tasks. Prefer native JS and small utilities.

### SSR / browser-only APIs
- Anything that touches `window`, `document`, `localStorage`, Leaflet, etc. must run **client-side only**:
  - Use dynamic imports in `useEffect` (browser-only)
  - Keep Leaflet imports out of module top-level to avoid `window is not defined`.

### Styling
- Keep CSS out of JSX inline styles (except tiny one-offs).
- **All UI styling belongs in `src/styles/`** and should be applied via class names.
- Use CSS variables for theme colors; do not hardcode random hex values repeatedly.

### Project structure
- New features must go into the appropriate folder:
  - UI components → `src/components/`
  - Pages/routes → `src/pages/`
  - Styling → `src/styles/`
  - Data normalization utilities → `src/lib/`
  - Static assets → `public/`

---

## Recommended repo structure

```
GWProperty/
  public/
    properties.json           # source feed (checked in or placed during deploy)
    placeholder.jpg           # local fallback image (required)
    favicon.svg
  src/
    pages/
      index.astro             # main listing page
    components/
      ListingsApp.jsx         # search UI + cards + map toggle
      MapView.jsx             # Leaflet map (client-only)
    lib/
      normalize.js            # normalizeProject(), price parsing, status mapping
      filters.js              # filtering + sorting helpers
    styles/
      app.css                 # global styles + layout
      forms.css               # inputs, selects, buttons
      cards.css               # property grid and cards
      map.css                 # map container overrides (optional)
  netlify.toml
  package.json
  README.md
  AGENTS.md
```

**Why split CSS?**
- `app.css` handles layout and theme
- `forms.css` makes selects/inputs look consistent across browsers
- `cards.css` keeps card styling isolated
- `map.css` avoids leaflets styles getting overwritten and keeps map tweaks separate

If you prefer fewer files, you can merge into `src/styles/app.css`, but keep it organized with sections.

---

## Key files and responsibilities

### `src/pages/index.astro`
- Loads global CSS.
- Renders the interactive UI island:
  - `<ListingsApp client:load />`
- Avoid putting complex logic here.

### `src/components/ListingsApp.jsx`
- Loads `properties.json` via `fetch("/properties.json")`.
- Normalizes raw records into a stable UI model (preferably imported from `src/lib/normalize.js`).
- Performs filtering, sorting, and rendering card grid.
- Image behavior:
  - Uses `public/placeholder.jpg` when remote images fail
  - Logs failures to console with the attempted URL
- **No Leaflet code here** (map stays in `MapView.jsx`).

### `src/components/MapView.jsx`
- Leaflet must be **dynamic imported** inside `useEffect`.
- Use an **explicit marker icon** to avoid “?” icons caused by missing Leaflet marker assets.
- Cap markers or cluster markers.

### `public/placeholder.jpg`
Required.
- If missing, you will see 404 errors and broken cards.
- Keep this small (~20–60KB) and neutral.

---

## Data model

### Source JSON (current feed)
Top level:
- `data.projects[]` is the array of properties.

Per project (examples):
- `id`, `name`, `community`, `developer`
- `latitude`, `longitude` (strings)
- `image` (often S3/pre-signed URL)
- `sales_status` (numeric code)
- `completion_date` (e.g. `"Q3 2026"`)
- `unit_variations[]` with `unit_type` and `starting_price` (e.g. `"7.32 M"`, `"715 K"`)

### Normalized UI model (stable)
Each property should become:
- `id: string`
- `title: string`
- `community: string`
- `developer: string`
- `coverImage: string`
- `lat: number|null`
- `lng: number|null`
- `statusLabel: string`
- `completionDate: string`
- `minPrice: number|null` (AED)
- `unitTypesLabel: string`
- `featured: boolean`
- `hasPin: boolean`

**All UI rendering should depend on the normalized model**, not raw JSON. This allows the feed to evolve without breaking UI.

---

## Images: expected behavior and constraints

### If images are S3 and return 403
The website cannot force-load them. You must fix one of:
- make objects publicly accessible (least preferred in some orgs)
- front S3 with **CloudFront** and permit access
- generate valid **fresh presigned URLs** at runtime (requires backend)
- remove hotlink restrictions / referrer restrictions if present

### Client-side mitigations
- Use `referrerPolicy="no-referrer"` on `<img>` (can help with referrer-blocked buckets).
- Log failed URL + status in devtools.
- Always fall back to `placeholder.jpg` once.

---

## Map: marker icon “?” issue

The “?” marker indicates Leaflet cannot find:
- `marker-icon.png`
- `marker-icon-2x.png`
- `marker-shadow.png`

**Fix:** create an explicit `L.icon()` with CDN URLs and pass `{ icon }` to each marker.

Agents must not reintroduce marker icons via default Leaflet assets unless they also add a build step copying the images into `public/`.

---

## Development commands

Install deps:
```bash
npm install
```

Run dev server:
```bash
npm run dev
```

Build:
```bash
npm run build
```

Preview build:
```bash
npm run preview
```

---

## Netlify deployment

Recommended:
- Connect GitHub repo to Netlify
- Build command: `npm run build`
- Publish directory: `dist`

If `properties.json` is updated frequently:
- Commit updated `public/properties.json` → triggers redeploy, **or**
- Store JSON externally and fetch it (but static per-build pages won’t update without redeploy unless you go fully client-only).

---

## Change checklist (before committing)

1. **Run dev** and test:
   - filters work
   - images fall back cleanly
   - map loads without `window is not defined`
   - markers show pins (no “?”)
2. Check console:
   - no unhandled errors
   - image failures logged (expected if S3 is 403)
3. Performance sanity:
   - map marker limit/clustering enabled
   - page not freezing on load
4. Structure:
   - CSS changes in `src/styles/`
   - normalization logic in `src/lib/normalize.js` (if added)
5. No secrets committed.

---

## TODO / Next upgrades (safe roadmap)

- Add **marker clustering** for 2k+ listings.
- Add **detail pages**: `/property/:id` (static page generation).
- Add **pagination** or virtualized list for large datasets.
- Replace status code mapping with real labels (once confirmed).
- Add “Open in Google Maps” / “Directions” links using lat/lng.
- Add an analytics-friendly event model (filter/search usage).

---

## Agent instructions (quick)

When asked to implement changes:
- Prefer small, reversible edits.
- Avoid introducing new frameworks unless required.
- Keep UI behavior stable and predictable.
- If modifying map behavior, always validate SSR safety.

If uncertain about feed fields:
- Inspect the JSON sample and update `normalize.js` first.
- Do not “guess” a field that doesn’t exist.

