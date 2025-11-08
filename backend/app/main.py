"""
FastAPI application for LendLocal AI demo backed by SQLite storage.

External integrations (Knot, xAI, Nessie, X) remain mocked and can be enabled
later via environment flags.
"""

from __future__ import annotations

from dotenv import load_dotenv
load_dotenv()

import json
import os
import random
import string
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

import httpx
from fastapi import FastAPI, HTTPException, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import database

# Load optional env keys for future integrations.
KNOT_API_KEY = os.getenv("KNOT_API_KEY")
GROK_API_KEY = os.getenv("GROK_API_KEY")
NESSIE_API_KEY = os.getenv("NESSIE_API_KEY")
X_API_KEY = os.getenv("X_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
FINANCE_BOT_MODEL = os.getenv("FINANCE_BOT_MODEL", "gpt-4o-mini")
FINANCE_BOT_URL = os.getenv("FINANCE_BOT_API_URL", "https://api.openai.com/v1/chat/completions")
FINANCE_BOT_HISTORY_LIMIT = int(os.getenv("FINANCE_BOT_HISTORY_LIMIT", "8"))
FINANCE_BOT_PROMPT = os.getenv(
    "FINANCE_BOT_SYSTEM_PROMPT",
    "You are Finance Bot, a cheerful AI that ONLY answers questions about personal finance, "
    "lending, credit, savings, budgeting, or financial literacy. "
    'If a user asks anything outside finance, reply: "I’m Finance Bot and only trained for money matters, sorry!" '
    "Use friendly, encouraging language and keep answers under 150 words.",
)
BANK_AVG_RATE = float(os.getenv("BANK_AVG_RATE", "9.5"))
COMMUNITY_PRECISION_DEGREES = float(os.getenv("COMMUNITY_PRECISION_DEGREES", "0.05"))
DEFAULT_COMMUNITY_LAT = float(os.getenv("DEFAULT_COMMUNITY_LAT", "40.3573"))
DEFAULT_COMMUNITY_LNG = float(os.getenv("DEFAULT_COMMUNITY_LNG", "-74.6672"))

INTEGRATIONS_ENABLED = {
    "knot": bool(KNOT_API_KEY),
    "grok": bool(GROK_API_KEY),
    "nessie": bool(NESSIE_API_KEY),
    "x": bool(X_API_KEY),
}

database.init_db()

ID_UPLOAD_DIR = Path(
    os.getenv(
        "ID_UPLOAD_DIR",
        Path(__file__).resolve().parent / "uploads" / "id_documents",
    )
)
ID_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_ID_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/heic",
    "image/heif",
    "application/pdf",
}
ALLOWED_ID_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf", ".heic", ".heif"}
MIME_EXTENSION_MAP = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/heic": ".heic",
    "image/heif": ".heif",
    "application/pdf": ".pdf",
}
MAX_ID_UPLOAD_BYTES = int(os.getenv("ID_UPLOAD_MAX_BYTES", 5 * 1024 * 1024))
ID_UPLOAD_CHUNK_SIZE = 1024 * 1024

app = FastAPI(title="LendLocal AI API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _generate_id(prefix: str) -> str:
    return f"{prefix}_{''.join(random.choices(string.ascii_lowercase + string.digits, k=8))}"


def _safe_document_extension(filename: Optional[str], content_type: str) -> str:
    suffix = Path(filename or "").suffix.lower()
    if suffix in ALLOWED_ID_EXTENSIONS:
        return suffix
    return MIME_EXTENSION_MAP.get(content_type, ".jpg")


# ---- Models ----
class Geo(BaseModel):
    lat: float
    lng: float


class UserCreateRequest(BaseModel):
    role: str = Field(pattern="^(borrower|lender)$")
    geo: Optional[Geo] = None
    min_rate: Optional[float] = None
    max_amount: Optional[float] = None


class VerifyIdRequest(BaseModel):
    user_id: Optional[str] = None


class BorrowReasonRequest(BaseModel):
    user_id: str
    reason: str


class BorrowAmountRequest(BaseModel):
    user_id: str
    amount: float


class BorrowOptionsRequest(BaseModel):
    user_id: str


class BorrowDeclineRequest(BaseModel):
    user_id: str


class LoanRequest(BaseModel):
    user_id: str


class NessieTransferRequest(BaseModel):
    match_id: str


class FeedPostRequest(BaseModel):
    user_id: str
    text: str
    share_opt_in: bool


class FinanceBotMessage(BaseModel):
    sender: str = Field(pattern="^(user|bot)$")
    text: str


class FinanceBotRequest(BaseModel):
    prompt: str
    history: List[FinanceBotMessage] = Field(default_factory=list)


class FinanceBotResponse(BaseModel):
    reply: str


def _community_from_geo(geo: Geo) -> str:
    """Derive a coarse-grained community identifier from coordinates."""
    precision = COMMUNITY_PRECISION_DEGREES or 0.05
    lat_bucket = round(geo.lat / precision) * precision
    lng_bucket = round(geo.lng / precision) * precision
    return f"{lat_bucket:.4f}:{lng_bucket:.4f}"


def _require_user(user_id: str) -> Dict:
    row = database.fetchone(
        """
        SELECT
            id,
            role,
            is_borrower,
            is_verified,
            lat,
            lng,
            min_rate,
            max_amount,
            created_at,
            community_id,
            location_locked
        FROM users
        WHERE id = ?
        """,
        (user_id,),
    )
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    location_locked = bool(row["location_locked"])
    return {
        "id": row["id"],
        "role": row["role"],
        "is_borrower": bool(row["is_borrower"]),
        "is_verified": bool(row["is_verified"]),
        "geo": {"lat": row["lat"], "lng": row["lng"]},
        "min_rate": row["min_rate"],
        "max_amount": row["max_amount"],
        "created_at": row["created_at"],
        "community_id": row["community_id"],
        "location_locked": location_locked,
    }


def _get_borrow_amount(user_id: str) -> Optional[float]:
    row = database.fetchone(
        "SELECT amount FROM borrow_amounts WHERE user_id = ?",
        (user_id,),
    )
    return row["amount"] if row else None


def _risk_logic(user_id: str) -> Dict:
    user = _require_user(user_id)
    amount = _get_borrow_amount(user_id) or 0.0
    ceiling = user.get("max_amount", 1500)
    ratio = amount / ceiling if ceiling else 1
    ratio = min(max(ratio, 0), 1.2)
    base_score = max(5, 95 - ratio * 60)
    score = round(base_score)
    if score >= 70:
        label = "low"
        recommendation = "yes"
    elif score >= 45:
        label = "med"
        recommendation = "maybe"
    else:
        label = "high"
        recommendation = "no"
    explanation = (
        f"Request of ${amount:.0f} vs savings capacity suggests {label} risk relative to peers."
    )
    return {
        "score": score,
        "label": label,
        "explanation": explanation,
        "recommendation": recommendation,
    }


# --- Auth/Session ---
@app.post("/users/create")
def create_user(payload: UserCreateRequest):
    user_id = _generate_id("user")
    min_rate = payload.min_rate or 3.5
    max_amount = payload.max_amount or 1500.0
    geo = payload.geo or Geo(lat=DEFAULT_COMMUNITY_LAT, lng=DEFAULT_COMMUNITY_LNG)
    community_id = _community_from_geo(geo)
    database.execute(
        """
        INSERT INTO users (
            id,
            role,
            is_borrower,
            is_verified,
            lat,
            lng,
            min_rate,
            max_amount,
            created_at,
            community_id,
            location_locked
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            user_id,
            payload.role,
            int(payload.role == "borrower"),
            0,
            geo.lat,
            geo.lng,
            min_rate,
            max_amount,
            datetime.utcnow().isoformat(),
            community_id,
            0,
        ),
    )
    return {
        "user_id": user_id,
        "role": payload.role,
        "is_borrower": payload.role == "borrower",
        "is_verified": False,
    }


@app.post("/verify-id")
async def verify_id(
    user_id: str = Form(...),
    document: UploadFile = File(...),
    detected_lat: Optional[float] = Form(None),
    detected_lng: Optional[float] = Form(None),
):
    if not user_id:
        raise HTTPException(status_code=422, detail="User ID is required.")
    try:
        user = _require_user(user_id)
    except HTTPException as exc:
        if exc.status_code != 404:
            raise
        user = None

    content_type = document.content_type or ""
    if content_type not in ALLOWED_ID_MIME_TYPES:
        raise HTTPException(
            status_code=422,
            detail="Unsupported file type. Upload a JPG, PNG, HEIC, or PDF.",
        )

    extension = _safe_document_extension(document.filename, content_type)
    storage_name = f"{user_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}{extension}"
    destination = ID_UPLOAD_DIR / storage_name

    size = 0
    try:
        with destination.open("wb") as buffer:
            while True:
                chunk = await document.read(ID_UPLOAD_CHUNK_SIZE)
                if not chunk:
                    break
                size += len(chunk)
                if size > MAX_ID_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail="File too large. Maximum size is 5 MB.",
                    )
                buffer.write(chunk)
    except HTTPException:
        if destination.exists():
            destination.unlink()
        raise
    except Exception as exc:
        if destination.exists():
            destination.unlink()
        raise HTTPException(status_code=500, detail="Could not save document.") from exc
    finally:
        await document.close()

    if size == 0:
        if destination.exists():
            destination.unlink()
        raise HTTPException(status_code=422, detail="Uploaded file is empty.")

    demo_geo = Geo(lat=DEFAULT_COMMUNITY_LAT, lng=DEFAULT_COMMUNITY_LNG)
    if user:
        database.execute(
            """
            UPDATE users
            SET lat = ?, lng = ?, community_id = ?, location_locked = 1, is_verified = 1
            WHERE id = ?
            """,
            (
                demo_geo.lat,
                demo_geo.lng,
                _community_from_geo(demo_geo),
                user_id,
            ),
        )

        database.execute(
            """
            INSERT INTO id_verifications (user_id, filename, content_type, size_bytes, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                storage_name,
                content_type,
                size,
                "verified",
                datetime.utcnow().isoformat(),
            ),
        )

    return {
        "verified": True,
        "message": "Location verified! Welcome to the Princeton community!",
        "status": "verified",
    }


# --- Borrow flow ---
@app.post("/borrow/reason")
def save_borrow_reason(payload: BorrowReasonRequest):
    user = _require_user(payload.user_id)
    if user["role"] != "borrower":
        raise HTTPException(status_code=400, detail="Only borrowers can set reasons.")
    if not payload.reason.strip():
        raise HTTPException(status_code=422, detail="Reason is required.")
    database.execute(
        """
        INSERT INTO borrow_reasons (user_id, reason)
        VALUES (?, ?)
        ON CONFLICT(user_id) DO UPDATE SET reason = excluded.reason
        """,
        (payload.user_id, payload.reason.strip()),
    )
    return {"ok": True}


@app.post("/borrow/amount")
def save_borrow_amount(payload: BorrowAmountRequest):
    user = _require_user(payload.user_id)
    if user["role"] != "borrower":
        raise HTTPException(status_code=400, detail="Only borrowers can set amounts.")
    if payload.amount <= 0:
        raise HTTPException(status_code=422, detail="Amount must be positive.")
    database.execute(
        """
        INSERT INTO borrow_amounts (user_id, amount)
        VALUES (?, ?)
        ON CONFLICT(user_id) DO UPDATE SET amount = excluded.amount
        """,
        (payload.user_id, payload.amount),
    )
    return {"ok": True}


@app.get("/borrow/risk")
def get_borrow_risk(user_id: str):
    _require_user(user_id)
    amount = _get_borrow_amount(user_id)
    if amount is None:
        raise HTTPException(status_code=404, detail="Borrow amount not set.")
    return _risk_logic(user_id)


@app.post("/borrow/options")
def get_borrow_options(payload: BorrowOptionsRequest):
    borrower = _require_user(payload.user_id)
    amount = _get_borrow_amount(payload.user_id)
    if not amount:
        raise HTTPException(status_code=404, detail="Borrow amount missing.")

    community_filter = borrower["community_id"] if borrower["location_locked"] else None
    lenders = _fetch_lenders(
        community_filter,
        require_lock=borrower["location_locked"],
    )
    if not lenders:
        if borrower["location_locked"] and community_filter:
            raise HTTPException(
                status_code=404,
                detail="No lenders available in your community yet.",
            )
        raise HTTPException(status_code=404, detail="No community lenders available yet.")

    total_pool = sum(l["capital"] for l in lenders)
    if total_pool < amount:
        raise HTTPException(
            status_code=422,
            detail="Community pool does not have enough capital to fulfill this request.",
        )

    combos = _generate_lender_combos(amount, lenders)
    if not combos:
        raise HTTPException(
            status_code=422,
            detail="Unable to assemble a lender pool for this amount right now.",
        )

    # Drop internal tracking before returning.
    for combo in combos:
        combo.pop("source_user_ids", None)
    return {"combos": combos}


@app.post("/borrow/decline")
def borrow_decline(payload: BorrowDeclineRequest):
    _require_user(payload.user_id)
    risk = _risk_logic(payload.user_id)
    amount = _get_borrow_amount(payload.user_id) or 0.0
    feedback = (
        f"Risk score {risk['score']} suggests waiting. "
        f"Reduce your request by ${amount * 0.2:.0f} or add savings."
    )
    return {"feedback": feedback}


# --- Match + transfers ---
@app.post("/loans/request")
def create_loan_request(payload: LoanRequest):
    borrower = _require_user(payload.user_id)
    amount = _get_borrow_amount(payload.user_id)
    if not amount:
        raise HTTPException(status_code=404, detail="Borrow amount missing.")
    risk = _risk_logic(payload.user_id)
    if borrower["location_locked"]:
        community_filter = borrower["community_id"]
        require_lock = True
    else:
        # Demo fallback: auto-place borrowers into the default community without ID upload.
        demo_geo = Geo(lat=DEFAULT_COMMUNITY_LAT, lng=DEFAULT_COMMUNITY_LNG)
        community_filter = borrower["community_id"] or _community_from_geo(demo_geo)
        require_lock = False
    lenders = _fetch_lenders(community_filter, require_lock=require_lock)
    if not lenders:
        raise HTTPException(
            status_code=404,
            detail="No lenders available in your community yet.",
        )

    allocations = _allocate_from_lenders(amount, lenders)
    if not allocations:
        raise HTTPException(
            status_code=422,
            detail="Community pool does not have enough capital to fulfill this request.",
        )

    lender_parts = [
        {k: v for k, v in allocation.items() if k != "user_id"}
        for allocation in allocations
    ]
    match_id = _generate_id("match")
    database.execute(
        """
        INSERT INTO matches (id, user_id, total_amount, lenders_json, risk_score)
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            match_id,
            payload.user_id,
            amount,
            json.dumps(lender_parts),
            risk["score"],
        ),
    )
    advice = "Great fit—community lenders ready." if risk["recommendation"] == "yes" else "Matched with cautious lenders."
    return {
        "match_id": match_id,
        "total_amount": amount,
        "lenders": lender_parts,
        "risk_score": risk["score"],
        "ai_advice": advice,
    }


@app.post("/nessie/transfer")
def mock_transfer(payload: NessieTransferRequest):
    match = database.fetchone(
        "SELECT id FROM matches WHERE id = ?",
        (payload.match_id,),
    )
    if not match:
        raise HTTPException(status_code=404, detail="Match not found.")
    txn_id = _generate_id("txn")
    return {"txn_id": txn_id, "message": "Funds transferred (mock)"}


# --- Community feed ---
@app.post("/feed/post")
def create_feed_post(payload: FeedPostRequest):
    user = _require_user(payload.user_id)
    if not payload.text.strip():
        raise HTTPException(status_code=422, detail="Text required.")
    post_id = _generate_id("post")
    timestamp = datetime.utcnow().isoformat()
    database.execute(
        """
        INSERT INTO posts (id, user_id, text, ts, user_role)
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            post_id,
            payload.user_id if payload.share_opt_in else None,
            payload.text.strip(),
            timestamp,
            user["role"],
        ),
    )
    preview = "You shared an update." if payload.share_opt_in else "Someone shared an update."
    return {"post_id": post_id, "preview": preview}


@app.get("/feed")
def get_feed():
    rows = database.fetchall(
        "SELECT id, user_id, text, ts, user_role FROM posts ORDER BY ts DESC",
    )
    posts = [
        {
            "id": row["id"],
            "text": row["text"],
            "ts": row["ts"],
            "userRole": row["user_role"],
        }
        for row in rows
    ]
    return {"posts": posts}


# --- Dashboards ---
@app.get("/dashboard/borrower")
def borrower_dashboard(user_id: str):
    _require_user(user_id)
    amount = _get_borrow_amount(user_id) or 200.0
    next_payment = round(min(amount / 10, 50), 2)
    return {
        "next_payment": {"amount": next_payment, "due_in_weeks": 1},
        "total_owed_year": round(amount, 2),
        "savings_vs_bank_year": round((BANK_AVG_RATE / 100) * amount, 2),
    }


@app.get("/dashboard/lender")
def lender_dashboard(user_id: str):
    user = _require_user(user_id)
    capital = user.get("max_amount", 1500)
    return {
        "next_payment": {"amount": round(capital * 0.01, 2), "due_in_weeks": 1},
        "expected_revenue_year": round(capital * 0.12, 2),
    }


@app.post("/finance-bot", response_model=FinanceBotResponse)
async def finance_bot(payload: FinanceBotRequest):
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="Finance Bot is offline right now.")
    prompt = payload.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=422, detail="Prompt is required.")

    trimmed_history = payload.history[-FINANCE_BOT_HISTORY_LIMIT :]
    chat_messages: List[Dict[str, str]] = [{"role": "system", "content": FINANCE_BOT_PROMPT}]
    for entry in trimmed_history:
        text = entry.text.strip()
        if not text:
            continue
        role = "assistant" if entry.sender == "bot" else "user"
        chat_messages.append({"role": role, "content": text})
    chat_messages.append({"role": "user", "content": prompt})

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                FINANCE_BOT_URL,
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": FINANCE_BOT_MODEL,
                    "temperature": 0.3,
                    "messages": chat_messages,
                },
            )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail="Finance Bot request failed.") from exc

    if response.status_code >= 400:
        try:
            error_detail = response.json().get("error", {}).get("message")
        except Exception:  # pragma: no cover - defensive
            error_detail = None
        raise HTTPException(status_code=response.status_code, detail=error_detail or "Finance Bot error.")

    try:
        payload_json = response.json()
    except json.JSONDecodeError as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=502, detail="Finance Bot returned invalid data.") from exc

    reply = (
        payload_json.get("choices", [{}])[0]
        .get("message", {})
        .get("content", "")
        .strip()
    )
    if not reply:
        reply = "Finance Bot is unsure how to help with that right now."
    return {"reply": reply}

def _format_lender_id(user_id: str) -> str:
    suffix = user_id.split("_", 1)[-1]
    return f"Lender-{suffix[:4].upper()}"


def _fetch_lenders(
    community_id: Optional[str] = None,
    require_lock: bool = False,
) -> List[Dict]:
    params: List = []
    query = """
        SELECT id, max_amount, min_rate
        FROM users
        WHERE role = 'lender'
    """
    if community_id:
        query += " AND community_id = ?"
        params.append(community_id)
    if require_lock:
        query += " AND location_locked = 1"
    query += " ORDER BY min_rate ASC, max_amount DESC"
    rows = database.fetchall(query, tuple(params))
    return [
        {
            "id": row["id"],
            "capital": float(row["max_amount"]),
            "rate": float(row["min_rate"]),
        }
        for row in rows
        if row["max_amount"] and row["max_amount"] > 0
    ]


def _allocate_from_lenders(amount: float, lenders: List[Dict]) -> List[Dict]:
    remaining = amount
    allocations = []
    for lender in lenders:
        if remaining <= 0:
            break
        available = lender["capital"]
        contribution = min(available, remaining)
        if contribution <= 0:
            continue
        allocations.append(
            {
                "lenderId": _format_lender_id(lender["id"]),
                "amount": round(contribution, 2),
                "rate": round(lender["rate"], 2),
                "user_id": lender["id"],
            }
        )
        remaining -= contribution
    if remaining > 0:
        return []

    # Adjust for rounding drift so contributions sum to request amount.
    total_assigned = sum(part["amount"] for part in allocations)
    drift = round(amount - total_assigned, 2)
    if allocations and drift:
        allocations[-1]["amount"] = round(allocations[-1]["amount"] + drift, 2)
    return allocations


def _generate_lender_combos(amount: float, lenders: List[Dict]) -> List[Dict]:
    combos: List[Dict] = []
    seen_sources = set()
    max_window = min(3, len(lenders))
    for window in range(1, max_window + 1):
        window_lenders = lenders[:window]
        parts = _allocate_from_lenders(amount, window_lenders)
        if not parts:
            continue
        source_ids = tuple(part["user_id"] for part in parts)
        if source_ids in seen_sources:
            continue
        seen_sources.add(source_ids)
        combos.append(
            {
                "id": f"c{len(combos) + 1}",
                "total": round(amount, 2),
                "parts": [
                    {k: v for k, v in part.items() if k != "user_id"}
                    for part in parts
                ],
                "source_user_ids": [part["user_id"] for part in parts],
            }
        )

    if combos:
        return combos

    # Fall back to using the full lender list if earlier windows lacked coverage.
    parts = _allocate_from_lenders(amount, lenders)
    if parts:
        source_ids = tuple(part["user_id"] for part in parts)
        if source_ids in seen_sources:
            return combos
        seen_sources.add(source_ids)
        combos.append(
            {
                "id": "c_all",
                "total": round(amount, 2),
                "parts": [
                    {k: v for k, v in part.items() if k != "user_id"}
                    for part in parts
                ],
                "source_user_ids": [part["user_id"] for part in parts],
            }
        )
    return combos
