# GenTree - Family Tree Visualizer

![GenTree Banner](public/GenTreeBanner.webp)

GenTree is a personal project for creating and exploring family trees. I built it because most existing tools are either overly complex or require a subscription — I wanted something simple, fast, and self-hosted.

## Features

- **Interactive canvas** — smooth zoom-to-cursor and pan, works well with larger trees
- **Relationship management** — parent-child and partner connections rendered as SVG lines
- **Profile editing** — side panel for each person with name, dates, bio, and avatar
- **Auto-save** — changes sync to the backend automatically, no manual saving needed
- **Import / Export** — full JSON support for backups and data portability
- **Error boundaries** — the app recovers gracefully from unexpected failures

## Tech Stack

- **Frontend**: React 19, Vite, Vanilla CSS
- **Backend**: Node.js, Express 5
- **State**: React Context API
- **Testing**: Vitest & React Testing Library (unit), Playwright (E2E)

## Getting Started

1. Clone the repository
   ```bash
   git clone https://github.com/Krogullec789/gentree.git
   cd gentree
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment and data files
   ```bash
   cp .env.example .env
   cp db.json.example db.json
   ```

4. Start the development server
   ```bash
   npm run dev
   ```

## Testing

```bash
npm run test          # unit and integration tests
npm run test:e2e      # end-to-end tests with Playwright
npm run verify:quick  # lint + typecheck + unit/integration tests
npm run verify:app    # validates db.json, starts the app, and smoke-tests the real UI
npm run verify:full   # full portfolio-grade verification pipeline
npx playwright show-report
```

`verify:app` is the fastest way to check the real local application state. It starts the Vite frontend and Express backend, validates `db.json`, opens Chromium with Playwright, confirms the family tree renders, opens a profile panel, and then shuts everything down automatically.

---

*Built as a personal project and portfolio piece.*
