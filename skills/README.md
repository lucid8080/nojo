# Project skills

## Ontario residential tenancy

Canonical content lives at **`ontario-residential-tenancy/`** (this folder).

- **SKILL.md** — procedural core; **references/** — RTA/LTB navigation, intake, notices overview, communication patterns.
- **Cursor:** The repo includes a **junction** at `.cursor/skills/ontario-residential-tenancy` pointing here so Cursor can discover the skill like other project skills. On a fresh clone, if that junction is missing (e.g. non-Windows or Git without junction support), recreate it:

  **PowerShell (Windows):**

  ```powershell
  New-Item -ItemType Directory -Force -Path .cursor\skills | Out-Null
  cmd /c "mklink /J `"$pwd\.cursor\skills\ontario-residential-tenancy`" `"$pwd\skills\ontario-residential-tenancy`""
  ```

  **Git Bash / macOS / Linux:** symlink from `.cursor/skills/ontario-residential-tenancy` to `../../skills/ontario-residential-tenancy`, or rely on [`.cursor/rules/ontario-residential-tenancy.mdc`](../.cursor/rules/ontario-residential-tenancy.mdc) at the repo root, which instructs agents to read this folder.

Informational content is not legal advice; verify dates, forms, and procedures against official Ontario and LTB sources.

## Agent workspace wiring (optional)

To point a **user workspace agent** (e.g. Teddy Bonk) at this skill, add a line to that agent’s `USER.md` referencing `skills/ontario-residential-tenancy/SKILL.md` (repo root). Paths under `web/.openclaw/` are typically **gitignored**; treat that edit as **local provisioning**, or repeat it when you recreate the agent.
