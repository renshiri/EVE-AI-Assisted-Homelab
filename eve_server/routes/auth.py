import time
import secrets
from typing import Optional
from fastapi import APIRouter, HTTPException, Header, Query
from pydantic import BaseModel
import pamela

from eve_db import get_db_connection

router = APIRouter(prefix="/api/auth", tags=["Auth"])


class PAMLoginRequest(BaseModel):
    username: str
    password: str


def create_session_token(username: str, role: str = "admin") -> str:
    """Erstellt ein kryptografisch sicheres Session-Token und speichert es in SQLite."""
    token = secrets.token_urlsafe(32)
    now = time.time()
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO user_sessions (token, username, role, created_at, last_seen)
            VALUES (?, ?, ?, ?, ?)
        """,
            (token, username, role, now, now),
        )
        conn.commit()
        return token
    finally:
        conn.close()


def verify_session_token(token: Optional[str]) -> Optional[dict]:
    """Prüft, ob ein Session-Token existiert und aktualisiert den last_seen Timestamp."""
    if not token or not token.strip():
        return None

    clean_token = token.strip()
    if clean_token.startswith("Bearer "):
        clean_token = clean_token[7:].strip()

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        row = cursor.execute(
            "SELECT token, username, role, created_at, last_seen FROM user_sessions WHERE token = ?",
            (clean_token,),
        ).fetchone()

        if not row:
            return None

        # Aktualisiere last_seen
        cursor.execute(
            "UPDATE user_sessions SET last_seen = ? WHERE token = ?",
            (time.time(), clean_token),
        )
        conn.commit()

        return {
            "token": row["token"],
            "username": row["username"],
            "role": row["role"],
        }
    finally:
        conn.close()


def delete_session_token(token: Optional[str]) -> bool:
    """Löscht eine Sitzung aus der Datenbank (Logout)."""
    if not token:
        return False

    clean_token = token.strip()
    if clean_token.startswith("Bearer "):
        clean_token = clean_token[7:].strip()

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM user_sessions WHERE token = ?", (clean_token,))
        deleted = cursor.rowcount > 0
        conn.commit()
        return deleted
    finally:
        conn.close()


def get_current_user(
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Query(None),
) -> dict:
    """FastAPI Dependency zur Absicherung sensibler Endpunkte."""
    auth_token = authorization or token
    user = verify_session_token(auth_token)
    if not user:
        raise HTTPException(status_code=401, detail="Ungültiges oder abgelaufenes Token.")
    return user


@router.post("/login")
async def handle_pam_login(req: PAMLoginRequest):
    try:
        pamela.authenticate(req.username, req.password, service="login")
        token = create_session_token(req.username, role="admin")
        return {
            "status": "authorized",
            "token": token,
            "username": req.username,
            "role": "admin",
            "permissions": ["read", "write", "admin"],
        }
    except pamela.PAMError:
        raise HTTPException(status_code=401, detail="Zugriff verweigert.")


@router.get("/verify")
async def verify_token_endpoint(
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Query(None),
):
    """Überprüft ein Token beim App-Start / Resume auf Gültigkeit."""
    auth_token = authorization or token
    user = verify_session_token(auth_token)
    if not user:
        raise HTTPException(status_code=401, detail="Sitzung ungültig oder abgelaufen.")

    return {
        "status": "valid",
        "token": user["token"],
        "username": user["username"],
        "role": user["role"],
        "permissions": ["read", "write", "admin"],
    }


@router.post("/logout")
async def handle_logout(
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Query(None),
):
    """Löscht das Token aus der Datenbank."""
    auth_token = authorization or token
    delete_session_token(auth_token)
    return {"status": "logged_out"}