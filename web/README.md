# HireFlow web

## Agent Journeys dashboard

- **Run dev:** `npm run dev` → open [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
- **Theme:** Use the theme control in the top menu bar (next to profile). Preference is stored in `localStorage` under `dashboard-theme`.
- **Palette tokens:** Semantic Tailwind scale roots live in [`src/data/config/colors.js`](src/data/config/colors.js) (`@data/config/colors.js`). UI uses those families via classes (`slate`, `sky`, `rose`, etc.) with `dark:` variants.

## Nojo File Storage (MVP)
The file-storage MVP persists uploaded/agent-created bytes to the server filesystem (not in the DB).

- Configure the storage root via `NOJO_FILES_ROOT`.
- If unset, the server defaults to `web/nojo-files` (based on `process.cwd()`).
- Blob layout under the root:
  - `/<userId>/<projectId>/<projectFileId>/revisions/<revisionId>.<ext>`
