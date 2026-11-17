"""Minimal SQLite-backed REST API for the Atlas address book.

No third-party dependencies: only Python's standard library is used, which keeps
the container small and the deployment reproducible.
"""
from __future__ import annotations

import json
import os
import sqlite3
import threading
from contextlib import closing
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlparse

DB_PATH = os.environ.get("DB_PATH", "/data/atlas.db")
PORT = int(os.environ.get("PORT", "8000"))
MAX_BODY = 8 * 1024 * 1024
SEED_PATH = os.path.join(os.path.dirname(__file__), "seed.json")
WRITE_LOCK = threading.Lock()

VALID_KINDS = {"phone", "email", "social", "address"}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def connect() -> sqlite3.Connection:
    directory = os.path.dirname(DB_PATH)
    if directory:
        os.makedirs(directory, exist_ok=True)
    connection = sqlite3.connect(DB_PATH, timeout=30)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA journal_mode=WAL")
    connection.execute("PRAGMA foreign_keys=ON")
    return connection


def normalize_contact(value: object) -> dict:
    if not isinstance(value, dict):
        raise ValueError("contact must be a JSON object")

    contact_id = str(value.get("id") or "").strip()
    name = str(value.get("name") or "").strip()
    if not contact_id:
        raise ValueError("contact.id is required")
    if not name:
        raise ValueError("contact.name is required")

    raw_methods = value.get("methods") or []
    if not isinstance(raw_methods, list):
        raise ValueError("contact.methods must be an array")

    methods = []
    for method in raw_methods:
        if not isinstance(method, dict):
            continue
        kind = str(method.get("kind") or "").strip()
        method_value = str(method.get("value") or "").strip()
        if kind not in VALID_KINDS or not method_value:
            continue
        methods.append(
            {
                "id": str(method.get("id") or f"method-{len(methods)}"),
                "kind": kind,
                "label": str(method.get("label") or "").strip() or "其他",
                "value": method_value,
            }
        )

    timestamp = now_iso()
    return {
        "id": contact_id,
        "name": name,
        "company": str(value.get("company") or "").strip(),
        "jobTitle": str(value.get("jobTitle") or "").strip(),
        "notes": str(value.get("notes") or "").strip(),
        "favorite": bool(value.get("favorite")),
        "methods": methods,
        "createdAt": str(value.get("createdAt") or timestamp),
        "updatedAt": str(value.get("updatedAt") or timestamp),
    }


def init_db() -> None:
    with closing(connect()) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS contacts (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                data TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS meta (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
            """
        )
        seeded = connection.execute(
            "SELECT value FROM meta WHERE key = 'seeded'"
        ).fetchone()
        if seeded is None:
            if os.path.exists(SEED_PATH):
                with open(SEED_PATH, encoding="utf-8") as handle:
                    seed = json.load(handle)
                if isinstance(seed, list):
                    for raw in seed:
                        try:
                            contact = normalize_contact(raw)
                        except ValueError:
                            continue
                        connection.execute(
                            "INSERT OR REPLACE INTO contacts (id, name, data, updated_at) VALUES (?, ?, ?, ?)",
                            (
                                contact["id"],
                                contact["name"],
                                json.dumps(contact, ensure_ascii=False),
                                contact["updatedAt"],
                            ),
                        )
            connection.execute(
                "INSERT OR REPLACE INTO meta (key, value) VALUES ('seeded', ?)",
                (now_iso(),),
            )
        connection.commit()


def list_contacts() -> list[dict]:
    with closing(connect()) as connection:
        rows = connection.execute("SELECT data FROM contacts").fetchall()
    contacts = []
    for row in rows:
        try:
            contacts.append(json.loads(row["data"]))
        except json.JSONDecodeError:
            continue
    contacts.sort(key=lambda item: (item.get("updatedAt", ""), item.get("name", "")), reverse=True)
    return contacts


def replace_contacts(raw_contacts: object) -> list[dict]:
    if not isinstance(raw_contacts, list):
        raise ValueError("contacts must be an array")
    if len(raw_contacts) > 5000:
        raise ValueError("too many contacts")
    contacts = [normalize_contact(item) for item in raw_contacts]
    with WRITE_LOCK, closing(connect()) as connection:
        connection.execute("BEGIN IMMEDIATE")
        connection.execute("DELETE FROM contacts")
        for contact in contacts:
            connection.execute(
                "INSERT INTO contacts (id, name, data, updated_at) VALUES (?, ?, ?, ?)",
                (
                    contact["id"],
                    contact["name"],
                    json.dumps(contact, ensure_ascii=False),
                    contact["updatedAt"],
                ),
            )
        connection.commit()
    return contacts


def upsert_contact(raw_contact: object) -> dict:
    contact = normalize_contact(raw_contact)
    with WRITE_LOCK, closing(connect()) as connection:
        connection.execute(
            "INSERT OR REPLACE INTO contacts (id, name, data, updated_at) VALUES (?, ?, ?, ?)",
            (
                contact["id"],
                contact["name"],
                json.dumps(contact, ensure_ascii=False),
                contact["updatedAt"],
            ),
        )
        connection.commit()
    return contact


def delete_contact(contact_id: str) -> bool:
    with WRITE_LOCK, closing(connect()) as connection:
        cursor = connection.execute("DELETE FROM contacts WHERE id = ?", (contact_id,))
        connection.commit()
        return cursor.rowcount > 0


def count_contacts() -> int:
    with closing(connect()) as connection:
        return int(connection.execute("SELECT COUNT(*) FROM contacts").fetchone()[0])


class Handler(BaseHTTPRequestHandler):
    server_version = "AtlasContacts/1.0"

    def log_message(self, fmt: str, *args: object) -> None:
        print(f"[api] {self.address_string()} {fmt % args}", flush=True)

    def send_json(self, status: int, payload: object) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def read_body(self) -> object:
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0:
            return {}
        if length > MAX_BODY:
            raise ValueError("request body too large")
        raw = self.rfile.read(length)
        try:
            return json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise ValueError("invalid JSON body") from error

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_HEAD(self) -> None:  # noqa: N802
        self.do_GET()

    def do_GET(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        try:
            if path == "/api/health":
                self.send_json(200, {"status": "ok", "contacts": count_contacts()})
                return
            if path == "/api/contacts":
                self.send_json(200, {"contacts": list_contacts()})
                return
            self.send_json(404, {"error": "not found"})
        except Exception as error:  # pragma: no cover - defensive boundary
            print(f"[api] GET error: {error}", flush=True)
            self.send_json(500, {"error": "internal server error"})

    def do_POST(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        try:
            if path == "/api/contacts":
                payload = self.read_body()
                raw = payload.get("contact") if isinstance(payload, dict) else None
                contact = upsert_contact(raw)
                self.send_json(201, {"contact": contact})
                return
            self.send_json(404, {"error": "not found"})
        except ValueError as error:
            self.send_json(400, {"error": str(error)})
        except Exception as error:  # pragma: no cover
            print(f"[api] POST error: {error}", flush=True)
            self.send_json(500, {"error": "internal server error"})

    def do_PUT(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        try:
            if path == "/api/contacts":
                payload = self.read_body()
                raw = payload.get("contacts") if isinstance(payload, dict) else None
                contacts = replace_contacts(raw)
                self.send_json(200, {"contacts": contacts})
                return
            if path.startswith("/api/contacts/"):
                contact_id = unquote(path[len("/api/contacts/") :])
                payload = self.read_body()
                if not isinstance(payload, dict):
                    raise ValueError("contact payload is required")
                if payload.get("id") != contact_id:
                    raise ValueError("contact id mismatch")
                contact = upsert_contact(payload)
                self.send_json(200, {"contact": contact})
                return
            self.send_json(404, {"error": "not found"})
        except ValueError as error:
            self.send_json(400, {"error": str(error)})
        except Exception as error:  # pragma: no cover
            print(f"[api] PUT error: {error}", flush=True)
            self.send_json(500, {"error": "internal server error"})

    def do_DELETE(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        try:
            if path.startswith("/api/contacts/"):
                contact_id = unquote(path[len("/api/contacts/") :])
                deleted = delete_contact(contact_id)
                if not deleted:
                    self.send_json(404, {"error": "contact not found"})
                    return
                self.send_response(204)
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                return
            self.send_json(404, {"error": "not found"})
        except Exception as error:  # pragma: no cover
            print(f"[api] DELETE error: {error}", flush=True)
            self.send_json(500, {"error": "internal server error"})


def main() -> None:
    init_db()
    print(f"[api] SQLite database: {DB_PATH}", flush=True)
    print(f"[api] starting on 0.0.0.0:{PORT}", flush=True)
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    server.serve_forever()


if __name__ == "__main__":
    main()
