# UStud UI (Boiler template)

React + Vite + Tailwind + shadcn. Wired to the UStud FastAPI backend (`/api/*`).

## Development

1. Start the API (from project root):

   ```bash
   python run.py
   ```

2. Start Vite (proxies `/api` → `http://127.0.0.1:8765`):

   ```bash
   cd boiler
   npm install
   npm run dev
   ```

   Open the URL Vite prints (e.g. http://localhost:5173).

## Production

Build static files, then serve only with Python (same origin as `/api`):

```bash
cd boiler
npm install
npm run build
cd ..
python run.py
```

Open http://127.0.0.1:8765 — routing uses hash URLs (`/#/`, `/#/library`, …) so refresh works with static hosting.

## Features

- **Chat** — `POST /api/chat` (Ollama on server). Toggle *Wikipedia & course packs* to run `POST /api/search` first and pass context.
- **Library** — Courses from `GET /api/modules` / curriculum / lessons; Wikipedia search via `POST /api/search`.
- **Profile** — Saved in `localStorage` only.
