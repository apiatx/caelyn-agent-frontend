"""
PostgreSQL storage backend for prompt history and chat history.
Uses the DATABASE_URL environment variable set by Replit's PostgreSQL add-on.
Auto-creates tables on first use. Survives all deploys and autoscale events.
"""

import json
import os
import time

_DATABASE_URL = os.environ.get("DATABASE_URL") or os.environ.get("REPLIT_DB_URL_POSTGRES")
_pool = None
_available = False


def _get_conn():
    """Get a connection from the pool (lazy-initialized)."""
    global _pool, _available
    if _pool is None:
        if not _DATABASE_URL:
            return None
        try:
            import psycopg2
            from psycopg2 import pool as _pg_pool
            _pool = _pg_pool.SimpleConnectionPool(1, 5, _DATABASE_URL)
            _available = True
        except Exception as e:
            print(f"[PG_STORAGE] Failed to create connection pool: {e}")
            _available = False
            return None
    try:
        return _pool.getconn()
    except Exception as e:
        print(f"[PG_STORAGE] Failed to get connection: {e}")
        return None


def _put_conn(conn):
    """Return a connection to the pool."""
    if _pool and conn:
        try:
            _pool.putconn(conn)
        except Exception:
            pass


def is_available() -> bool:
    """Check if PostgreSQL is available."""
    if not _DATABASE_URL:
        return False
    conn = _get_conn()
    if conn is None:
        return False
    _put_conn(conn)
    return True


def init_tables():
    """Create tables if they don't exist. Safe to call multiple times."""
    conn = _get_conn()
    if conn is None:
        return False
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS prompt_history (
                user_id TEXT NOT NULL,
                bucket_key TEXT NOT NULL,
                data JSONB NOT NULL DEFAULT '{}',
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                PRIMARY KEY (user_id, bucket_key)
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS chat_conversations (
                conv_id TEXT PRIMARY KEY,
                data JSONB NOT NULL DEFAULT '{}',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_chat_conversations_updated
            ON chat_conversations (updated_at DESC)
        """)
        conn.commit()
        cur.close()
        print("[PG_STORAGE] Tables initialized successfully")
        return True
    except Exception as e:
        print(f"[PG_STORAGE] Table creation error: {e}")
        conn.rollback()
        return False
    finally:
        _put_conn(conn)


# ── Prompt History ───────────────────────────────────────────

def ph_read(user_id: str) -> dict:
    """Read all prompt history for a user."""
    conn = _get_conn()
    if conn is None:
        return {}
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT bucket_key, data FROM prompt_history WHERE user_id = %s",
            (user_id,),
        )
        result = {}
        for row in cur.fetchall():
            bucket_key, data = row
            if isinstance(data, str):
                data = json.loads(data)
            result[bucket_key] = data
        cur.close()
        return result
    except Exception as e:
        print(f"[PG_STORAGE] ph_read error for {user_id}: {e}")
        return {}
    finally:
        _put_conn(conn)


def ph_write(user_id: str, data: dict):
    """Write all prompt history for a user (full replace by bucket)."""
    conn = _get_conn()
    if conn is None:
        return
    try:
        cur = conn.cursor()
        for bucket_key, bucket_data in data.items():
            json_data = json.dumps(bucket_data, default=str)
            cur.execute("""
                INSERT INTO prompt_history (user_id, bucket_key, data, updated_at)
                VALUES (%s, %s, %s::jsonb, NOW())
                ON CONFLICT (user_id, bucket_key)
                DO UPDATE SET data = %s::jsonb, updated_at = NOW()
            """, (user_id, bucket_key, json_data, json_data))
        # Remove buckets that are no longer in data
        if data:
            cur.execute(
                "DELETE FROM prompt_history WHERE user_id = %s AND bucket_key != ALL(%s)",
                (user_id, list(data.keys())),
            )
        else:
            cur.execute(
                "DELETE FROM prompt_history WHERE user_id = %s",
                (user_id,),
            )
        conn.commit()
        cur.close()
    except Exception as e:
        print(f"[PG_STORAGE] ph_write error for {user_id}: {e}")
        conn.rollback()
    finally:
        _put_conn(conn)


def ph_write_bucket(user_id: str, bucket_key: str, bucket_data: dict):
    """Write a single bucket (more efficient for single-intent updates)."""
    conn = _get_conn()
    if conn is None:
        return
    try:
        cur = conn.cursor()
        json_data = json.dumps(bucket_data, default=str)
        cur.execute("""
            INSERT INTO prompt_history (user_id, bucket_key, data, updated_at)
            VALUES (%s, %s, %s::jsonb, NOW())
            ON CONFLICT (user_id, bucket_key)
            DO UPDATE SET data = %s::jsonb, updated_at = NOW()
        """, (user_id, bucket_key, json_data, json_data))
        conn.commit()
        cur.close()
    except Exception as e:
        print(f"[PG_STORAGE] ph_write_bucket error: {e}")
        conn.rollback()
    finally:
        _put_conn(conn)


# ── Chat History ─────────────────────────────────────────────

def chat_read(conv_id: str) -> dict | None:
    """Read a single conversation."""
    conn = _get_conn()
    if conn is None:
        return None
    try:
        cur = conn.cursor()
        cur.execute("SELECT data FROM chat_conversations WHERE conv_id = %s", (conv_id,))
        row = cur.fetchone()
        cur.close()
        if row is None:
            return None
        data = row[0]
        if isinstance(data, str):
            data = json.loads(data)
        return data
    except Exception as e:
        print(f"[PG_STORAGE] chat_read error for {conv_id}: {e}")
        return None
    finally:
        _put_conn(conn)


def chat_write(conv_id: str, data: dict):
    """Write/update a conversation."""
    conn = _get_conn()
    if conn is None:
        return
    try:
        cur = conn.cursor()
        json_data = json.dumps(data, default=str)
        cur.execute("""
            INSERT INTO chat_conversations (conv_id, data, created_at, updated_at)
            VALUES (%s, %s::jsonb, NOW(), NOW())
            ON CONFLICT (conv_id)
            DO UPDATE SET data = %s::jsonb, updated_at = NOW()
        """, (conv_id, json_data, json_data))
        conn.commit()
        cur.close()
    except Exception as e:
        print(f"[PG_STORAGE] chat_write error for {conv_id}: {e}")
        conn.rollback()
    finally:
        _put_conn(conn)


def chat_delete(conv_id: str) -> bool:
    """Delete a conversation."""
    conn = _get_conn()
    if conn is None:
        return False
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM chat_conversations WHERE conv_id = %s", (conv_id,))
        deleted = cur.rowcount > 0
        conn.commit()
        cur.close()
        return deleted
    except Exception as e:
        print(f"[PG_STORAGE] chat_delete error for {conv_id}: {e}")
        conn.rollback()
        return False
    finally:
        _put_conn(conn)


def chat_list() -> list:
    """List all conversations (summary only), sorted by updated_at desc."""
    conn = _get_conn()
    if conn is None:
        return []
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT conv_id, data FROM chat_conversations
            ORDER BY updated_at DESC
        """)
        results = []
        for row in cur.fetchall():
            conv_id, data = row
            if isinstance(data, str):
                data = json.loads(data)
            results.append({
                "id": data.get("id", conv_id),
                "title": data.get("title", ""),
                "created_at": data.get("created_at", ""),
                "updated_at": data.get("updated_at", ""),
                "message_count": len(data.get("messages", [])),
            })
        cur.close()
        return results
    except Exception as e:
        print(f"[PG_STORAGE] chat_list error: {e}")
        return []
    finally:
        _put_conn(conn)


def storage_info() -> dict:
    """Return diagnostic info about PostgreSQL storage."""
    conn = _get_conn()
    if conn is None:
        return {"available": False, "reason": "No DATABASE_URL or connection failed"}
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM prompt_history")
        ph_count = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM chat_conversations")
        chat_count = cur.fetchone()[0]
        cur.close()
        return {
            "available": True,
            "prompt_history_rows": ph_count,
            "chat_conversations": chat_count,
        }
    except Exception as e:
        return {"available": False, "reason": str(e)}
    finally:
        _put_conn(conn)
