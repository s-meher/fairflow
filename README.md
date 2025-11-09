# 🪸 Symbio: Fair Lending. No Sharks. 🦈🚫

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)  
[![React](https://img.shields.io/badge/React-18-blue?logo=react)](https://reactjs.org)  
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green?logo=fastapi)](https://fastapi.tiangolo.com)  
[![Vite](https://img.shields.io/badge/Vite-5.4-purple?logo=vite)](https://vitejs.dev)

> **A crowdsourced, community-oriented loan platform** where borrowers and lenders are verified members of the *same geographic community* — using ID verification to build real trust.  
> Lenders bid the lowest rate they’re willing to accept, borrowers pick their amount, and our algorithm stitches together multiple offers** to fund the exact need.

---

## 💡 Why Symbio Is a Game Changer

| Problem | Symbio’s Solution |
|----------|------------------|
| **Predatory fintechs (Klarna, Afterpay)** prey on low-income users with 30%+ APRs | **Hard cap at average bank rate (9.5%)** — no loan can exceed this |
| **Opaque P2P lending** with hidden fees and high risk | **Full transparency**: every rate, fee, and match is visible |
| **Borrowers overextend** due to poor financial literacy | **AI (Grok) + Knot API** analyze spending habits and **deny financially irresponsible loans** |
| **Money leaves communities**, flowing from poorer areas to richer ones | **ID verification** ensures lenders and borrowers within a community benefit each other |

> **Financial justice, powered by AI and community.**

---

## 🧠 How It Works

📊 **(DIAGRAM GOES HERE)**  
*Community Lending → ID Verification → AI Vetting → Multi-Lender Match → Transparent Repayment*

---

## ⚙️ Tech Stack

**Frontend:** React (Vite, Tailwind, shadcn/ui)  
**Backend:** FastAPI (Python)  
**APIs:** Knot, Grok, X 
**Database:** SQL Lite

---

## 🧩 Setup Guide

### 1. Clone the repo
```bash
git clone https://github.com/yourusername/symbio.git
cd symbio
````

### 2. Environment Setup

Copy the example environment file and edit as needed:

```bash
cp .env.example .env
```

**.env example:**

```bash
KNOT_API_KEY=
GROK_API_KEY=
NESSIE_API_KEY=
X_API_KEY=
BANK_AVG_RATE=9.5
```

---

## 🚀 Backend Setup (FastAPI)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

> ⚠️ The API keeps everything in memory, so restarting the server clears users, matches, and posts.
> CORS is open for `http://localhost:3000`.

---

## 💻 Frontend Setup (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

The React app runs on **port 3000** and expects the backend on **port 8000**.
Routes mirror the storyboard order, store the active user in `localStorage`, and use **Tailwind + shadcn/ui** for styling.
