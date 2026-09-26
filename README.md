# GenTree — Interactive Family Tree Editor

[![CI](https://github.com/Krogullec789/GenTree/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Krogullec789/GenTree/actions/workflows/ci.yml)

GenTree is a family tree editor built with **React, TypeScript and Vite**, backed by an **Express API**. It lets users explore family relationships, edit personal profiles and arrange people on an interactive canvas.

I started this personal project to explore a simpler, self-hosted approach to family tree editing. The engineering focus is on interactive React UI, graph validation, state history and versioned persistence. The application UI is in Polish.

## Features

- **Interactive canvas:** pan, zoom toward the cursor and move people with a drag handle or keyboard arrows.
- **Family relationships:** create parent-child and partner connections, or link people already in the tree.
- **Profile editing:** update names, birth and death dates, biography and avatar URL.
- **Person search:** find a person and focus the canvas on their profile.
- **Automatic layout:** arrange family branches by generation and group partners together.
- **Undo and redo:** navigate a bounded history of tree changes.
- **Automatic saving:** debounce edits and send versioned updates to the API, with visible save and conflict states.
- **JSON import and export:** validate imported data and download a backup before replacing the current tree.

## Tech stack

| Area | Technologies |
| --- | --- |
| Frontend | React 19, TypeScript in strict mode, Vite, CSS, Lucide icons |
| State | React Context, hooks and an in-memory snapshot history |
| Visualization | HTML person cards, SVG relationship paths and Pointer Events |
| Backend | Node.js, Express 5, file-based JSON storage |
| Testing | Vitest, React Testing Library, Supertest and Playwright |
| Automation | GitHub Actions: lint, type checking, tests and production build |

## Architecture and decisions

**Graph model.** People and relationships are stored in maps keyed by ID. Shared validation checks required fields, dates, missing references, duplicate connections and cycles in parent-child relationships. Both the API and the import flow use this validation.

**Interactive rendering.** Person cards use HTML so profiles and controls can use standard browser elements. Relationships are drawn in an SVG layer. The canvas calculates which cards fall within the viewport and an overscan area; a separate layout function computes positions without rendering UI.

**State and history.** `TreeProvider` coordinates tree edits, selection, save status and undo/redo. History is limited to 50 snapshots. Context keeps the initial implementation compact, although separating frequently changing drag state from tree data is a planned improvement.

**Versioned persistence.** The API returns a tree version and requires it in the `If-Match` header for updates. Stale writes return a conflict response. The repository serializes writes within one server process and writes through a temporary file before renaming it. JSON storage keeps local setup small; it is intended for a single-process prototype.

```text
src/
  components/       Canvas, person cards, toolbar and profile editing
  store/            Tree state, history and API synchronization
  types/            Shared TypeScript data models
  utils/            Tree validation and automatic layout
  server/           File-based tree repository
tests/
  backend/          API, validation and persistence tests
  e2e/              Browser smoke tests
scripts/            E2E runner and local verification
server.ts           Express API entry point
```

Component and state tests also live next to the corresponding source modules in `__tests__` directories.

## Run locally

Use **Node.js 22.13 or newer within the 22.x release line**, with npm. `.nvmrc` selects Node.js 22, which is also used in CI.

```bash
git clone https://github.com/Krogullec789/GenTree.git
cd GenTree
npm ci
```

Create the local configuration and sample database on first setup:

```bash
cp .env.example .env
cp db.json.example db.json
```

In PowerShell, use:

```powershell
Copy-Item .env.example .env
Copy-Item db.json.example db.json
```

Keep `TREE_API_TOKEN` and `VITE_API_TOKEN` equal in your local `.env`, then start both servers:

```bash
npm run dev
```

Open [localhost:5173](http://localhost:5173). The API runs at `http://localhost:3001`. The sample database contains fictional people. Local `.env` and `db.json` files are ignored by Git; export your tree before replacing an existing database.

## Testing and CI

Install the Chromium browser used by Playwright once:

```bash
npx playwright install chromium
```

| Command | Purpose |
| --- | --- |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Check TypeScript types |
| `npm test` | Run unit and integration tests |
| `npm run build` | Check types and create the frontend production build |
| `npm run test:e2e` | Start isolated servers and run Chromium smoke tests |
| `npm run verify:quick` | Run lint, type checking and unit/integration tests |
| `npm run verify:app` | Check the local database and application in Chromium |
| `npm run verify:full` | Run all verification steps, including the local app check |
| `npx playwright show-report` | Open the latest browser test report |

Unit and integration tests cover graph validation, layout rules, API version conflicts, selected UI interactions and history behavior. The current E2E suite checks application startup and opening a person profile; broader editing workflows are on the roadmap.

The [CI workflow](.github/workflows/ci.yml) runs on pushes to `main`, pull requests targeting `main`, and manual dispatch. It runs two jobs:

1. ESLint, TypeScript checks, unit/integration tests and a production build.
2. Playwright smoke tests with Chromium, an isolated database and a test-only API token.

Both jobs install dependencies with `npm ci`. Browser reports and available failure traces are retained as the `playwright-results` artifact for 14 days. CI does not require repository secrets or your local `.env` and `db.json` files.

`verify:app` is a separate local diagnostic: it requires the local configuration, an initialized database with people, Chromium, and free ports 5173 and 3001. It currently expects every person in that database to be rendered, so it is best used with the small sample tree. It is not part of the hosted CI workflow.

## Current scope and next steps

This is a local, single-tree portfolio prototype. It does not provide user accounts or per-user access control. `VITE_API_TOKEN` is included in browser code, so the shared development token must not be treated as authentication for a public deployment with private data.

Current priorities:

- Fix persistence when the last person is removed; the deleted person currently returns after a reload.
- Synchronize drag coordinates after automatic layout; clicking a handle can currently restore an older position.
- Fix toolbar overflow on narrow screens and improve mobile canvas navigation.
- Extend E2E coverage to edit-save-reload, deletion, imports and history actions.
- Separate drag state from shared tree state and measure performance with larger sample trees.

## License

[MIT](LICENSE)
