import uvicorn
import os
import json
import requests
import asyncio
import uuid
import hashlib
from fastapi import FastAPI, HTTPException, Query, APIRouter, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator
from typing import List, Optional, Literal, Dict, Any
from datetime import datetime, timedelta

# ---------------------- API KEYS (from environment) ------------------------ #
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "sk-685df22cc88b42b88fbdc48a1c8e4b80")
DEEPSEEK_URL = os.environ.get("DEEPSEEK_URL", "https://api.deepseek.com/v1/chat/completions")

ALPACA_API_KEY = os.environ.get("ALPACA_API_KEY", "PK24KQLZ7M6N2EKHQCZYX5ALRX")
ALPACA_SECRET_KEY = os.environ.get("ALPACA_SECRET_KEY", "HHGLc4722WMg7oPPhWVtdycabpqBN6qw7g4XSr2zJjcZ")
ALPACA_BASE_URL = os.environ.get("ALPACA_BASE_URL", "https://data.alpaca.markets/v2/stocks")
ALPACA_TRADING_URL = os.environ.get("ALPACA_TRADING_URL", "https://paper-api.alpaca.markets/v2")

FINNHUB_API_KEY = os.environ.get("FINNHUB_API_KEY", "d4dvoihr01qmhtc6dpm0d4dvoihr01qmhtc6dpmg")


# ---------------------- SYNC HTTP HELPERS (run in thread pool) ------------------------ #
def _sync_post(url: str, headers: dict, json_data: dict, timeout: int = 60) -> dict:
    """Synchronous POST request."""
    response = requests.post(url, headers=headers, json=json_data, timeout=timeout)
    response.raise_for_status()
    return response.json()


def _sync_get(url: str, headers: dict = None, params: dict = None, timeout: int = 30) -> dict:
    """Synchronous GET request."""
    response = requests.get(url, headers=headers, params=params, timeout=timeout)
    response.raise_for_status()
    return response.json()


# ---------------------- LLM ANALYZER ------------------------ #
async def analyze_stock(market_data: dict, news_data: list) -> dict:
    prompt = """
    You are a financial assistant. 
    Analyze the following market data and company news, then decide:

    1. action: BUY, HOLD, or SELL
    2. confidence: a number between 0 and 1
    3. drivers: key bullet points driving the decision
    4. explanation: a concise explanation in 2–4 sentences

    MARKET DATA:
    {""" + json.dumps(market_data, indent=2) + """}

    COMPANY NEWS:
    {""" + json.dumps(news_data, indent=2) + """}

    Respond in JSON ONLY with this exact format:
    {{
        "action": "...",
        "confidence": 0.00,
        "drivers": ["...", "..."],
        "explanation": "..."
    }}
    """

    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}"
    }

    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": "You are a precise financial decision-making model."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.2
    }

    try:
        data = await asyncio.to_thread(_sync_post, DEEPSEEK_URL, headers, payload, 60)

        if "choices" not in data or len(data["choices"]) == 0:
            raise ValueError("No choices in LLM response")

        raw = data["choices"][0]["message"]["content"]

        # Try to extract JSON from the response
        try:
            # Handle markdown code blocks
            if "```json" in raw:
                raw = raw.split("```json")[1].split("```")[0].strip()
            elif "```" in raw:
                raw = raw.split("```")[1].split("```")[0].strip()
            return json.loads(raw)
        except json.JSONDecodeError:
            return {
                "action": "HOLD",
                "confidence": 0.5,
                "drivers": ["fallback-mode"],
                "explanation": "LLM returned invalid JSON. Fallback response activated."
            }
    except requests.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"LLM API error: {e.response.status_code}")
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"LLM API connection error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")


# ---------------------- GET NEWS ------------------------ #
async def get_company_news(ticker: str) -> list:
    today = datetime.now().date()
    week_ago = today - timedelta(days=7)

    url = "https://finnhub.io/api/v1/company-news"
    params = {
        "symbol": ticker,
        "from": str(week_ago),
        "to": str(today),
        "token": FINNHUB_API_KEY
    }

    try:
        return await asyncio.to_thread(_sync_get, url, None, params, 30)
    except requests.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Finnhub API error: {e.response.status_code}")
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Finnhub connection error: {str(e)}")


# ---------------------- GET MARKET DATA ------------------------ #
async def get_market_data(ticker: str) -> dict:
    url = f"{ALPACA_BASE_URL}/{ticker}/snapshot"

    headers = {
        "APCA-API-KEY-ID": ALPACA_API_KEY,
        "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY
    }

    try:
        return await asyncio.to_thread(_sync_get, url, headers, None, 30)
    except requests.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Alpaca API error: {e.response.status_code}")
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Alpaca connection error: {str(e)}")


# ---------------------- SUPER AGENT ------------------------ #
async def super_agent(ticker: str) -> dict:
    market = await get_market_data(ticker)
    news = await get_company_news(ticker)
    result = await analyze_stock(market, news)
    return result


# ---------------------- RESOLVE TICKER ------------------------ #
async def resolve_ticker(company_name: str) -> str:
    prompt = f"""
    You are a financial assistant. 
    Convert the following company name into its official stock ticker symbol.

    Company name: "{company_name}"

    Respond with ONLY the ticker in uppercase, no explanation, no spaces, no punctuation.
    Example: AAPL
    """

    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
    }

    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": "You strictly output only valid stock tickers."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.1
    }

    try:
        data = await asyncio.to_thread(_sync_post, DEEPSEEK_URL, headers, payload, 30)

        if "choices" not in data or len(data["choices"]) == 0:
            raise ValueError("No choices in LLM response")

        raw = data["choices"][0]["message"]["content"].strip()
        ticker = "".join(c for c in raw if c.isalnum()).upper()
        return ticker
    except requests.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"LLM API error: {e.response.status_code}")
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"LLM API connection error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ticker resolution error: {str(e)}")


async def get_direct_stock_details(company_name: str) -> tuple:
    ticker = await resolve_ticker(company_name)
    market_data = await get_market_data(ticker)
    return market_data, ticker


# ---------------------- Initialize FastAPI Application ------------------------ #
app = FastAPI(
    title="Plutus - Stock Trading Agent API",
    description="AI-powered stock analysis, portfolio management, and trading with XAI explainability.",
    version="2.0.0"
)

# Add CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create API Router with /api prefix
api_router = APIRouter(prefix="/api")


# ---------------------- Pydantic Models ------------------------ #

class StockAnalysis(BaseModel):
    symbol: str
    recommendation: Literal["BUY", "SELL", "HOLD"]
    confidence_score: float
    analysis_date: datetime
    summary: str


class StockDetails(BaseModel):
    symbol: str
    company_name: str
    current_price: float
    sector: Optional[str] = None
    pe_ratio: Optional[float] = None
    change_pct: Optional[float] = None
    description: Optional[str] = None


class PortfolioPosition(BaseModel):
    symbol: str
    quantity: float
    average_price: float
    current_value: float


class AuditLog(BaseModel):
    id: str
    action: str
    timestamp: datetime
    details: str
    actor: Optional[str] = "System"
    audit_hash: Optional[str] = None
    prev_hash: Optional[str] = None


class OrderRequest(BaseModel):
    symbol: str
    side: Literal["buy", "sell"]
    quantity: int = Field(..., gt=0, description="Must be a positive integer")
    order_type: Literal["market", "limit"]
    limit_price: Optional[float] = None

    @model_validator(mode='after')
    def validate_limit_price(self):
        if self.order_type == "limit" and self.limit_price is None:
            raise ValueError("limit_price is required for limit orders")
        return self


class OrderResponse(BaseModel):
    order_id: str
    status: str
    message: str
    timestamp: datetime


class PendingOrder(BaseModel):
    order_id: str
    symbol: str
    side: str
    quantity: int
    confidence: float
    explanation: str
    top_features: List[Dict[str, Any]]
    created_at: datetime
    raw_payload: Optional[Dict[str, Any]] = None


class AgentRequest(BaseModel):
    query: str = "analyze portfolio"
    user_id: str = "demo"


class TradeConfirmRequest(BaseModel):
    order_id: str
    confirm: bool


class GamePoints(BaseModel):
    points: int
    badges: List[str]
    streak: int


class DailyLesson(BaseModel):
    id: str
    title: str
    content: str
    category: str
    points_reward: int


# ---------------------- In-Memory Storage ------------------------ #

AUDIT_LOGS: List[Dict] = [
    {"id": "log_001", "action": "LOGIN", "timestamp": datetime.now(), "details": "User logged in", "actor": "User", "audit_hash": "genesis", "prev_hash": ""},
    {"id": "log_002", "action": "VIEW_PORTFOLIO", "timestamp": datetime.now(), "details": "Portfolio accessed", "actor": "User", "audit_hash": "abc123", "prev_hash": "genesis"},
]

PENDING_ORDERS: List[Dict] = []

USER_POINTS: Dict[str, Dict] = {
    "demo": {"points": 150, "badges": ["Early Adopter", "First Trade"], "streak": 3}
}

DAILY_LESSONS = [
    {"id": "lesson_001", "title": "Understanding Risk Tolerance", "content": "Risk tolerance is your ability to endure market volatility...", "category": "Basics", "points_reward": 10},
    {"id": "lesson_002", "title": "Diversification Strategies", "content": "Don't put all your eggs in one basket...", "category": "Strategy", "points_reward": 15},
    {"id": "lesson_003", "title": "Reading Market Indicators", "content": "Technical indicators help predict market movements...", "category": "Technical", "points_reward": 20},
]


# ---------------------- Helper Functions ------------------------ #

def generate_audit_hash(data: dict, prev_hash: str) -> str:
    """Generate SHA256 hash for audit trail."""
    content = json.dumps(data, sort_keys=True, default=str) + prev_hash
    return hashlib.sha256(content.encode()).hexdigest()[:16]


def get_latest_audit_hash() -> str:
    """Get the hash of the latest audit entry."""
    if AUDIT_LOGS:
        return AUDIT_LOGS[-1].get("audit_hash", "genesis")
    return "genesis"


def add_audit_entry(action: str, details: str, actor: str = "System"):
    """Add a new entry to the audit log."""
    prev_hash = get_latest_audit_hash()
    entry = {
        "id": f"log_{uuid.uuid4().hex[:8]}",
        "action": action,
        "timestamp": datetime.now(),
        "details": details,
        "actor": actor,
        "prev_hash": prev_hash
    }
    entry["audit_hash"] = generate_audit_hash(entry, prev_hash)
    AUDIT_LOGS.append(entry)
    return entry


# ---------------------- Root Endpoint ------------------------ #

@app.get("/", tags=["General"])
async def root():
    return {"message": "Plutus Stock Trading Agent API is running. Visit /docs for Swagger UI."}


# ---------------------- API Router Endpoints ------------------------ #

# --- Portfolio Endpoints ---

@api_router.get("/portfolio/", response_model=Dict[str, Any], tags=["Portfolio"])
async def get_portfolio_api():
    """Get current portfolio positions from Alpaca."""
    url = f"{ALPACA_TRADING_URL}/positions"
    headers = {
        "APCA-API-KEY-ID": ALPACA_API_KEY,
        "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY
    }
    
    try:
        positions = await asyncio.to_thread(_sync_get, url, headers, None, 30)
        
        # Transform Alpaca response
        result = []
        for pos in positions:
            result.append({
                "symbol": pos.get("symbol", ""),
                "qty": float(pos.get("qty", 0)),
                "avg_entry_price": float(pos.get("avg_entry_price", 0)),
                "market_value": float(pos.get("market_value", 0)),
                "current_price": float(pos.get("current_price", 0)),
                "unrealized_pl": float(pos.get("unrealized_pl", 0))
            })
        return {"positions": result, "holdings": result}
    except requests.HTTPError as e:
        # Return empty portfolio on error (e.g., no positions)
        return {"positions": [], "holdings": []}
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Alpaca connection error: {str(e)}")


# --- Search Endpoints ---

@api_router.post("/search/ticker", response_model=StockDetails, tags=["Search"])
async def search_ticker(query: str = Query(..., description="Company name or ticker to search")):
    """Search for a stock by company name and get details."""
    snapshot, ticker = await get_direct_stock_details(query)
    
    # Extract current price from Alpaca snapshot
    current_price = 0.0
    change_pct = 0.0
    
    if "latestTrade" in snapshot and "p" in snapshot["latestTrade"]:
        current_price = float(snapshot["latestTrade"]["p"])
    elif "latestQuote" in snapshot and "ap" in snapshot["latestQuote"]:
        current_price = float(snapshot["latestQuote"]["ap"])
    
    if "dailyBar" in snapshot:
        daily = snapshot["dailyBar"]
        if "o" in daily and daily["o"] > 0:
            change_pct = ((current_price - daily["o"]) / daily["o"]) * 100
    
    return StockDetails(
        symbol=ticker,
        company_name=query,
        current_price=current_price,
        sector="Technology",  # Default for demo
        pe_ratio=None,
        change_pct=round(change_pct, 2),
        description=f"Stock details for {query}"
    )


@api_router.get("/stock/{ticker}", response_model=StockDetails, tags=["Search"])
async def get_stock_details(ticker: str):
    """Get stock details by ticker symbol."""
    try:
        snapshot = await get_market_data(ticker.upper())
        
        current_price = 0.0
        change_pct = 0.0
        
        if "latestTrade" in snapshot and "p" in snapshot["latestTrade"]:
            current_price = float(snapshot["latestTrade"]["p"])
        elif "latestQuote" in snapshot and "ap" in snapshot["latestQuote"]:
            current_price = float(snapshot["latestQuote"]["ap"])
        
        if "dailyBar" in snapshot:
            daily = snapshot["dailyBar"]
            if "o" in daily and daily["o"] > 0:
                change_pct = ((current_price - daily["o"]) / daily["o"]) * 100
        
        return StockDetails(
            symbol=ticker.upper(),
            company_name=ticker.upper(),
            current_price=current_price,
            sector="Technology",
            pe_ratio=None,
            change_pct=round(change_pct, 2),
            description=f"Market data for {ticker.upper()}"
        )
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Stock not found: {ticker}")


# --- Pending Orders Endpoints ---

@api_router.get("/orders/pending", response_model=Dict[str, List[Dict]], tags=["Orders"])
async def get_pending_orders():
    """Get all pending orders awaiting user confirmation."""
    return {"pending_orders": PENDING_ORDERS}


# --- Agent Endpoints ---

@api_router.post("/agent/", response_model=Dict[str, Any], tags=["Agent"])
async def run_agent(request: AgentRequest = Body(...)):
    """Run the AI agent to analyze portfolio and generate recommendations."""
    try:
        # Get current portfolio
        url = f"{ALPACA_TRADING_URL}/positions"
        headers = {
            "APCA-API-KEY-ID": ALPACA_API_KEY,
            "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY
        }
        
        try:
            positions = await asyncio.to_thread(_sync_get, url, headers, None, 30)
        except:
            positions = []
        
        recommendations = []
        
        # Analyze each position or use default tickers
        tickers_to_analyze = [p.get("symbol") for p in positions] if positions else ["AAPL", "MSFT", "GOOGL"]
        
        for ticker in tickers_to_analyze[:3]:  # Limit to 3 for demo speed
            try:
                result = await super_agent(ticker)
                
                # Create pending order
                order_id = f"ord_{uuid.uuid4().hex[:8]}"
                pending = {
                    "order_id": order_id,
                    "symbol": ticker,
                    "side": result.get("action", "HOLD").lower() if result.get("action") != "HOLD" else "hold",
                    "quantity": 10,  # Default quantity for demo
                    "confidence": result.get("confidence", 0.5),
                    "explanation": result.get("explanation", "No explanation"),
                    "top_features": [{"name": d, "score": 0.3} for d in result.get("drivers", [])[:3]],
                    "created_at": datetime.now().isoformat(),
                    "raw_payload": {
                        "symbol": ticker,
                        "side": result.get("action", "HOLD").lower(),
                        "confidence": result.get("confidence", 0.5),
                        "explanation": result.get("explanation", ""),
                        "top_features": [{"name": d, "score": 0.3} for d in result.get("drivers", [])[:3]]
                    }
                }
                
                # Only add buy/sell recommendations to pending
                if result.get("action") in ["BUY", "SELL"]:
                    PENDING_ORDERS.append(pending)
                
                recommendations.append(pending)
            except Exception as e:
                print(f"Error analyzing {ticker}: {e}")
                continue
        
        # Add audit entry
        add_audit_entry("AGENT_RUN", f"Agent analyzed {len(recommendations)} stocks", "Agent")
        
        return {
            "status": "success",
            "recommendations": recommendations,
            "message": f"Analyzed {len(recommendations)} positions"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")


# --- Trade Confirmation Endpoints ---

@api_router.post("/trade/confirm", response_model=Dict[str, Any], tags=["Trading"])
async def confirm_trade(request: TradeConfirmRequest = Body(...)):
    """Confirm or reject a pending trade recommendation."""
    # Find the pending order
    order = None
    order_index = -1
    for i, o in enumerate(PENDING_ORDERS):
        if o["order_id"] == request.order_id:
            order = o
            order_index = i
            break
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if request.confirm:
        # Execute the trade via Alpaca
        if order["side"] in ["buy", "sell"]:
            url = f"{ALPACA_TRADING_URL}/orders"
            headers = {
                "APCA-API-KEY-ID": ALPACA_API_KEY,
                "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY,
                "Content-Type": "application/json"
            }
            
            order_payload = {
                "symbol": order["symbol"],
                "qty": str(order["quantity"]),
                "side": order["side"],
                "type": "market",
                "time_in_force": "day"
            }
            
            try:
                alpaca_response = await asyncio.to_thread(_sync_post, url, headers, order_payload, 30)
                
                # Remove from pending
                PENDING_ORDERS.pop(order_index)
                
                # Add audit entry
                add_audit_entry(
                    "APPROVE",
                    f"Approved {order['side'].upper()} {order['quantity']} {order['symbol']}",
                    "User"
                )
                
                # Award points
                if "demo" in USER_POINTS:
                    USER_POINTS["demo"]["points"] += 10
                
                return {
                    "status": "executed",
                    "order_id": alpaca_response.get("id", order["order_id"]),
                    "message": f"Successfully executed {order['side']} order for {order['symbol']}"
                }
            except requests.HTTPError as e:
                error_detail = "Trade execution failed"
                try:
                    error_body = e.response.json()
                    error_detail = error_body.get("message", str(error_body))
                except:
                    pass
                raise HTTPException(status_code=400, detail=error_detail)
        else:
            # HOLD action - just acknowledge
            PENDING_ORDERS.pop(order_index)
            add_audit_entry("APPROVE", f"Acknowledged HOLD for {order['symbol']}", "User")
            return {"status": "acknowledged", "message": "Hold recommendation acknowledged"}
    else:
        # Reject/Cancel the recommendation
        PENDING_ORDERS.pop(order_index)
        add_audit_entry(
            "OVERRIDE",
            f"Rejected {order['side'].upper()} recommendation for {order['symbol']}",
            "User"
        )
        return {"status": "cancelled", "message": "Recommendation rejected"}


# --- Gamification Endpoints ---

@api_router.get("/game/points", response_model=GamePoints, tags=["Gamification"])
async def get_points():
    """Get user's gamification points and badges."""
    user_data = USER_POINTS.get("demo", {"points": 0, "badges": [], "streak": 0})
    return GamePoints(
        points=user_data.get("points", 0),
        badges=user_data.get("badges", []),
        streak=user_data.get("streak", 0)
    )


# --- Learning Endpoints ---

@api_router.get("/learn/daily", response_model=DailyLesson, tags=["Learning"])
async def get_daily_lesson():
    """Get today's learning content."""
    # Rotate lessons based on day
    day_index = datetime.now().day % len(DAILY_LESSONS)
    lesson = DAILY_LESSONS[day_index]
    return DailyLesson(**lesson)


# --- Audit Endpoints ---

@api_router.get("/audit", response_model=List[AuditLog], tags=["Compliance"])
async def get_audit_api(limit: int = 50):
    """Get system audit logs with hash chain."""
    return [AuditLog(**log) for log in AUDIT_LOGS[-limit:]]


# --- Legacy Endpoints (for backwards compatibility) ---

@api_router.get("/get_agent_analysis", response_model=StockAnalysis, tags=["Analysis"])
async def get_agent_analysis(symbol: str = Query(..., description="Stock symbol to analyze")):
    """Get AI-powered stock analysis with buy/sell/hold recommendation."""
    result = await super_agent(symbol)
    
    return StockAnalysis(
        symbol=symbol.upper(),
        recommendation=result.get("action", "HOLD"),
        confidence_score=float(result.get("confidence", 0.5)),
        analysis_date=datetime.now(),
        summary=result.get("explanation", "No analysis available")
    )


@api_router.get("/get_details_search_stock", response_model=StockDetails, tags=["Market Data"])
async def get_details_search_stock(query: str = Query(..., description="Company name or ticker to search")):
    """Get stock details by company name or ticker symbol."""
    snapshot, ticker = await get_direct_stock_details(query)
    
    current_price = 0.0
    if "latestTrade" in snapshot and "p" in snapshot["latestTrade"]:
        current_price = float(snapshot["latestTrade"]["p"])
    elif "latestQuote" in snapshot and "ap" in snapshot["latestQuote"]:
        current_price = float(snapshot["latestQuote"]["ap"])
    
    return StockDetails(
        symbol=ticker,
        company_name=query,
        current_price=current_price,
        sector=None,
        pe_ratio=None
    )


@api_router.get("/get_portfolio", response_model=List[PortfolioPosition], tags=["Account"])
async def get_portfolio():
    """Get current portfolio positions from Alpaca."""
    url = f"{ALPACA_TRADING_URL}/positions"
    headers = {
        "APCA-API-KEY-ID": ALPACA_API_KEY,
        "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY
    }
    
    try:
        positions = await asyncio.to_thread(_sync_get, url, headers, None, 30)
        
        result = []
        for pos in positions:
            result.append(PortfolioPosition(
                symbol=pos.get("symbol", ""),
                quantity=float(pos.get("qty", 0)),
                average_price=float(pos.get("avg_entry_price", 0)),
                current_value=float(pos.get("market_value", 0))
            ))
        return result
    except requests.HTTPError as e:
        return []
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Alpaca connection error: {str(e)}")


@api_router.get("/get_audit", response_model=List[AuditLog], tags=["Compliance"])
async def get_audit(limit: int = 10):
    """Get system audit logs."""
    return [AuditLog(**log) for log in AUDIT_LOGS[:limit]]


@api_router.post("/post_order", response_model=OrderResponse, tags=["Trading"])
async def post_order(order: OrderRequest):
    """Place a new buy or sell order via Alpaca."""
    url = f"{ALPACA_TRADING_URL}/orders"
    headers = {
        "APCA-API-KEY-ID": ALPACA_API_KEY,
        "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY,
        "Content-Type": "application/json"
    }
    
    order_payload = {
        "symbol": order.symbol.upper(),
        "qty": str(order.quantity),
        "side": order.side,
        "type": order.order_type,
        "time_in_force": "day"
    }
    
    if order.order_type == "limit" and order.limit_price is not None:
        order_payload["limit_price"] = str(order.limit_price)
    
    try:
        alpaca_response = await asyncio.to_thread(_sync_post, url, headers, order_payload, 30)
        
        add_audit_entry(
            "ORDER_PLACED",
            f"{order.side.upper()} {order.quantity} {order.symbol}",
            "User"
        )
        
        return OrderResponse(
            order_id=alpaca_response.get("id", "unknown"),
            status=alpaca_response.get("status", "unknown"),
            message=f"Successfully submitted {order.side} order for {order.quantity} shares of {order.symbol}",
            timestamp=datetime.now()
        )
    except requests.HTTPError as e:
        error_detail = "Unknown error"
        try:
            error_body = e.response.json()
            error_detail = error_body.get("message", str(error_body))
        except Exception:
            error_detail = e.response.text
        raise HTTPException(status_code=e.response.status_code, detail=f"Order failed: {error_detail}")
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Alpaca connection error: {str(e)}")


# Include the API router in the main app
app.include_router(api_router)


# ---------------------- Server Entry Point ------------------------ #

if __name__ == "__main__":
    print("=" * 50)
    print("Starting Plutus Stock Trading Agent API")
    print("=" * 50)
    print("Server: http://localhost:8000")
    print("API Docs: http://localhost:8000/docs")
    print("API Base: http://localhost:8000/api")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8000)
