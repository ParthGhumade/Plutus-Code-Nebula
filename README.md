# Plutus Code Nebula 🌌

**A lightweight, AI-driven platform designed to demystify the stock market for beginners.**

Plutus focuses on **learning first, not trading**. It provides simple explanations, real-time insights, and smart portfolio guidance to help users understand financial concepts without the pressure of active trading.

---

## Features

- **Explainable AI Summaries**: Breaks down complex market data into easy-to-understand language.
- **Personalized Risk Insights**: Analyzes potential investment choices to highlight risks tailored to your profile.
- **Smart Portfolio Guidance**: AI-driven suggestions to help you build a balanced mock portfolio for learning.
- **Real-Time Insights**: Stay updated with market trends without getting overwhelmed by jargon.
- **Beginner-Friendly Interface**: A clean, intuitive UI designed for people new to finance.

---

## Tech Stack

| Layer | Stack |
|-------|-------|
| Frontend | Next.js 16, React 19, TypeScript (`plutus-frontend/`) |
| Backend | FastAPI, Uvicorn (`server.py`) |
| External APIs | DeepSeek, Alpaca (paper trading), Finnhub |
| DevOps | Docker Compose |

---

## Project Structure

```
.
├── server.py              # FastAPI backend (port 8000)
├── requirements.txt       # Python dependencies
├── Dockerfile.backend     # Backend container
├── docker-compose.yml     # Runs backend + frontend together
├── .env.example           # Environment variable template
└── plutus-frontend/       # Next.js app (port 3000)
    ├── Dockerfile
    └── utils/api.ts       # Frontend API client
```

---

## Quick Start (Clone → Run)

### 1. Clone the repository

```bash
git clone https://github.com/omkhanjodkar-dev/Plutus-Code-Nebula-v2.git
cd Plutus-Code-Nebula-v2
```

### 2. Configure environment variables

Copy the example file and add your API keys:

```bash
cp .env.example .env
```

Edit `.env` and fill in at least:

| Variable | Purpose |
|----------|---------|
| `DEEPSEEK_API_KEY` | AI analysis |
| `ALPACA_API_KEY` | Paper trading & market data |
| `ALPACA_SECRET_KEY` | Paper trading & market data |
| `FINNHUB_API_KEY` | Company news & search |
| `NEXT_PUBLIC_API_URL` | Frontend → backend URL (default: `http://localhost:8000/api`) |

`.env` is gitignored. Never commit real keys.

Optional overrides (defaults are fine for local dev):

- `DEEPSEEK_URL`
- `ALPACA_BASE_URL`
- `ALPACA_TRADING_URL`

### 3. Run with Docker (recommended)

**Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/)

```bash
docker compose up --build
```

This starts:

- **Backend** at http://localhost:8000
- **Frontend** at http://localhost:3000
- **API docs** at http://localhost:8000/docs

Stop with `Ctrl+C`, or run detached with `docker compose up -d`.

---

## Local Development (without Docker)

**Prerequisites:**

- [Python 3.12+](https://www.python.org/downloads/)
- [Node.js 20+](https://nodejs.org/)

### Backend

From the repo root:

```bash
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
python server.py
```

Backend runs at http://localhost:8000.

### Frontend

In a second terminal:

```bash
cd plutus-frontend
npm install
npm run dev
```

Frontend runs at http://localhost:3000.

The frontend reads `NEXT_PUBLIC_API_URL` from your root `.env` when set locally, otherwise it defaults to `http://127.0.0.1:8000/api`.

---

## Environment Variables

### Backend (`server.py`)

Loaded from `.env` via `python-dotenv` and from Docker via `env_file` in `docker-compose.yml`.

| Variable | Required | Default |
|----------|----------|---------|
| `DEEPSEEK_API_KEY` | Yes | — |
| `DEEPSEEK_URL` | No | `https://api.deepseek.com/v1/chat/completions` |
| `ALPACA_API_KEY` | Yes | — |
| `ALPACA_SECRET_KEY` | Yes | — |
| `ALPACA_BASE_URL` | No | `https://data.alpaca.markets/v2/stocks` |
| `ALPACA_TRADING_URL` | No | `https://paper-api.alpaca.markets/v2` |
| `FINNHUB_API_KEY` | Yes | — |

### Frontend

| Variable | Required | Default |
|----------|----------|---------|
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:8000/api` |

Use a URL your **browser** can reach. With Docker, keep this as `http://localhost:8000/api` (not `http://backend:8000/api`).

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Frontend can't reach API | Confirm backend is on port 8000 and `NEXT_PUBLIC_API_URL` points to `http://localhost:8000/api` |
| `env_file .env not found` | Run `cp .env.example .env` and add your keys |
| Docker build fails | Ensure Docker Desktop is running |
| Port already in use | Stop other apps on 3000/8000 or change ports in `docker-compose.yml` |

---

## API Overview

Interactive docs: http://localhost:8000/docs

Main routes are under `/api` (portfolio, stock search, agent analysis, paper orders, gamification, learning).
