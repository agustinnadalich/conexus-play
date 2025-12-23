import os
import secrets
import datetime
from flask import Blueprint, jsonify, request
from db import SessionLocal
from models import User, ClubMembership, MembershipTeamScope, MembershipMatchScope, EmailVerificationToken, PasswordResetToken
from auth_utils import hash_password, verify_password, create_access_token, get_current_user, user_is_super_admin, serialize_user_with_memberships, user_is_club_admin
from mail_service import send_email
from models import Club


auth_bp = Blueprint("auth_bp", __name__)

VERIFICATION_EXP_HOURS = int(os.getenv("VERIFICATION_EXP_HOURS", "24"))
RESET_EXP_MINUTES = int(os.getenv("RESET_EXP_MINUTES", "60"))
APP_URL = os.getenv("APP_URL", "http://localhost:5173")


def _generate_token() -> str:
    return secrets.token_urlsafe(48)


def _membership_dict(m: ClubMembership):
    return {
        "id": m.id,
        "club_id": m.club_id,
        "role": m.role,
        "can_edit": m.can_edit,
        "team_ids": [t.team_id for t in m.team_scopes],
        "match_ids": [mm.match_id for mm in m.match_scopes],
        "is_active": m.is_active,
    }


def _create_verification_token(db, user: User):
    token = _generate_token()
    expires = datetime.datetime.utcnow() + datetime.timedelta(hours=VERIFICATION_EXP_HOURS)
    db.add(EmailVerificationToken(user_id=user.id, token=token, expires_at=expires))
    db.commit()
    return token


def _create_reset_token(db, user: User):
    token = _generate_token()
    expires = datetime.datetime.utcnow() + datetime.timedelta(minutes=RESET_EXP_MINUTES)
    db.add(PasswordResetToken(user_id=user.id, token=token, expires_at=expires))
    db.commit()
    return token


def _ensure_membership(db, user: User, club_id: int, role: str, can_edit: bool, team_ids=None, match_ids=None):
    existing = db.query(ClubMembership).filter_by(user_id=user.id, club_id=club_id).first()
    if existing:
        existing.role = role
        existing.can_edit = can_edit
        existing.is_active = True
        existing.team_scopes = []
        existing.match_scopes = []
        membership = existing
    else:
        membership = ClubMembership(user_id=user.id, club_id=club_id, role=role, can_edit=can_edit)
        db.add(membership)
        db.flush()

    team_ids = team_ids or []
    match_ids = match_ids or []

    for tid in team_ids:
        db.add(MembershipTeamScope(membership_id=membership.id, team_id=tid))

    for mid in match_ids:
        db.add(MembershipMatchScope(membership_id=membership.id, match_id=mid))

    return membership


@auth_bp.route("/auth/login", methods=["POST"])
def login():
    db = SessionLocal()
    try:
        payload = request.get_json() or {}
        email = (payload.get("email") or "").strip().lower()
        password = payload.get("password") or ""
        if not email or not password:
            return jsonify({"error": "Email y password son requeridos"}), 400

        user = db.query(User).filter(User.email == email).first()
        if not user or not verify_password(password, user.password_hash):
            return jsonify({"error": "Credenciales inválidas"}), 401
        if not user.is_active:
            return jsonify({"error": "Usuario inactivo"}), 403

        token = create_access_token(user)
        return jsonify({
            "access_token": token,
            "token_type": "bearer",
            "user": serialize_user_with_memberships(user),
        })
    finally:
        db.close()


@auth_bp.route("/auth/me", methods=["GET"])
def me():
    db = SessionLocal()
    try:
        user, token_data = get_current_user(db)
        if not user:
            return jsonify({"error": "No autorizado"}), 401
        return jsonify({
            "user": serialize_user_with_memberships(user),
            "token_claims": token_data,
        })
    finally:
        db.close()


@auth_bp.route("/auth/refresh", methods=["POST"])
def refresh():
    db = SessionLocal()
    try:
        user, _ = get_current_user(db)
        if not user:
            return jsonify({"error": "No autorizado"}), 401
        token = create_access_token(user)
        return jsonify({"access_token": token, "token_type": "bearer"})
    finally:
        db.close()


@auth_bp.route("/auth/register", methods=["POST"])
def register_user():
    db = SessionLocal()
    try:
        current_user, _ = get_current_user(db)
        if not user_is_super_admin(current_user):
            return jsonify({"error": "Solo super_admin puede registrar usuarios"}), 403

        payload = request.get_json() or {}
        email = (payload.get("email") or "").strip().lower()
        password = payload.get("password") or _generate_token()
        full_name = payload.get("full_name")
        global_role = payload.get("global_role") or "user"
        club_id = payload.get("club_id")
        role = payload.get("role") or "viewer"
        can_edit = bool(payload.get("can_edit", False))
        team_ids = payload.get("team_ids") or []
        match_ids = payload.get("match_ids") or []

        if not email:
            return jsonify({"error": "Email requerido"}), 400

        existing = db.query(User).filter(User.email == email).first()
        if existing:
            return jsonify({"error": "El email ya está registrado"}), 409

        user = User(
            email=email,
            password_hash=hash_password(password),
            full_name=full_name,
            global_role=global_role,
            is_active=True,
            is_email_verified=False,
        )
        db.add(user)
        db.flush()

        membership = None
        if club_id:
            membership = _ensure_membership(db, user, club_id, role, can_edit, team_ids, match_ids)

        verification_token = _create_verification_token(db, user)
        verify_link = f"{APP_URL}/verify-email?token={verification_token}"
        send_email(user.email, "Verifica tu cuenta", f"Hola {full_name or ''}, verifica tu email: {verify_link}")

        db.commit()
        return jsonify({
            "user": serialize_user_with_memberships(user),
            "membership": _membership_dict(membership) if membership else None,
            "verification_sent": True,
        }), 201
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@auth_bp.route("/auth/invite", methods=["POST"])
def invite_user_to_club():
    db = SessionLocal()
    try:
        current_user, _ = get_current_user(db)
        if not current_user:
            return jsonify({"error": "No autorizado"}), 401

        payload = request.get_json() or {}
        club_id = payload.get("club_id")
        role = payload.get("role") or "viewer"
        can_edit = bool(payload.get("can_edit", False))
        team_ids = payload.get("team_ids") or []
        match_ids = payload.get("match_ids") or []
        email = (payload.get("email") or "").strip().lower()
        full_name = payload.get("full_name")

        if not club_id or not email:
            return jsonify({"error": "club_id y email son requeridos"}), 400

        # Only super_admin or club_admin of that club
        is_allowed = False
        if user_is_super_admin(current_user):
            is_allowed = True
        else:
            admin_membership = next((m for m in current_user.memberships if m.club_id == club_id and m.role == "club_admin" and m.is_active), None)
            if admin_membership:
                is_allowed = True
        if not is_allowed:
            return jsonify({"error": "Sin permiso para invitar en este club"}), 403

        user = db.query(User).filter(User.email == email).first()
        created_new = False
        if not user:
            user = User(
                email=email,
                password_hash=hash_password(_generate_token()),
                full_name=full_name,
                is_active=True,
                global_role="user",
                is_email_verified=False,
            )
            db.add(user)
            db.flush()
            created_new = True

        membership = _ensure_membership(db, user, club_id, role, can_edit, team_ids, match_ids)
        verification_token = _create_verification_token(db, user)
        verify_link = f"{APP_URL}/verify-email?token={verification_token}"
        send_email(user.email, "Has sido invitado", f"Te invitaron a un club. Verifica tu email: {verify_link}")
        db.commit()
        return jsonify({
            "user": serialize_user_with_memberships(user),
            "membership": _membership_dict(membership),
            "created_new_user": created_new,
            "verification_sent": True,
        }), 200
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@auth_bp.route("/auth/verify", methods=["POST"])
def verify_email():
    db = SessionLocal()
    try:
        token = (request.get_json() or {}).get("token")
        if not token:
            return jsonify({"error": "Token requerido"}), 400
        record = db.query(EmailVerificationToken).filter_by(token=token).first()
        if not record:
            return jsonify({"error": "Token inválido"}), 400
        if record.consumed_at:
            return jsonify({"error": "Token ya usado"}), 400
        if record.expires_at < datetime.datetime.utcnow():
            return jsonify({"error": "Token expirado"}), 400

        user = db.query(User).get(record.user_id)
        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404
        user.is_email_verified = True
        record.consumed_at = datetime.datetime.utcnow()
        db.commit()
        return jsonify({"message": "Email verificado", "user": serialize_user_with_memberships(user)})
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@auth_bp.route("/auth/forgot", methods=["POST"])
def forgot_password():
    db = SessionLocal()
    try:
        email = (request.get_json() or {}).get("email", "").strip().lower()
        if not email:
            return jsonify({"error": "Email requerido"}), 400
        user = db.query(User).filter(User.email == email).first()
        if not user:
            return jsonify({"message": "Si el email existe, enviaremos instrucciones"})
        token = _create_reset_token(db, user)
        reset_link = f"{APP_URL}/reset-password?token={token}"
        send_email(user.email, "Restablecer contraseña", f"Usa este enlace para restablecer: {reset_link}")
        db.commit()
        return jsonify({"message": "Si el email existe, enviaremos instrucciones"})
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@auth_bp.route("/auth/reset", methods=["POST"])
def reset_password():
    db = SessionLocal()
    try:
        payload = request.get_json() or {}
        token = payload.get("token")
        new_password = payload.get("password")
        if not token or not new_password:
            return jsonify({"error": "Token y nueva contraseña son requeridos"}), 400

        record = db.query(PasswordResetToken).filter_by(token=token).first()
        if not record:
            return jsonify({"error": "Token inválido"}), 400
        if record.consumed_at:
            return jsonify({"error": "Token ya usado"}), 400
        if record.expires_at < datetime.datetime.utcnow():
            return jsonify({"error": "Token expirado"}), 400

        user = db.query(User).get(record.user_id)
        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404
        user.password_hash = hash_password(new_password)
        record.consumed_at = datetime.datetime.utcnow()
        db.commit()
        return jsonify({"message": "Contraseña actualizada"})
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@auth_bp.route("/auth/users", methods=["GET"])
def list_users():
    db = SessionLocal()
    try:
        current_user, _ = get_current_user(db)
        if not user_is_super_admin(current_user):
            return jsonify({"error": "Solo super_admin puede listar usuarios"}), 403
        users = db.query(User).all()
        return jsonify({"users": [serialize_user_with_memberships(u) for u in users]})
    finally:
        db.close()


@auth_bp.route("/auth/users/<int:user_id>/status", methods=["POST"])
def set_user_status(user_id: int):
    db = SessionLocal()
    try:
        current_user, _ = get_current_user(db)
        if not user_is_super_admin(current_user):
            return jsonify({"error": "Solo super_admin puede modificar usuarios"}), 403
        data = request.get_json() or {}
        is_active = data.get("is_active")
        if is_active is None:
            return jsonify({"error": "is_active requerido"}), 400
        user = db.query(User).get(user_id)
        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404
        user.is_active = bool(is_active)
        db.commit()
        return jsonify({"user": serialize_user_with_memberships(user)})
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@auth_bp.route("/auth/users/<int:user_id>/memberships", methods=["POST"])
def upsert_membership(user_id: int):
    db = SessionLocal()
    try:
        current_user, _ = get_current_user(db)
        if not user_is_super_admin(current_user):
            return jsonify({"error": "Solo super_admin puede modificar membresías"}), 403
        payload = request.get_json() or {}
        club_id = payload.get("club_id")
        role = payload.get("role") or "viewer"
        can_edit = bool(payload.get("can_edit", False))
        team_ids = payload.get("team_ids") or []
        match_ids = payload.get("match_ids") or []
        is_active = payload.get("is_active", True)

        if not club_id:
            return jsonify({"error": "club_id requerido"}), 400

        user = db.query(User).get(user_id)
        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404

        membership = _ensure_membership(db, user, club_id, role, can_edit, team_ids, match_ids)
        membership.is_active = bool(is_active)
        db.commit()
        db.refresh(membership)
        return jsonify({"user": serialize_user_with_memberships(user)})
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@auth_bp.route("/auth/clubs", methods=["GET"])
def list_clubs():
    db = SessionLocal()
    try:
        current_user, _ = get_current_user(db)
        if not current_user:
            return jsonify({"error": "No autorizado"}), 401
        clubs = db.query(Club).all() or []
        return jsonify({"clubs": [{
            "id": c.id,
            "name": c.name,
            "logo_url": c.logo_url,
            "primary_color": c.primary_color,
            "secondary_color": c.secondary_color,
            "accent_color": c.accent_color,
            "landing_copy": c.landing_copy
        } for c in clubs]})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Error listando clubes: {str(e)}"}), 500
    finally:
        db.close()


@auth_bp.route("/auth/clubs", methods=["POST"])
def create_club():
    db = SessionLocal()
    try:
        current_user, _ = get_current_user(db)
        if not user_is_super_admin(current_user):
            return jsonify({"error": "Solo super_admin puede crear clubes"}), 403
        data = request.get_json() or {}
        name = (data.get("name") or "").strip()
        if not name:
            return jsonify({"error": "Nombre requerido"}), 400
        if db.query(Club).filter(Club.name == name).first():
            return jsonify({"error": "Ya existe un club con ese nombre"}), 409
        club = Club(
            name=name,
            logo_url=data.get("logo_url"),
            primary_color=data.get("primary_color"),
            secondary_color=data.get("secondary_color"),
            accent_color=data.get("accent_color"),
            landing_copy=data.get("landing_copy"),
        )
        db.add(club)
        db.commit()
        db.refresh(club)
        return jsonify({"club": {
            "id": club.id,
            "name": club.name,
            "logo_url": club.logo_url,
            "primary_color": club.primary_color,
            "secondary_color": club.secondary_color,
            "accent_color": club.accent_color,
            "landing_copy": club.landing_copy,
        }}), 201
    except Exception as e:
        db.rollback()
        return jsonify({"error": f"Error creando club: {str(e)}"}), 500
    finally:
        db.close()


@auth_bp.route("/auth/clubs/<int:club_id>", methods=["PUT"])
def update_club(club_id: int):
    import sys
    db = SessionLocal()
    try:
        current_user, _ = get_current_user(db)
        if not current_user:
            return jsonify({"error": "No autorizado"}), 401
        data = request.get_json() or {}
        sys.stderr.write(f"🎨 [auth.update_club] club_id={club_id} payload={data}\n")
        sys.stderr.flush()
        club = db.query(Club).get(club_id)
        if not club:
            return jsonify({"error": "Club no encontrado"}), 404
        if not (user_is_super_admin(current_user) or user_is_club_admin(current_user, club_id)):
            return jsonify({"error": "Sin permiso para editar este club"}), 403
        for field in ["name", "logo_url", "primary_color", "secondary_color", "accent_color", "landing_copy"]:
            if field in data:
                setattr(club, field, data.get(field))
        db.commit()
        db.refresh(club)
        sys.stderr.write(f"✅ [auth.update_club] GUARDADO en DB: primary={club.primary_color} secondary={club.secondary_color} accent={club.accent_color}\n")
        sys.stderr.flush()
        return jsonify({"club": {
            "id": club.id,
            "name": club.name,
            "logo_url": club.logo_url,
            "primary_color": club.primary_color,
            "secondary_color": club.secondary_color,
            "accent_color": club.accent_color,
            "landing_copy": club.landing_copy,
        }})
    except Exception as e:
        db.rollback()
        sys.stderr.write(f"❌ ERROR actualizando club: {str(e)}\n")
        sys.stderr.flush()
        return jsonify({"error": f"Error actualizando club: {str(e)}"}), 500
    finally:
        db.close()


@auth_bp.route("/auth/clubs/<int:club_id>", methods=["DELETE"])
def delete_club(club_id: int):
    db = SessionLocal()
    try:
        current_user, _ = get_current_user(db)
        if not user_is_super_admin(current_user):
            return jsonify({"error": "Solo super_admin puede eliminar clubes"}), 403
        club = db.query(Club).get(club_id)
        if not club:
            return jsonify({"error": "Club no encontrado"}), 404
        db.delete(club)
        db.commit()
        return jsonify({"message": "Club eliminado"})
    except Exception as e:
        db.rollback()
        return jsonify({"error": f"Error eliminando club: {str(e)}"}), 500
    finally:
        db.close()
