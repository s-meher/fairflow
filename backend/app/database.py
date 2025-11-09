import os
import sqlite3
from contextlib import closing
from pathlib import Path
from typing import Iterable, Optional

DB_FILENAME = os.getenv("DATABASE_FILENAME", "lendlocal.db")
DEFAULT_PATH = Path(__file__).resolve().parent / DB_FILENAME
DB_PATH = Path(os.getenv("DATABASE_URL", DEFAULT_PATH))


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with closing(_connect()) as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                role TEXT NOT NULL,
                is_borrower INTEGER NOT NULL,
                is_verified INTEGER NOT NULL DEFAULT 0,
                lat REAL NOT NULL,
                lng REAL NOT NULL,
                min_rate REAL NOT NULL,
                max_amount REAL NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS borrow_reasons (
                user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                reason TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS borrow_amounts (
                user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                amount REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS matches (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                total_amount REAL NOT NULL,
                lenders_json TEXT NOT NULL,
                risk_score INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS posts (
                id TEXT PRIMARY KEY,
                user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
                text TEXT NOT NULL,
                ts TEXT NOT NULL,
                user_role TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS id_verifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                filename TEXT NOT NULL,
                content_type TEXT NOT NULL,
                size_bytes INTEGER NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                reviewed_at TEXT
            );
            CREATE TABLE IF NOT EXISTS knot_profiles (
                user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                merchants_json TEXT NOT NULL,
                transactions_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            """
        )
        _ensure_user_columns(conn)
        conn.commit()


def _ensure_user_columns(conn: sqlite3.Connection) -> None:
    """Ensure newer user fields exist without requiring manual migrations."""
    cursor = conn.execute("PRAGMA table_info(users)")
    existing = {row["name"] for row in cursor.fetchall()}
    if "community_id" not in existing:
        conn.execute("ALTER TABLE users ADD COLUMN community_id TEXT")
    if "location_locked" not in existing:
        conn.execute(
            "ALTER TABLE users ADD COLUMN location_locked INTEGER NOT NULL DEFAULT 0"
        )
    if "is_borrower" not in existing:
        conn.execute(
            "ALTER TABLE users ADD COLUMN is_borrower INTEGER NOT NULL DEFAULT 0"
        )
        conn.execute(
            "UPDATE users SET is_borrower = CASE WHEN role = 'borrower' THEN 1 ELSE 0 END"
        )
    if "is_verified" not in existing:
        conn.execute(
            "ALTER TABLE users ADD COLUMN is_verified INTEGER NOT NULL DEFAULT 0"
        )
        conn.execute(
            """
            UPDATE users
            SET is_verified = 1
            WHERE id IN (
                SELECT user_id FROM id_verifications WHERE status = 'verified'
            )
            """
        )


def execute(query: str, params: Iterable = ()) -> None:
    with closing(_connect()) as conn:
        conn.execute(query, tuple(params))
        conn.commit()


def fetchone(query: str, params: Iterable = ()) -> Optional[sqlite3.Row]:
    with closing(_connect()) as conn:
        cursor = conn.execute(query, tuple(params))
        return cursor.fetchone()


def fetchall(query: str, params: Iterable = ()):
    with closing(_connect()) as conn:
        cursor = conn.execute(query, tuple(params))
        return cursor.fetchall()
