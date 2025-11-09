"""
FastAPI application for LendLocal AI demo backed by SQLite storage.

External integrations (Knot, xAI, Nessie, X) remain mocked and can be enabled
later via environment flags.
"""

from __future__ import annotations

from dotenv import load_dotenv

load_dotenv()

import json
import logging
import os
import random
import re
import string
import math
from datetime import datetime, timedelta
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import httpx
import requests
from fastapi import FastAPI, HTTPException, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from requests_oauthlib import OAuth1

from . import database

# Load optional env keys for future integrations.
KNOT_API_KEY = os.getenv("KNOT_API_KEY")
GROK_API_KEY = os.getenv("GROK_API_KEY")
GROK_MODEL = os.getenv("GROK_MODEL", "grok-4-mini")
GROK_BASE_URL = os.getenv("GROK_BASE_URL", "https://api.x.ai")
NESSIE_API_KEY = os.getenv("NESSIE_API_KEY")
X_API_KEY = os.getenv("X_API_KEY")
X_CONSUMER_KEY = os.getenv("X_CONSUMER_KEY")
X_CONSUMER_SECRET = os.getenv("X_CONSUMER_SECRET")
X_ACCESS_TOKEN = os.getenv("X_ACCESS_TOKEN")
X_ACCESS_TOKEN_SECRET = os.getenv("X_ACCESS_TOKEN_SECRET")
GEMINI_API_KEY = (
    os.getenv("GEMINI_API_KEY")
    or os.getenv("GOOGLE_API_KEY")
    or os.getenv("GOOGLE-API-KEY")
)
FINANCE_BOT_MODEL = os.getenv("FINANCE_BOT_MODEL", "gemini-2.5-flash")
FINANCE_BOT_URL = os.getenv(
    "FINANCE_BOT_API_URL",
    "https://generativelanguage.googleapis.com/v1beta/models",
)
FINANCE_BOT_HISTORY_LIMIT = int(os.getenv("FINANCE_BOT_HISTORY_LIMIT", "8"))
FINANCE_BOT_PROMPT = os.getenv(
    "FINANCE_BOT_SYSTEM_PROMPT",
    "You are Finance Bot, a cheerful AI that ONLY answers questions about personal finance, "
    "lending, credit, savings, budgeting, or financial literacy. "
    'If a user asks anything outside finance, reply: "I’m Finance Bot and only trained for money matters, sorry!" '
    "Use friendly, encouraging language and keep answers under 150 words."
    "Do not use any markdown styling.",
)
BANK_AVG_RATE = float(os.getenv("BANK_AVG_RATE", "9.5"))
COMMUNITY_PRECISION_DEGREES = float(os.getenv("COMMUNITY_PRECISION_DEGREES", "0.05"))
DEFAULT_COMMUNITY_LAT = float(os.getenv("DEFAULT_COMMUNITY_LAT", "40.3573"))
DEFAULT_COMMUNITY_LNG = float(os.getenv("DEFAULT_COMMUNITY_LNG", "-74.6672"))
KNOT_DATA_DIR = Path(__file__).resolve().parent / "knot_mock_data"
KNOT_MERCHANTS = {
    45: {
        "merchant_name": "Walmart Supercenter",
        "slug": "walmart",
        "file": "development_45_walmart.json",
        "description": "Groceries & household supplies",
    },
    19: {
        "merchant_name": "DoorDash",
        "slug": "doordash",
        "file": "development_19_doordash.json",
        "description": "Food delivery history",
    },
}
ESSENTIAL_KEYWORDS = (
    "grocery",
    "milk",
    "baby",
    "diaper",
    "produce",
    "household",
    "electric",
    "utility",
    "medicine",
    "pharmacy",
    "tuition",
    "rent",
    "gas",
    "school",
    "food",
    "meal",
    "pantry",
)

INTEGRATIONS_ENABLED = {
    "knot": bool(KNOT_API_KEY),
    "grok": bool(GROK_API_KEY),
    "nessie": bool(NESSIE_API_KEY),
    "x": bool(X_API_KEY),
}

logger = logging.getLogger(__name__)

database.init_db()

_x_user_cache: Dict[str, Tuple[str, datetime]] = {}
_x_tweet_cache: Dict[str, Tuple[List[Dict], datetime]] = {}

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


def _x_headers() -> Dict[str, str]:
    if not X_API_KEY:
        raise HTTPException(status_code=503, detail="X integration disabled")
    return {"Authorization": f"Bearer {X_API_KEY}"}


def _get_x_user_id(handle: str) -> str:
    key = handle.lower()
    cached = _x_user_cache.get(key)
    if cached and cached[1] > datetime.utcnow() - timedelta(hours=6):
        return cached[0]
    url = f"https://api.x.com/2/users/by/username/{handle}"
    try:
        resp = httpx.get(url, headers=_x_headers(), timeout=10)
        resp.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Failed to reach X API: {exc}") from exc
    data = resp.json()
    user_id = data.get("data", {}).get("id")
    if not user_id:
        raise HTTPException(status_code=404, detail="X user not found")
    _x_user_cache[key] = (user_id, datetime.utcnow())
    return user_id


def _get_x_tweets(handle: str, limit: int) -> List[Dict]:
    limit = max(1, min(limit, 20))
    cache_key = f"{handle.lower()}:{limit}"
    cached = _x_tweet_cache.get(cache_key)
    if cached and cached[1] > datetime.utcnow() - timedelta(minutes=1):
        return cached[0]

    user_id = _get_x_user_id(handle)
    params = {
        "max_results": str(limit),
        "tweet.fields": "created_at,public_metrics,text",
        "exclude": "replies",
    }
    url = f"https://api.x.com/2/users/{user_id}/tweets"
    try:
        resp = httpx.get(url, headers=_x_headers(), params=params, timeout=10)
        resp.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Failed to fetch tweets: {exc}") from exc
    payload = resp.json()
    tweets = []
    for item in payload.get("data", []):
        metrics = item.get("public_metrics") or {}
        tweets.append(
            {
                "id": item.get("id"),
                "text": item.get("text"),
                "created_at": item.get("created_at"),
                "like_count": metrics.get("like_count"),
                "retweet_count": metrics.get("retweet_count"),
                "reply_count": metrics.get("reply_count"),
                "quote_count": metrics.get("quote_count"),
            }
        )
    _x_tweet_cache[cache_key] = (tweets, datetime.utcnow())
    return tweets


def _can_post_to_x() -> bool:
    return all([X_CONSUMER_KEY, X_CONSUMER_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET])


def _share_loan_on_x(user_id: str, amount: float, lenders: List[Dict]) -> Tuple[Optional[str], Optional[str]]:
    if not _can_post_to_x():
        logger.info("X posting disabled; missing OAuth credentials.")
        return None, "disabled"
    if amount <= 0:
        return None, "invalid_amount"
    suffix = user_id.split("_")[-1][:4]
    lender_count = len(lenders)
    text = (
        f"FairFlow update: Princeton is saving together 💚\n"
        f"A neighbor just borrowed ${amount:,.0f} for educational expenses "
        f"from {lender_count} local supporter(s). #BorrowLocal #FairFlow"
    )
    auth = OAuth1(
        X_CONSUMER_KEY,
        X_CONSUMER_SECRET,
        X_ACCESS_TOKEN,
        X_ACCESS_TOKEN_SECRET,
    )
    try:
        resp = requests.post(
            "https://api.x.com/2/tweets",
            json={"text": text},
            auth=auth,
            timeout=10,
        )
        resp.raise_for_status()
    except requests.RequestException as exc:
        body = getattr(getattr(exc, "response", None), "text", "")
        logger.warning("X share failed for %s: %s | body=%s", user_id, exc, (body or "")[:200])
        return None, "post_failed"
    data = resp.json().get("data", {})
    tweet_id = data.get("id")
    if tweet_id:
        logger.info("Shared loan update to X tweet_id=%s user=%s", tweet_id, user_id)
    return tweet_id, None


@lru_cache(maxsize=8)
def _load_knot_orders(merchant_id: int):
    meta = KNOT_MERCHANTS.get(merchant_id)
    if not meta:
        raise KeyError(f"Unknown merchant id {merchant_id}")
    path = KNOT_DATA_DIR / meta["file"]
    if not path.exists():
        raise FileNotFoundError(f"Mock data file missing for merchant {merchant_id}")
    with path.open() as fp:
        return json.load(fp)


def _extract_knot_entries(payload) -> List[Dict]:
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in ("transactions", "orders", "data", "items"):
            value = payload.get(key)
            if isinstance(value, list):
                return value
        return [payload]
    return []


def _to_float(value) -> float:
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        cleaned = value.replace("$", "").replace(",", "").strip()
        try:
            return float(cleaned)
        except ValueError:
            return 0.0
    return 0.0


def _is_essential_purchase(text: str) -> bool:
    if not text:
        return False
    lowered = text.lower()
    return any(keyword in lowered for keyword in ESSENTIAL_KEYWORDS)


def _orders_to_transactions(merchant_id: int) -> List[Dict]:
    meta = KNOT_MERCHANTS[merchant_id]
    payload = _load_knot_orders(merchant_id)
    orders = _extract_knot_entries(payload)
    transactions: List[Dict] = []
    for order in orders:
        if not isinstance(order, dict):
            continue
        amount = float(order.get("price", {}).get("total") or 0)
        if "price" in order:
            amount = _to_float(order["price"].get("total") or order["price"].get("sub_total"))
        elif order.get("amount"):
            amount = _to_float(order.get("amount"))
        if amount <= 0:
            continue
        products = order.get("products") or order.get("line_items") or []
        product_names = [p.get("name", "").strip() for p in products if isinstance(p, dict) and p.get("name")]
        description = ", ".join(product_names[:2]) or meta["description"]
        if len(product_names) > 2:
            description += "…"
        posted_at = (
            order.get("dateTime")
            or order.get("datetime")
            or order.get("posted_at")
            or order.get("timestamp")
            or datetime.utcnow().isoformat()
        )
        status = (
            order.get("orderStatus")
            or order.get("order_status")
            or order.get("category")
            or "order"
        )
        record_id = order.get("externalId") or order.get("external_id") or order.get("id") or _generate_id(
            f"{meta['slug']}"
        )
        transactions.append(
            {
                "id": f"{meta['slug']}_{record_id}",
                "merchant": meta["merchant_name"],
                "merchant_id": merchant_id,
                "amount": round(amount, 2),
                "category": str(status).lower(),
                "description": description,
                "is_essential": None,
                "posted_at": posted_at,
            }
        )
    return transactions


def _get_knot_profile(user_id: str) -> Optional[Dict]:
    row = database.fetchone(
        "SELECT merchants_json, transactions_json, updated_at FROM knot_profiles WHERE user_id = ?",
        (user_id,),
    )
    if not row:
        return None
    merchants = json.loads(row["merchants_json"])
    transactions = json.loads(row["transactions_json"])
    return {
        "merchants": merchants,
        "transactions": transactions,
        "updated_at": row["updated_at"],
    }


def _save_knot_profile(user_id: str, merchants: List[Dict], transactions: List[Dict]) -> Dict:
    updated_at = datetime.utcnow().isoformat()
    database.execute(
        """
        INSERT INTO knot_profiles (user_id, merchants_json, transactions_json, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            merchants_json = excluded.merchants_json,
            transactions_json = excluded.transactions_json,
            updated_at = excluded.updated_at
        """,
        (user_id, json.dumps(merchants), json.dumps(transactions), updated_at),
    )
    return {"merchants": merchants, "transactions": transactions, "updated_at": updated_at}


def _compute_knot_summary(profile: Optional[Dict]) -> Optional[Dict]:
    if not profile:
        return None
    transactions = profile.get("transactions") or []
    if not transactions:
        return None
    total = sum(t.get("amount", 0) for t in transactions)
    if total <= 0:
        return None
    merchants = profile.get("merchants", [])
    return {
        "merchants": [m.get("merchant_name") for m in merchants],
        "avg_monthly_spend": round(total / 3, 2),
        "orders": len(transactions),
        "essentials_ratio": None,
        "last_sync": profile.get("updated_at"),
    }


def _extract_json_blob(text: Optional[str]) -> Optional[Dict]:
    if not text:
        return None
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return None


def _format_transactions_for_prompt(transactions: List[Dict], limit: int = 10) -> str:
    snippets = []
    for txn in transactions[:limit]:
        snippets.append(
            f"- {txn['posted_at'][:10]} • {txn['merchant']} • ${txn['amount']:.2f} • {txn['description']}"
        )
    return "\n".join(snippets) if snippets else "No purchase history linked."


def _call_grok_risk_analysis(
    user_id: str,
    amount: float,
    knot_summary: Optional[Dict],
    transactions: List[Dict],
) -> Optional[Dict]:
    if not GROK_API_KEY:
        return None
    prompt_lines = [
        f"Borrow request amount: ${amount:.2f}",
        f"Linked merchants: {', '.join(knot_summary['merchants'])}" if knot_summary else "No linked merchants.",
        f"Average monthly spend: ${knot_summary['avg_monthly_spend']:.2f}" if knot_summary else "",
        "Recent purchases:",
        _format_transactions_for_prompt(transactions),
        "Analyze which purchases look essential (food, housing, medical, childcare, utilities) versus discretionary.",
        "Return JSON with keys: score (0-100 integer, higher means safer), recommendation ('yes','maybe','no'), explanation (<=40 words), essentials_ratio (0-1 float share of essential spend).",
    ]
    payload = {
        "model": GROK_MODEL,
        "messages": [
            {
                "role": "system",
                "content": "You are Grok, an AI credit analyst for community microlending. Reply ONLY with JSON.",
            },
            {"role": "user", "content": "\n".join(line for line in prompt_lines if line)},
        ],
        "temperature": 0.2,
    }
    headers = {"Authorization": f"Bearer {GROK_API_KEY}", "Content-Type": "application/json"}
    try:
        response = httpx.post(
            f"{GROK_BASE_URL.rstrip('/')}/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=20,
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        detail = None
        if exc.response is not None:
            try:
                detail = exc.response.text
            except Exception:  # pragma: no cover
                detail = None
        if detail:
            logger.warning(
                "Grok risk call failed for user %s: %s | Body: %s",
                user_id,
                exc,
                detail[:300],
            )
        else:
            logger.warning("Grok risk call failed for user %s: %s", user_id, exc)
        return None

    data = response.json()
    content = (data.get("choices") or [{}])[0].get("message", {}).get("content")
    parsed = _extract_json_blob(content)
    if not parsed:
        logger.warning("Grok response unparsable for user %s: %s", user_id, content)
        return None
    result = {
        "score": parsed.get("score"),
        "recommendation": parsed.get("recommendation"),
        "explanation": parsed.get("explanation"),
        "model": data.get("model") or GROK_MODEL,
    }
    if "essentials_ratio" in parsed:
        result["essentials_ratio"] = parsed.get("essentials_ratio")
    return result


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


class KnotLinkRequest(BaseModel):
    user_id: str
    merchant_id: int = Field(ge=1)


class FinanceBotMessage(BaseModel):
    sender: str = Field(pattern="^(user|bot)$")
    text: str


class FinanceBotRequest(BaseModel):
    prompt: str
    history: List[FinanceBotMessage] = Field(default_factory=list)


class FinanceBotResponse(BaseModel):
    reply: str


def _fallback_finance_reply(prompt: str, history: List[FinanceBotMessage]) -> str:
    """Deterministic backup guidance when Gemini is unavailable."""

    def _field(entry: Any, attr: str) -> str:
        if hasattr(entry, attr):
            return getattr(entry, attr) or ""
        if isinstance(entry, dict):
            return entry.get(attr, "") or ""
        return ""

    last_user_text = ""
    for entry in reversed(history):
        if _field(entry, "sender") == "user":
            last_user_text = _field(entry, "text").strip()
            if last_user_text:
                break

    prompt_lower = prompt.lower()
    base_close = " Once you adjust those pieces, ask me again and I can sketch the next steps."

    if any(word in prompt_lower for word in ("deny", "decline", "reject", "why", "fix")):
        return (
            "Your latest request was paused because the risk gauge is still in the orange zone. "
            "Trim about 20% off the requested loan, link another everyday merchant, and show at least two weeks of savings activity."
            + base_close
        )

    if any(word in prompt_lower for word in ("loan", "apply", "approval", "qualify")):
        return (
            "To move toward a FairFlow loan, lock in your ID, keep essentials spending above 65%, "
            "and size the request so weekly payments stay under 10% of your take-home pay."
            + base_close
        )

    if any(word in prompt_lower for word in ("save", "savings", "budget", "plan", "spend", "shopping")):
        return (
            "Start a three-step savings plan: 1) earmark a fixed amount right after payday, "
            "2) move one discretionary purchase each week into an essentials bucket, "
            "3) snapshot balances every Sunday so FairFlow sees a steady cushion."
            + base_close
        )

    echo = f" (Last note from you: {last_user_text})" if last_user_text and last_user_text != prompt else ""
    return (
        "Finance Bot is in offline mode, so I am sharing playbook tips from past borrowers. "
        "Keep your essentials share high, pad savings for two weeks, and tighten the request if payments feel heavy."
        + echo
    )


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


def _create_payment_schedule(user_id: str, total_amount: float) -> None:
    if total_amount <= 0:
        database.execute(
            "DELETE FROM payment_schedules WHERE user_id = ?",
            (user_id,),
        )
        return

    database.execute(
        "DELETE FROM payment_schedules WHERE user_id = ?",
        (user_id,),
    )

    base_payment = total_amount / 12
    remaining = total_amount
    first_due = datetime.utcnow() + timedelta(weeks=4)

    for index in range(12):
        if index == 11:
            payment_amount = round(remaining, 2)
        else:
            payment_amount = round(min(base_payment, remaining), 2)
        if payment_amount <= 0:
            break
        due_date = (first_due + timedelta(weeks=4 * index)).replace(microsecond=0)
        database.execute(
            """
            INSERT INTO payment_schedules (user_id, due_date, amount, status)
            VALUES (?, ?, ?, 'pending')
            """,
            (user_id, due_date.isoformat(), payment_amount),
        )
        remaining = round(max(0.0, remaining - payment_amount), 2)
        if remaining <= 0:
            break


def _get_next_scheduled_payment(user_id: str) -> Optional[Dict[str, Any]]:
    row = database.fetchone(
        """
        SELECT due_date, amount
        FROM payment_schedules
        WHERE user_id = ? AND status = 'pending'
        ORDER BY due_date ASC
        LIMIT 1
        """,
        (user_id,),
    )
    if not row:
        return None
    due_date_raw = row["due_date"]
    try:
        due_date = datetime.fromisoformat(due_date_raw)
    except (TypeError, ValueError):
        return None
    return {"due_date": due_date, "amount": float(row["amount"])}


def _weeks_until_due(due_date: datetime) -> int:
    delta = due_date - datetime.utcnow()
    weeks = delta.total_seconds() / (7 * 24 * 60 * 60)
    if weeks <= 0:
        return 0
    return max(0, math.ceil(weeks))


def _risk_logic(user_id: str) -> Dict:
    user = _require_user(user_id)
    amount = _get_borrow_amount(user_id) or 0.0
    ceiling = user.get("max_amount", 1500)
    ratio = amount / ceiling if ceiling else 1
    ratio = min(max(ratio, 0), 1.2)
    base_score = max(5, 95 - ratio * 60)

    knot_profile = _get_knot_profile(user_id)
    knot_summary = _compute_knot_summary(knot_profile)
    adjustment = 0
    if knot_summary:
        ess_ratio = knot_summary.get("essentials_ratio")
        avg_spend = knot_summary.get("avg_monthly_spend") or 0
        if ess_ratio is not None:
            if ess_ratio >= 0.65:
                adjustment += 5
            elif ess_ratio < 0.45:
                adjustment -= 5
        if avg_spend <= 600:
            adjustment += 3
        elif avg_spend > 900:
            adjustment -= 3

    score = max(5, min(95, round(base_score + adjustment)))
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
    if knot_summary:
        explanation += (
            f" Linked merchants ({', '.join(knot_summary['merchants'])}) show ${knot_summary['avg_monthly_spend']}"
        )
        if knot_summary.get("essentials_ratio") is not None:
            explanation += (
                f" monthly spend with {int(knot_summary['essentials_ratio'] * 100)}% essentials."
            )
        else:
            explanation += " monthly spend with essentials share under review."

    result = {
        "score": score,
        "label": label,
        "explanation": explanation,
        "recommendation": recommendation,
        "analysis_source": "rules",
    }
    if knot_summary:
        result["knot_summary"] = knot_summary

    grok_result = _call_grok_risk_analysis(
        user_id,
        amount,
        knot_summary,
        knot_profile["transactions"] if knot_profile else [],
    )
    if grok_result:
        grok_score = grok_result.get("score")
        try:
            grok_score = max(5, min(95, int(round(float(grok_score)))))
        except (TypeError, ValueError):
            grok_score = result["score"]
        result["analysis_source"] = "grok"
        result["score"] = grok_score
        result["label"] = "low" if grok_score >= 70 else "med" if grok_score >= 45 else "high"
        grok_rec = (grok_result.get("recommendation") or "").lower()
        if grok_rec in {"yes", "maybe", "no"}:
            result["recommendation"] = grok_rec
        if grok_result.get("explanation"):
            result["explanation"] = grok_result["explanation"]
        if grok_result.get("model"):
            result["analysis_model"] = grok_result["model"]
        ratio_val = grok_result.get("essentials_ratio")
        if ratio_val is not None:
            try:
                ratio_float = float(ratio_val)
                if ratio_float > 1:
                    ratio_float = ratio_float / 100.0
                ratio_float = max(0.0, min(1.0, ratio_float))
                if knot_summary:
                    knot_summary["essentials_ratio"] = ratio_float
                    result["knot_summary"] = knot_summary
            except (TypeError, ValueError):
                pass

    return result


# --- Knot mock linking ---
@app.post("/knot/link")
def link_knot_account(payload: KnotLinkRequest):
    _require_user(payload.user_id)
    merchant_meta = KNOT_MERCHANTS.get(payload.merchant_id)
    if not merchant_meta:
        raise HTTPException(status_code=400, detail="Unsupported merchant.")

    transactions_new = _orders_to_transactions(payload.merchant_id)
    total = sum(t["amount"] for t in transactions_new)
    merchant_summary = {
        "merchant_id": payload.merchant_id,
        "merchant_name": merchant_meta["merchant_name"],
        "avg_monthly_spend": round(total / 3, 2) if total else 0,
        "orders": len(transactions_new),
        "essentials_ratio": None,
        "last_sync": datetime.utcnow().isoformat(),
    }

    profile = _get_knot_profile(payload.user_id) or {"merchants": [], "transactions": []}
    merchants = [m for m in profile["merchants"] if m.get("merchant_id") != payload.merchant_id]
    merchants.append(merchant_summary)
    transactions = [
        txn for txn in profile.get("transactions", []) if txn.get("merchant_id") != payload.merchant_id
    ]
    transactions.extend(transactions_new)
    saved = _save_knot_profile(payload.user_id, merchants, transactions)

    return {
        "linked": True,
        "merchant": merchant_summary,
        "sample_transactions": transactions_new[:5],
        "profile": saved,
    }


@app.get("/knot/profile")
def get_knot_profile(user_id: str):
    _require_user(user_id)
    profile = _get_knot_profile(user_id)
    if not profile:
        return {"merchants": [], "transactions": [], "updated_at": None}
    return profile


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
    _create_payment_schedule(payload.user_id, amount)
    advice = "Great fit—community lenders ready." if risk["recommendation"] == "yes" else "Matched with cautious lenders."
    tweet_id, tweet_error = _share_loan_on_x(payload.user_id, amount, lender_parts)
    return {
        "match_id": match_id,
        "total_amount": amount,
        "lenders": lender_parts,
        "risk_score": risk["score"],
        "ai_advice": advice,
        "x_post_id": tweet_id,
        "x_post_error": tweet_error,
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


@app.get("/x/feed")
def x_feed(handle: str = "raymo8980", limit: int = 10):
    tweets = _get_x_tweets(handle, limit)
    return {"handle": handle, "tweets": tweets}


# --- Dashboards ---
@app.get("/dashboard/borrower")
def borrower_dashboard(user_id: str):
    _require_user(user_id)
    borrow_amount = _get_borrow_amount(user_id)
    schedule = None
    if borrow_amount is not None:
        schedule = _get_next_scheduled_payment(user_id)
        if schedule is None:
            _create_payment_schedule(user_id, borrow_amount)
            schedule = _get_next_scheduled_payment(user_id)
    amount = borrow_amount if borrow_amount is not None else 200.0
    if schedule:
        next_payment_amount = round(schedule["amount"], 2)
        due_in_weeks = _weeks_until_due(schedule["due_date"])
    else:
        next_payment_amount = round(min(amount / 10, 50), 2)
        due_in_weeks = 1
    return {
        "next_payment": {"amount": next_payment_amount, "due_in_weeks": due_in_weeks},
        "total_owed_year": round(amount, 2),
        "savings_vs_bank_year": round((BANK_AVG_RATE / 100) * amount, 2),
    }


@app.get("/dashboard/lender")
def lender_dashboard(user_id: str):
    user = _require_user(user_id)
    capital = user.get("max_amount", 1500)
    schedule = _get_next_scheduled_payment(user_id)
    due_in_weeks = _weeks_until_due(schedule["due_date"]) if schedule else 1
    return {
        "next_payment": {"amount": round(capital * 0.01, 2), "due_in_weeks": due_in_weeks},
        "expected_revenue_year": round(capital * 0.12, 2),
    }


@app.post("/finance-bot", response_model=FinanceBotResponse)
async def finance_bot(payload: FinanceBotRequest):
    logger.info("Finance Bot request received: prompt length=%s, history=%s", len(payload.prompt or ""), len(payload.history))
    prompt = payload.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=422, detail="Prompt is required.")

    trimmed_history = payload.history[-FINANCE_BOT_HISTORY_LIMIT :]
    if not GEMINI_API_KEY:
        logger.warning("Finance Bot missing GEMINI_API_KEY, falling back.")
        return {"reply": _fallback_finance_reply(prompt, trimmed_history)}

    contents: List[Dict[str, object]] = []
    for entry in trimmed_history:
        text = entry.text.strip()
        if not text:
            continue
        role = "model" if entry.sender == "bot" else "user"
        contents.append({"role": role, "parts": [{"text": text}]})
    contents.append({"role": "user", "parts": [{"text": prompt}]})

    body = {
        "contents": contents,
        "system_instruction": {"parts": [{"text": FINANCE_BOT_PROMPT}]},
        "generationConfig": {"temperature": 0.3},
    }

    endpoint = f"{FINANCE_BOT_URL}/{FINANCE_BOT_MODEL}:generateContent"

    logger.info("Finance Bot calling Gemini model=%s endpoint=%s", FINANCE_BOT_MODEL, endpoint)

    try:
        logger.debug("Finance Bot payload preview: %s", json.dumps(body).encode("utf-8")[:400])
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                endpoint,
                params={"key": GEMINI_API_KEY},
                headers={"Content-Type": "application/json"},
                json=body,
            )
    except httpx.RequestError as exc:  # pragma: no cover - network defensive
        logger.warning("Finance Bot Gemini request error: %s", exc)
        return {"reply": _fallback_finance_reply(prompt, trimmed_history)}

    if response.status_code >= 400:
        logger.warning("Finance Bot Gemini non-200 status: %s body=%s", response.status_code, response.text)
        try:
            error_detail = response.json().get("error", {}).get("message")
        except Exception:  # pragma: no cover - defensive
            error_detail = None
        logger.warning("Finance Bot Gemini error %s: %s", response.status_code, error_detail)
        return {"reply": _fallback_finance_reply(prompt, trimmed_history)}

    try:
        payload_json = response.json()
        logger.debug("Finance Bot Gemini raw response: %s", json.dumps(payload_json)[:600])
    except json.JSONDecodeError as exc:  # pragma: no cover - defensive
        logger.warning("Finance Bot Gemini payload decode error: %s", exc)
        return {"reply": _fallback_finance_reply(prompt, trimmed_history)}

    reply = ""
    for candidate in payload_json.get("candidates", []):
        parts = candidate.get("content", {}).get("parts", [])
        texts = [part.get("text", "").strip() for part in parts if part.get("text")]
        if texts:
            reply = " ".join(texts).strip()
            break

    if not reply:
        logger.warning("Finance Bot Gemini returned empty reply, using fallback.")
        reply = _fallback_finance_reply(prompt, trimmed_history)
    else:
        logger.info("Finance Bot Gemini success, reply length=%s", len(reply))
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
