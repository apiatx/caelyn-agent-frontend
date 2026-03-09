"""
Persistent chat conversation storage.
Primary: Replit Object Storage (persists across deploys AND autoscale).
Secondary: Replit DB (dev environment only).
Fallback: JSON files (for local dev outside Replit).
"""

import json
import os
import re
import uuid
from datetime import datetime
from pathlib import Path

HISTORY_DIR = Path("data/chat_history_store")
_VALID_ID_PATTERN = re.compile(r'^[a-f0-9]{8}-[a-f0-9]{3}$')

# ── Storage backend detection ────────────────────────────────
# Priority: Object Storage > Replit DB > JSON files
_use_object_storage = False
_obj_client = None
_use_replit_db = False
_replit_db = None

try:
    from replit.object_storage import Client as _ObjClient
    _obj_client = _ObjClient()
    _use_object_storage = True
    print("[CHAT_HISTORY] Using Replit Object Storage (persistent across deploys)")
except Exception as e:
    print(f"[CHAT_HISTORY] Object Storage unavailable ({e}), trying Replit DB...")
    try:
        if os.environ.get("REPLIT_DB_URL"):
            from replit import db as _replit_db
            _use_replit_db = True
            print("[CHAT_HISTORY] Using Replit DB for chat history (dev only)")
    except Exception as e2:
        print(f"[CHAT_HISTORY] Replit DB unavailable ({e2}), falling back to JSON files")


def _validate_id(conv_id: str) -> bool:
    if not conv_id or not _VALID_ID_PATTERN.match(conv_id):
        return False
    return True


# ── Object Storage helpers ───────────────────────────────────

_OBJ_CONV_PREFIX = "chat/conv/"
_OBJ_INDEX_KEY = "chat/index.json"


def _obj_read_conv(conv_id: str) -> dict | None:
    try:
        raw = _obj_client.download_as_text(f"{_OBJ_CONV_PREFIX}{conv_id}.json")
        if not raw:
            return None
        return json.loads(raw)
    except Exception:
        return None


def _obj_write_conv(conv_id: str, data: dict):
    try:
        _obj_client.upload_from_text(
            f"{_OBJ_CONV_PREFIX}{conv_id}.json",
            json.dumps(data, default=str),
        )
    except Exception as e:
        print(f"[CHAT_HISTORY] Object Storage write error for {conv_id}: {e}")


def _obj_delete_conv(conv_id: str):
    try:
        _obj_client.delete(f"{_OBJ_CONV_PREFIX}{conv_id}.json")
    except Exception as e:
        print(f"[CHAT_HISTORY] Object Storage delete error for {conv_id}: {e}")


def _obj_read_index() -> list:
    try:
        raw = _obj_client.download_as_text(_OBJ_INDEX_KEY)
        if not raw:
            return []
        return json.loads(raw)
    except Exception:
        return []


def _obj_write_index(index: list):
    try:
        _obj_client.upload_from_text(_OBJ_INDEX_KEY, json.dumps(index, default=str))
    except Exception as e:
        print(f"[CHAT_HISTORY] Object Storage index write error: {e}")


def _obj_update_index(conv: dict):
    index = _obj_read_index()
    entry = {
        "id": conv["id"],
        "title": conv.get("title", ""),
        "created_at": conv.get("created_at", ""),
        "updated_at": conv.get("updated_at", ""),
        "message_count": len(conv.get("messages", [])),
    }
    index = [e for e in index if e.get("id") != conv["id"]]
    index.insert(0, entry)
    _obj_write_index(index)


def _obj_remove_from_index(conv_id: str):
    index = _obj_read_index()
    index = [e for e in index if e.get("id") != conv_id]
    _obj_write_index(index)


# ── Replit DB helpers (fallback for dev) ─────────────────────

def _db_conv_key(conv_id: str) -> str:
    return f"chat:{conv_id}"

DB_INDEX_KEY = "chat:__index__"


def _db_read_conv(conv_id: str) -> dict | None:
    try:
        raw = _replit_db.get(_db_conv_key(conv_id))
        if raw is None:
            return None
        if isinstance(raw, str):
            return json.loads(raw)
        return json.loads(json.dumps(raw, default=str))
    except Exception as e:
        print(f"[CHAT_HISTORY] DB read error for {conv_id}: {e}")
        return None


def _db_write_conv(conv_id: str, data: dict):
    try:
        _replit_db[_db_conv_key(conv_id)] = json.loads(json.dumps(data, default=str))
    except Exception as e:
        print(f"[CHAT_HISTORY] DB write error for {conv_id}: {e}")


def _db_delete_conv(conv_id: str):
    try:
        key = _db_conv_key(conv_id)
        if key in _replit_db:
            del _replit_db[key]
    except Exception as e:
        print(f"[CHAT_HISTORY] DB delete error for {conv_id}: {e}")


def _db_read_index() -> list:
    try:
        raw = _replit_db.get(DB_INDEX_KEY)
        if raw is None:
            return []
        if isinstance(raw, str):
            return json.loads(raw)
        return json.loads(json.dumps(raw, default=str))
    except Exception as e:
        print(f"[CHAT_HISTORY] DB index read error: {e}")
        return []


def _db_write_index(index: list):
    try:
        _replit_db[DB_INDEX_KEY] = json.loads(json.dumps(index, default=str))
    except Exception as e:
        print(f"[CHAT_HISTORY] DB index write error: {e}")


def _db_update_index(conv: dict):
    index = _db_read_index()
    entry = {
        "id": conv["id"],
        "title": conv.get("title", ""),
        "created_at": conv.get("created_at", ""),
        "updated_at": conv.get("updated_at", ""),
        "message_count": len(conv.get("messages", [])),
    }
    index = [e for e in index if e.get("id") != conv["id"]]
    index.insert(0, entry)
    _db_write_index(index)


def _db_remove_from_index(conv_id: str):
    index = _db_read_index()
    index = [e for e in index if e.get("id") != conv_id]
    _db_write_index(index)


# ── JSON file helpers (fallback) ─────────────────────────────

def _ensure_dir():
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)


# ── Public API ───────────────────────────────────────────────

def create_conversation(first_query: str) -> dict:
    conv_id = str(uuid.uuid4())[:12]
    now = datetime.now()

    title = first_query.strip()[:60]
    if len(first_query.strip()) > 60:
        title += "..."

    conversation = {
        "id": conv_id,
        "title": title,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "messages": [],
    }

    if _use_object_storage:
        _obj_write_conv(conv_id, conversation)
        _obj_update_index(conversation)
    elif _use_replit_db:
        _db_write_conv(conv_id, conversation)
        _db_update_index(conversation)
    else:
        _ensure_dir()
        filepath = HISTORY_DIR / f"{conv_id}.json"
        with open(filepath, "w") as f:
            json.dump(conversation, f)

    return conversation


def save_messages(conv_id: str, messages: list):
    if not _validate_id(conv_id):
        return False

    if _use_object_storage:
        conversation = _obj_read_conv(conv_id)
        if conversation is None:
            return False
        conversation["messages"] = messages
        conversation["updated_at"] = datetime.now().isoformat()
        if messages and messages[0].get("role") == "user":
            title = messages[0]["content"].strip()[:60]
            if len(messages[0]["content"].strip()) > 60:
                title += "..."
            conversation["title"] = title
        _obj_write_conv(conv_id, conversation)
        _obj_update_index(conversation)
        return True
    elif _use_replit_db:
        conversation = _db_read_conv(conv_id)
        if conversation is None:
            return False
        conversation["messages"] = messages
        conversation["updated_at"] = datetime.now().isoformat()
        if messages and messages[0].get("role") == "user":
            title = messages[0]["content"].strip()[:60]
            if len(messages[0]["content"].strip()) > 60:
                title += "..."
            conversation["title"] = title
        _db_write_conv(conv_id, conversation)
        _db_update_index(conversation)
        return True
    else:
        _ensure_dir()
        filepath = HISTORY_DIR / f"{conv_id}.json"
        if not filepath.exists():
            return False
        try:
            with open(filepath, "r") as f:
                conversation = json.load(f)
            conversation["messages"] = messages
            conversation["updated_at"] = datetime.now().isoformat()
            if messages and messages[0].get("role") == "user":
                title = messages[0]["content"].strip()[:60]
                if len(messages[0]["content"].strip()) > 60:
                    title += "..."
                conversation["title"] = title
            with open(filepath, "w") as f:
                json.dump(conversation, f)
            return True
        except Exception as e:
            print(f"[CHAT_HISTORY] Error saving: {e}")
            return False


def get_conversation(conv_id: str) -> dict:
    if not _validate_id(conv_id):
        return None

    if _use_object_storage:
        return _obj_read_conv(conv_id)
    elif _use_replit_db:
        return _db_read_conv(conv_id)
    else:
        _ensure_dir()
        filepath = HISTORY_DIR / f"{conv_id}.json"
        if not filepath.exists():
            return None
        try:
            with open(filepath, "r") as f:
                return json.load(f)
        except Exception:
            return None


def list_conversations() -> list:
    if _use_object_storage:
        index = _obj_read_index()
        index.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
        return index
    elif _use_replit_db:
        index = _db_read_index()
        index.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
        return index
    else:
        _ensure_dir()
        conversations = []
        for f in HISTORY_DIR.glob("*.json"):
            try:
                with open(f, "r") as fh:
                    conv = json.load(fh)
                conversations.append({
                    "id": conv["id"],
                    "title": conv["title"],
                    "created_at": conv["created_at"],
                    "updated_at": conv["updated_at"],
                    "message_count": len(conv.get("messages", [])),
                })
            except Exception:
                pass
        conversations.sort(key=lambda x: x["updated_at"], reverse=True)
        return conversations


def delete_conversation(conv_id: str) -> bool:
    if not _validate_id(conv_id):
        return False

    if _use_object_storage:
        existing = _obj_read_conv(conv_id)
        if existing is None:
            return False
        _obj_delete_conv(conv_id)
        _obj_remove_from_index(conv_id)
        return True
    elif _use_replit_db:
        existing = _db_read_conv(conv_id)
        if existing is None:
            return False
        _db_delete_conv(conv_id)
        _db_remove_from_index(conv_id)
        return True
    else:
        filepath = HISTORY_DIR / f"{conv_id}.json"
        if filepath.exists():
            filepath.unlink()
            return True
        return False


def migrate_file_history_to_db():
    """
    One-time migration: move existing conversations into the active backend.
    Migrates from JSON files and/or Replit DB into Object Storage.
    Safe to call multiple times (skips already-migrated conversations).
    """
    if not (_use_object_storage or _use_replit_db):
        return

    migrated = 0

    # Source 1: Replit DB -> Object Storage
    if _use_object_storage and os.environ.get("REPLIT_DB_URL"):
        try:
            from replit import db as _tmp_db
            # Migrate index
            raw_idx = _tmp_db.get("chat:__index__")
            if raw_idx:
                db_index = json.loads(raw_idx) if isinstance(raw_idx, str) else json.loads(json.dumps(raw_idx, default=str))
                for entry in db_index:
                    cid = entry.get("id")
                    if not cid:
                        continue
                    if _obj_read_conv(cid) is not None:
                        continue
                    raw_conv = _tmp_db.get(f"chat:{cid}")
                    if raw_conv:
                        conv = json.loads(raw_conv) if isinstance(raw_conv, str) else json.loads(json.dumps(raw_conv, default=str))
                        _obj_write_conv(cid, conv)
                        _obj_update_index(conv)
                        migrated += 1
        except Exception as e:
            print(f"[CHAT_HISTORY] Replit DB -> Object Storage migration error: {e}")

    # Source 2: JSON files -> active backend
    if HISTORY_DIR.exists():
        for f in HISTORY_DIR.glob("*.json"):
            try:
                with open(f, "r") as fh:
                    conv = json.load(fh)
                conv_id = conv.get("id")
                if not conv_id:
                    continue
                if _use_object_storage:
                    if _obj_read_conv(conv_id) is not None:
                        continue
                    _obj_write_conv(conv_id, conv)
                    _obj_update_index(conv)
                elif _use_replit_db:
                    if _db_read_conv(conv_id) is not None:
                        continue
                    _db_write_conv(conv_id, conv)
                    _db_update_index(conv)
                migrated += 1
            except Exception as e:
                print(f"[CHAT_HISTORY] Migration error for {f}: {e}")

    if migrated:
        print(f"[CHAT_HISTORY] Migrated {migrated} conversations -> active backend")
