"""
scripts/create_admin.py
-----------------------
Bootstrap the first admin account by inserting it directly into the database.

Usage (run from the project root, once during deploy or locally):

    python -m scripts.create_admin

Required env vars (set in .env or the shell environment):
    ADMIN_USERNAME  – the admin's login username
    ADMIN_PASSWORD  – the admin's plaintext password (hashed before storage)

The script is idempotent: if the admin user already exists it will update
the password hash and exit cleanly.  No HTTP layer involved.
"""

import sys
import os

# ---------------------------------------------------------------------------
# Make sure the project root is on sys.path so app.* imports work whether
# you run this as  `python scripts/create_admin.py`  or
#                  `python -m scripts.create_admin`
# ---------------------------------------------------------------------------
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal, init_db
from app.db.models import User
from sqlalchemy import func


def main() -> None:
    # ── 1. Validate env vars ────────────────────────────────────────────────
    username = (settings.ADMIN_USERNAME or "").strip().lower()
    password = (settings.ADMIN_PASSWORD or "").strip()

    if not username:
        print(
            "[ERROR] ADMIN_USERNAME is not set.\n"
            "        Add it to .env or export it before running this script."
        )
        sys.exit(1)

    if not password:
        print(
            "[ERROR] ADMIN_PASSWORD is not set.\n"
            "        Add it to .env or export it before running this script."
        )
        sys.exit(1)

    if len(password) < 8:
        print(
            "[ERROR] ADMIN_PASSWORD must be at least 8 characters long."
        )
        sys.exit(1)

    # ── 2. Ensure DB tables exist ───────────────────────────────────────────
    print("[INFO] Initialising database schema …")
    try:
        init_db()
    except Exception as exc:
        print(f"[ERROR] Could not initialise DB: {exc}")
        sys.exit(1)

    # ── 3. Upsert the admin user ────────────────────────────────────────────
    db = SessionLocal()
    try:
        existing: User | None = (
            db.query(User)
            .filter(func.lower(User.username) == username)
            .first()
        )

        password_hash = hash_password(password)

        if existing:
            existing.password_hash = password_hash
            db.commit()
            print(f"[OK] Admin user '{username}' already exists — password hash updated.")
        else:
            admin = User(username=username, password_hash=password_hash)
            db.add(admin)
            db.commit()
            db.refresh(admin)
            print(f"[OK] Admin user '{username}' created (id={admin.id}).")

        # ── 4. Remind dev to keep ADMIN_USERNAMES in sync ──────────────────
        registered_admins = [
            a.strip().lower()
            for a in settings.ADMIN_USERNAMES.split(",")
            if a.strip()
        ]
        if username not in registered_admins:
            print(
                f"\n[WARN] '{username}' is not listed in ADMIN_USERNAMES.\n"
                f"       Add it to your .env:\n\n"
                f"           ADMIN_USERNAMES={settings.ADMIN_USERNAMES},{username}\n\n"
                "       Without this the login API will return role='user' instead of 'admin'."
            )

    except Exception as exc:
        db.rollback()
        print(f"[ERROR] Database operation failed: {exc}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
