# LendLocal AI Monorepo

FastAPI backend + React frontend for the lend/match prototype described in the Phase A–H brief.

## One-time setup

From the repo root:

```bash
cp .env.example .env
```

Edit `.env` if you have real keys (all optional while integrations are stubbed):

```
KNOT_API_KEY=
GROK_API_KEY=
NESSIE_API_KEY=
X_API_KEY=
BANK_AVG_RATE=9.5
```

## Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The API keeps everything in memory, so restarting the server clears users, matches, and posts. CORS is open for `http://localhost:3000`.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

The React app (Vite) runs on port 3000 and expects the backend on 8000. Routes mirror the storyboard order, store the active user in `localStorage`, and use Tailwind + shadcn/ui for styling.

To pull in additional shadcn/ui primitives:

```bash
cd frontend
npx shadcn-ui add <component>
```

## Optional integrations

- **Purchase linking + Grok scoring**: Drop your Knot mock data (already in `backend/app/knot_mock_data/`) and set `GROK_API_KEY` / `GROK_MODEL` so `/borrow/risk` calls xAI Grok with real transaction summaries.
- **X/Twitter feed**: Set `X_API_KEY` (Bearer token). The backend exposes `GET /x/feed?handle=raymo8980`, which the Community Feed page uses to display the latest tweets inline with community posts.
