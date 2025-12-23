import os
import datetime
import jwt
from typing import Tuple, Optional
from flask import request
from werkzeug.security import generate_password_hash, check_password_hash
from db import SessionLocal
from models import User, ClubMembership, Match


JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))


def hash_password(plain_password: str) -> str:
    return generate_password_hash(plain_password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return check_password_hash(password_hash, plain_password)


def _membership_payload(m: ClubMembership):
    return {
        "id": m.id,
        "club_id": m.club_id,
        "role": m.role,
        "can_edit": m.can_edit,
        "team_ids": [t.team_id for t in m.team_scopes],
        "match_ids": [mm.match_id for mm in m.match_scopes],
        "is_active": m.is_active,
    }


def create_access_token(user: User):
    now = datetime.datetime.utcnow()
    exp = now + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "global_role": user.global_role,
        "is_email_verified": user.is_email_verified,
        "exp": exp,
        "iat": now,
        "memberships": [_membership_payload(m) for m in user.memberships if m.is_active],
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception:
        return None


def get_authorization_token() -> Optional[str]:
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None
    parts = auth_header.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None


def get_current_user(db: SessionLocal) -> Tuple[Optional[User], Optional[dict]]:
    token = get_authorization_token()
    if not token:
        return None, None
    data = decode_token(token)
    if not data:
        return None, None
    user_id = data.get("sub")
    try:
        user = db.query(User).get(int(user_id))
    except Exception:
        return None, None
    if not user or not user.is_active:
        return None, None
    return user, data


def user_is_super_admin(user: Optional[User]) -> bool:
    return bool(user and user.global_role == "super_admin")


def serialize_user_with_memberships(user: User):
    data = user.to_safe_dict()
    data["memberships"] = [_membership_payload(m) for m in user.memberships]
    return data


def _active_memberships(user: User):
    return [m for m in user.memberships if m.is_active]


def user_is_club_admin(user: User, club_id: int) -> bool:
    if user_is_super_admin(user):
        return True
    if not user or club_id is None:
        return False
    for m in _active_memberships(user):
        if m.club_id == club_id and m.role == "club_admin":
            return True
    return False


def user_can_view_match(user: User, match: Match) -> bool:
    if user_is_super_admin(user):
        return True
    if not match or not match.team:
        return False
    club_id = match.team.club_id
    for m in _active_memberships(user):
        if m.club_id != club_id:
            continue
        match_ids = {mm.match_id for mm in m.match_scopes}
        team_ids = {tt.team_id for tt in m.team_scopes}
        if match_ids and match.id not in match_ids:
            continue
        if team_ids and match.team_id not in team_ids:
            continue
        return True
    return False


def user_can_edit_match(user: User, match: Match) -> bool:
    if user_is_super_admin(user):
        return True
    if not match or not match.team:
        return False
    club_id = match.team.club_id
    for m in _active_memberships(user):
        if m.club_id != club_id:
            continue
        if m.role == "club_admin" or (m.role == "analyst" and m.can_edit):
            match_ids = {mm.match_id for mm in m.match_scopes}
            team_ids = {tt.team_id for tt in m.team_scopes}
            if match_ids and match.id not in match_ids:
                continue
            if team_ids and match.team_id not in team_ids:
                continue
            return True
    return False
