# Plutus — MVP UI/UX Structure

> Goal: Build a hackathon-ready MVP (PWA + optional Android wrapper) that showcases an Autonomous Human-Supervised Financial AI Agent with explainability (XAI), human-in-the-loop controls (HITL), and a tamper-proof audit trail. Design for Indian users (Android-first) with clean, trust-building UI.

---

## 1 — Quick product summary (one-liner)
Plutus: installable web app that *recommends* portfolio actions, explains the why (feature-level), and lets users approve/override decisions with an auditable record.

---

## 2 — Primary user personas
- **Novice Saver (Amit, 22)** — wants simple guidance, trusts UI clarity, prefers minimal jargon.
- **Young Investor (Priya, 27)** — uses SIPs & small trades, cares about risk & returns.
- **Analyst / Power-user (Rohit, 34)** — wants feature attributions, logs, and control.

Design the MVP to be comfortable for Persona A & B while including advanced views for Persona C (judge-facing analytics).

---

## 3 — Core user flows (priority)
1. Onboard & Risk Profiling (1–2 min)
2. Add / Import portfolio (manual + CSV simple demo)
3. Agent analysis & suggestion (paper-trade only)
4. XAI breakdown (top factors + plain-English rationale)
5. HITL action (Approve / Override / Tweak allocation)
6. Audit trail view (timeline + hash)
7. Demo scenario replay & judge analytics

---

## 4 — MVP screens (3 must-have + 4 nice-to-have)

### A. Must-have screens
1. **Onboarding & Risk Profiler**
   - Elements: avatar, short goal selector (Wealth goal / Time horizon / Risk slider), sample microcopy.
   - CTA: "Create Profile → Start Paper Portfolio"

2. **Dashboard (Home)**
   - Sections: portfolio value card, 7/30-day return sparkline, Risk Score pill, Agent suggestion feed (latest action card), Nudge / Alerts banner.
   - Quick actions: "Run Agent" (manual), "Replay Scenario", "Paper Trade"

3. **Agent Suggestion + XAI Card (centerpiece)**
   - Big action button: Recommend BUY/SELL/HOLD + percent allocation.
   - XAI mini-visual: horizontal bars (top 3 features) + a short one-line rationale.
   - Expandable panel: full SHAP-like waterfall + alternative considered.
   - HITL controls: Approve / Override / Suggest Allocation slider + Comment box.
   - Safety modal for overrides: "You're changing agent suggestion. Confirm & log reason."

### B. Nice-to-have screens
4. **Audit Trail (timeline)**
   - Append-only list: timestamp, action, actor (agent/user), hash (short), expand for details.
   - Export CSV button for judges.

5. **Scenario Library / Replay**
   - Pre-baked market events (volatility spike, sector crash, rally).
   - Play button that animates agent behavior and shows logs.

6. **Analytics & Judge Panel**
   - Metrics: simulated return, drawdown, override rate, risk-reduction score.

7. **Settings & Profile**
   - Market data refresh interval, notification toggles, data source labels (simulate Yahoo/AlphaVantage), toggle real-money off.

---

## 5 — Screen-level layout & component details

### Agent Suggestion Card (mobile-first)
- **Top row**: Ticker / Portfolio snapshot + Risk Score badge
- **Main**: Big recommendation text (e.g., "Sell 12% of BANKETF") and action confidence (e.g., 78%)
- **XAI row**: 3 horizontal bars labeled (Volatility, Sector Exposure, Correlation) with numeric influence
- **Rationale**: one-sentence plain-English explanation (30–40 chars) + "Explain more" link
- **Controls**: Approve (primary), Suggest (secondary), Override (danger/confirm)
- **Micro-interaction**: On Approve → toast "Action logged (paper trade)."

### Audit Trail Row
- Compact: timestamp | actor badge | short action | hash
- Expand: full JSON-like details (humanized) + link to replay that state

### Onboarding / Risk Profiler
- Minimal steps (3 cards): Goals → Horizon → Risk slider
- Use icons and friendly copy (avoid jargon)

---

## 6 — Visual & interaction guidelines
- **Tone**: calm, neutral, trustworthy. Avoid overpromising. Use conversational microcopy.
- **Primary colors**: neutral blue/teal for trust, green for positive, amber for warnings, muted red for danger.
- **Typography**: Inter / Poppins — headline 18–22px, body 14px mobile, 16px desktop.
- **Spacing**: comfortable breathing room — 16px baseline grid.
- **Accessibility**: 4.5:1 contrast for primary CTAs, support text-scaling, keyboard accessible dialogs.
- **Animations**: subtle micro-interactions (0.12–0.2s) for card expand/collapse; avoid flashy motion.

---

## 7 — XAI presentation patterns (keep simple for hackathon)
- **Top-3 feature bars** (compact): shows relative influence and +/- sign.
- **Plain-English rationale**: 1 sentence summarizing reason.
- **Alternative considered**: show 1 alternative ("We also considered: Rebalance to 60/40 — lower confidence")
- **Confidence meter**: small radial or pill with %

Fallback: If SHAP is slow, compute simple weighted feature scores (rule-based) and show the same UI.

---

## 8 — Microcopy examples (use as-is for hack demo)
- Onboarding title: "Tell us your goal — we’ll suggest, you decide."  
- Agent approve button: "Approve (paper trade)"  
- XAI short reason: "High sector concentration and rising volatility increased risk."  
- Override confirmation: "You’re overriding an agent suggestion. Please add a short reason to help audit."  
- Nudge copy: "Heads up — your portfolio is 48% in banking stocks (above your 35% limit). Consider trimming."

---

## 9 — Data & API contract (minimal)
**Endpoints (examples):**
- `POST /api/profile` — create profile {userId, goal, horizon, risk}
- `POST /api/portfolio` — add holdings [{ticker, qty, price}]
- `POST /api/agent/run` — run analysis -> returns `{action: "SELL", ticker, pct, confidence, top_features: [{name,score}], explanation, audit_hash}`
- `POST /api/agent/approve` — user approves action -> returns audit entry
- `POST /api/agent/override` — user override with reason -> returns audit entry
- `GET /api/audit?userId=` — returns timeline

**Agent response sample (JSON):**
```json
{
  "action":"SELL",
  "ticker":"BANKETF",
  "pct":12,
  "confidence":0.78,
  "top_features":[{"name":"Sector Exposure","score":0.42},{"name":"Implied Volatility","score":0.28},{"name":"Correlation","score":0.12}],
  "explanation":"Sell 12% to reduce banking concentration after volatility spiked.",
  "audit_hash":"a1b2c3..."
}
```

---

## 10 — Dev notes & tech alignment
- Frontend pattern: Next.js pages for main routes + API proxy to FastAPI.  
- Charts: Recharts for quick, responsive charts.  
- XAI: SHAP if possible; otherwise produce a deterministic feature-score function.  
- Storage: SQLite during hack, migrate to Postgres later.  
- Audit hashing: use SHA256 over `{timestamp + action + userId + prevHash}` stored with entry.

---

## 11 — Folder structure suggestion (frontend)
```
/plutus-frontend
  /components
    AgentCard.jsx
    XaiBar.jsx
    AuditRow.jsx
  /pages
    /dashboard
    /onboard
    /audit
    /scenarios
  /utils
    api.js
    formatters.js
  tailwind.config.js
```

Backend (minimal):
```
/plutus-backend
  /app
    main.py (FastAPI)
    agent.py
    xai.py
    db.py
    models.py
```

---

## 12 — Demo script (60–90s live + backup video)
1. Onboard quick profile (10s) → show dashboard (10s)
2. Run Agent (manual) → Agent Suggestion card pops (15s)
3. Expand XAI, show top-3 influences (10s)
4. HITL override or approve (10s) → show audit timeline (10s)
5. Show scenario replay (15s) and judge metrics panel (10s)

---

## 13 — Acceptance criteria (what must work)
- Agent produces deterministic suggestion with XAI data shown.  
- User can Approve/Override and a new auditable entry appears.  
- Audit entries show a short hash and are exportable.  
- Demo scenarios reproducible for judges.

---

## 14 — Judge-facing metrics (show these clearly)
- Simulated portfolio return (since onboarding)
- Drawdown %
- Override rate (% of agent suggestions changed)
- Risk reduction score (pre/post agent suggestions)

---

## 15 — Final priorities for hackathon (in-order)
1. Agent Suggestion + XAI Card + Approve/Override + audit log  
2. Onboarding + import small portfolio  
3. Dashboard + quick metrics  
4. Scenario replay + judge metrics  
5. Polish microcopy, responsive layout, small animations

---

## 16 — Next deliverables I can make for you
- 3 mobile wireframes (Figma-ready markdown)  
- React + FastAPI starter skeleton with sample agent response  
- SHAP → UI adapter that turns SHAP values into bar score JSON


---

> That's the whole structure — build this MVP and you’ll have a clear, judge-friendly demo that highlights your XAI + HITL promise. Good luck, and remember: treat this like a rapid design sprint and keep iterating.

