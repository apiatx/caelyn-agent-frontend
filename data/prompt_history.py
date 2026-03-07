"""
Persistent storage for prompt response history.
Stores responses grouped by category and prompt type (intent).
JSON file-based, per-user isolation via user_id parameter.
"""

import json
import time
from pathlib import Path
from threading import Lock

MAX_PER_INTENT = 100
_locks: dict = {}


def _get_lock(user_id: str) -> Lock:
    if user_id not in _locks:
        _locks[user_id] = Lock()
    return _locks[user_id]


def _history_file(user_id: str) -> Path:
    return Path(f"data/prompt_history_{user_id}.json")


def _ensure_file(user_id: str):
    path = _history_file(user_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        with open(path, "w") as f:
            json.dump({}, f)


def _read(user_id: str) -> dict:
    _ensure_file(user_id)
    try:
        with open(_history_file(user_id), "r") as f:
            return json.load(f)
    except Exception:
        return {}


def _write(user_id: str, data: dict):
    _ensure_file(user_id)
    with open(_history_file(user_id), "w") as f:
        json.dump(data, f, separators=(",", ":"))


def save_response(category: str, intent: str, content: str, display_type: str | None = None, user_id: str = "default") -> dict:
    """Save a prompt response. Returns the created entry."""
    entry = {
        "id": str(int(time.time() * 1000)),
        "timestamp": time.time(),
        "content": content,
        "display_type": display_type,
    }
    with _get_lock(user_id):
        data = _read(user_id)
        key = f"{category}::{intent}"
        if key not in data:
            data[key] = {"category": category, "intent": intent, "entries": []}
        entries = data[key]["entries"]
        entries.insert(0, entry)
        if len(entries) > MAX_PER_INTENT:
            data[key]["entries"] = entries[:MAX_PER_INTENT]
        _write(user_id, data)
    return entry


def get_all(user_id: str = "default") -> dict:
    """Return all history grouped by category::intent."""
    return _read(user_id)


def get_by_intent(category: str, intent: str, user_id: str = "default") -> list:
    """Return entries for a specific intent."""
    data = _read(user_id)
    key = f"{category}::{intent}"
    bucket = data.get(key, {})
    return bucket.get("entries", [])


def delete_entry(category: str, intent: str, entry_id: str, user_id: str = "default") -> bool:
    """Delete a single history entry."""
    with _get_lock(user_id):
        data = _read(user_id)
        key = f"{category}::{intent}"
        if key not in data:
            return False
        before = len(data[key]["entries"])
        data[key]["entries"] = [e for e in data[key]["entries"] if e["id"] != entry_id]
        if len(data[key]["entries"]) == before:
            return False
        _write(user_id, data)
    return True


def clear_intent(category: str, intent: str, user_id: str = "default") -> bool:
    """Clear all entries for an intent."""
    with _get_lock(user_id):
        data = _read(user_id)
        key = f"{category}::{intent}"
        if key not in data:
            return False
        data[key]["entries"] = []
        _write(user_id, data)
    return True


def migrate_legacy_history(user_id: str):
    """
    Migrate the legacy prompt_history.json (no user_id) to the user-scoped file.
    Called once on first login. Safe to call multiple times (idempotent).
    """
    legacy_file = Path("data/prompt_history.json")
    target_file = _history_file(user_id)
    if legacy_file.exists() and not target_file.exists():
        try:
            import shutil
            shutil.copy2(legacy_file, target_file)
            print(f"[AUTH] Migrated prompt_history.json -> {target_file}")
        except Exception as e:
            print(f"[AUTH] Failed to migrate prompt history: {e}")
