from flask import Blueprint, jsonify, request
from db import SessionLocal
from models import Team, Club
from auth_utils import get_current_user, user_is_super_admin, user_is_club_admin
from flask_cors import cross_origin
from auth_utils import _active_memberships

teams_bp = Blueprint('teams_bp', __name__)


@teams_bp.route('/teams', methods=['GET', 'OPTIONS'])
@cross_origin(origins="*", supports_credentials=True)
def list_teams():
    db = SessionLocal()
    try:
        user, _ = get_current_user(db)
        if not user:
            return jsonify({"error": "No autorizado"}), 401
        club_id = request.args.get('club_id', type=int)
        q = db.query(Team)
        if club_id:
            q = q.filter(Team.club_id == club_id)
        # Si no es super_admin, filtrar por sus clubes
        if not user_is_super_admin(user):
            club_ids = [m.club_id for m in _active_memberships(user)]
            if club_ids:
                q = q.filter(Team.club_id.in_(club_ids))
        teams = q.all() or []
        return jsonify({
            "teams": [
                {
                    "id": t.id,
                    "name": t.name,
                    "category": t.category,
                    "season": t.season,
                    "club_id": t.club_id,
                    "is_opponent": t.is_opponent or False,
                }
                for t in teams
            ]
        })
    finally:
        db.close()


@teams_bp.route('/teams', methods=['POST', 'OPTIONS'])
@cross_origin(origins="*", supports_credentials=True)
def create_team():
    db = SessionLocal()
    try:
        user, _ = get_current_user(db)
        if not user:
            return jsonify({"error": "No autorizado"}), 401
        data = request.get_json() or {}
        club_id = data.get('club_id')
        name = (data.get('name') or '').strip()
        if not club_id or not name:
            return jsonify({"error": "club_id y nombre requeridos"}), 400
        # perm: super_admin o club_admin del club
        if not (user_is_super_admin(user) or user_is_club_admin(user, club_id)):
            return jsonify({"error": "Sin permiso para crear equipo en este club"}), 403
        # validar club
        club = db.query(Club).get(club_id)
        if not club:
            return jsonify({"error": "Club no encontrado"}), 404
        team = Team(
            club_id=club_id,
            name=name,
            category=data.get('category'),
            season=data.get('season'),
            is_opponent=data.get('is_opponent', False),
        )
        db.add(team)
        db.commit()
        return jsonify({
            "team": {
                "id": team.id,
                "name": team.name,
                "category": team.category,
                "season": team.season,
                "club_id": team.club_id,
                "is_opponent": team.is_opponent or False,
            }
        }), 201
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@teams_bp.route('/teams/<int:team_id>', methods=['PUT', 'OPTIONS'])
@cross_origin(origins="*", supports_credentials=True)
def update_team(team_id: int):
    db = SessionLocal()
    try:
        user, _ = get_current_user(db)
        if not user:
            print(f"[teams] update_team unauthenticated")
            return jsonify({"error": "No autorizado"}), 401
        team = db.query(Team).get(team_id)
        if not team:
            print(f"[teams] update_team team {team_id} not found")
            return jsonify({"error": "Equipo no encontrado"}), 404
        if not (user_is_super_admin(user) or user_is_club_admin(user, team.club_id)):
            print(f"[teams] update_team permission denied user {user.id} club {team.club_id}")
            return jsonify({"error": "Sin permiso para editar este equipo"}), 403
        data = request.get_json() or {}
        print(f"[teams] update_team payload {data}")
        # Permitir cambiar club_id solo a super_admin o admin del club destino
        if 'club_id' in data and data.get('club_id') and int(data.get('club_id')) != team.club_id:
            new_club_id = int(data.get('club_id'))
            if not user_is_super_admin(user) and not user_is_club_admin(user, new_club_id):
                print(f"[teams] update_team cannot move team {team_id} to club {new_club_id}")
                return jsonify({"error": "Sin permiso para mover equipo a otro club"}), 403
            new_club = db.query(Club).get(new_club_id)
            if not new_club:
                print(f"[teams] update_team club destino {new_club_id} no existe")
                return jsonify({"error": "Club destino no encontrado"}), 404
            team.club_id = new_club_id
        for field in ['name', 'category', 'season', 'is_opponent']:
            if field in data:
                setattr(team, field, data.get(field))
        db.commit()
        print(f"[teams] update_team ok team_id={team.id} club_id={team.club_id}")
        return jsonify({"team": {
            "id": team.id,
            "name": team.name,
            "category": team.category,
            "season": team.season,
            "club_id": team.club_id,
            "is_opponent": team.is_opponent or False,
        }})
    except Exception as e:
        db.rollback()
        import traceback; traceback.print_exc()
        print(f"[teams] update_team error {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@teams_bp.route('/teams/<int:team_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin(origins="*", supports_credentials=True)
def delete_team(team_id: int):
    db = SessionLocal()
    try:
        user, _ = get_current_user(db)
        if not user:
            return jsonify({"error": "No autorizado"}), 401
        team = db.query(Team).get(team_id)
        if not team:
            return jsonify({"error": "Equipo no encontrado"}), 404
        if not (user_is_super_admin(user) or user_is_club_admin(user, team.club_id)):
            return jsonify({"error": "Sin permiso para eliminar este equipo"}), 403
        # Nota: no manejamos reasignación de matches aquí; el admin debe hacerlo antes
        db.delete(team)
        db.commit()
        return jsonify({"message": "Equipo eliminado"})
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@teams_bp.route('/clubs/<int:club_id>/opponents', methods=['GET', 'OPTIONS'])
@cross_origin(origins="*", supports_credentials=True)
def list_club_opponents(club_id: int):
    """List all opponent teams for a specific club"""
    db = SessionLocal()
    try:
        user, _ = get_current_user(db)
        if not user:
            return jsonify({"error": "No autorizado"}), 401
        
        # Verify club exists and user has access
        club = db.query(Club).get(club_id)
        if not club:
            return jsonify({"error": "Club no encontrado"}), 404
        
        if not user_is_super_admin(user):
            club_ids = [m.club_id for m in _active_memberships(user)]
            if club_id not in club_ids:
                return jsonify({"error": "Sin acceso a este club"}), 403
        
        # Get all opponent teams for this club
        opponents = db.query(Team).filter(
            Team.club_id == club_id,
            Team.is_opponent == True
        ).order_by(Team.name).all()
        
        return jsonify({
            "opponents": [
                {
                    "id": t.id,
                    "name": t.name,
                    "category": t.category,
                    "season": t.season,
                }
                for t in opponents
            ]
        })
    finally:
        db.close()


