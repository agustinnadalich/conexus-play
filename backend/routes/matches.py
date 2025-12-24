import os
from flask import Blueprint, jsonify, request
from db import SessionLocal
from models import Match, Team, Event
from auth_utils import (
    get_current_user,
    user_is_super_admin,
    user_can_view_match,
    user_can_edit_match,
    user_is_club_admin,
)

match_bp = Blueprint('match_bp', __name__)
AUTH_ENABLED = os.getenv("AUTH_ENABLED", "true").lower() == "true"

@match_bp.route('/matches', methods=['GET'])
def get_matches():
    db = SessionLocal()
    try:
        club_filter = request.args.get('club_id', type=int)
        if AUTH_ENABLED:
            user, _ = get_current_user(db)
            if not user:
                return jsonify({"error": "No autorizado"}), 401

            if user_is_super_admin(user):
                q = db.query(Match).join(Team, isouter=True)
                if club_filter:
                    q = q.filter(Team.club_id == club_filter)
                matches = q.all()
            else:
                memberships = [m for m in user.memberships if m.is_active]
                if not memberships:
                    return jsonify([])
                club_ids = {m.club_id for m in memberships}
                match_ids_scope = {mm.match_id for m in memberships for mm in m.match_scopes}
                team_ids_scope = {tt.team_id for m in memberships for tt in m.team_scopes}

                q = db.query(Match).join(Team)
                q = q.filter(Team.club_id.in_(club_ids))
                if club_filter:
                    q = q.filter(Team.club_id == club_filter)
                # excluir partidos sin equipo
                q = q.filter(Match.team_id.isnot(None))
                from sqlalchemy import or_
                conditions = []
                if match_ids_scope:
                    conditions.append(Match.id.in_(match_ids_scope))
                if team_ids_scope:
                    conditions.append(Match.team_id.in_(team_ids_scope))
                if conditions:
                    q = q.filter(or_(*conditions))
                matches = q.all()
        else:
            q = db.query(Match).join(Team, isouter=True)
            if club_filter:
                q = q.filter(Team.club_id == club_filter)
            matches = q.all()

        result = []
        for m in matches:
            match_dict = m.to_dict()
            match_dict["team"] = m.team.name if m.team else None
            match_dict["opponent"] = m.opponent_name
            result.append(match_dict)
        return jsonify(result)
    finally:
        db.close()


@match_bp.route('/matches/<int:id>', methods=['GET'])
def get_match(id):
    db = SessionLocal()
    try:
        match = db.query(Match).get(id)
        if not match:
            return jsonify({"error": "Partido no encontrado"}), 404
        if AUTH_ENABLED:
            user, _ = get_current_user(db)
            if not user:
                return jsonify({"error": "No autorizado"}), 401
            if not user_can_view_match(user, match):
                return jsonify({"error": "Sin permiso para ver este partido"}), 403

        result = match.to_dict()
        print(f"DEBUG: Resultado de to_dict(): {result}")
        print(f"DEBUG: global_delay_seconds en result: {result.get('global_delay_seconds')}")
        print(f"DEBUG: event_delays en result: {result.get('event_delays')}")
        # Agregar campos adicionales que no están en to_dict
        result["team"] = match.team.name if match.team else None
        result["opponent"] = match.opponent_name  # Para mantener compatibilidad
        result["field"] = match.field

        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@match_bp.route('/matches/<int:id>/event-types', methods=['GET'])
def get_match_event_types(id):
    db = SessionLocal()
    try:
        match = db.query(Match).get(id)
        if not match:
            return jsonify({"error": "Partido no encontrado"}), 404

        # Obtener tipos de eventos únicos del partido
        from sqlalchemy import distinct
        event_types = db.query(distinct(Event.event_type)).filter(Event.match_id == id).all()
        
        # Convertir a lista de strings y filtrar valores None
        types_list = [et[0] for et in event_types if et[0] is not None]
        
        # Ordenar alfabéticamente
        types_list.sort()

        return jsonify({
            "match_id": id,
            "event_types": types_list
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@match_bp.route('/matches/<int:id>', methods=['PUT'])

@match_bp.route('/matches/<int:id>', methods=['PUT'])
def update_match(id):
    db = SessionLocal()
    try:
        match = db.query(Match).get(id)
        if not match:
            return jsonify({"error": "Partido no encontrado"}), 404
        if AUTH_ENABLED:
            user, _ = get_current_user(db)
            if not user:
                return jsonify({"error": "No autorizado"}), 401
            if not user_can_edit_match(user, match):
                return jsonify({"error": "Sin permiso para editar este partido"}), 403

        data = request.get_json()
        print(f"DEBUG: Datos recibidos: {data}")
        print(f"DEBUG: Keys en data: {list(data.keys())}")

        # Permisos según club del partido o del team a asignar
        target_team = None
        target_club_id = match.team.club_id if match.team else None
        if data.get('team_id'):
            target_team = db.query(Team).get(data['team_id'])
            if not target_team:
                return jsonify({"error": "Equipo no encontrado"}), 404
            target_club_id = target_team.club_id

        if AUTH_ENABLED:
            user, _ = get_current_user(db)
            if not user:
                return jsonify({"error": "No autorizado"}), 401
            # permitir si super_admin o club_admin del club objetivo
            if not (user_is_super_admin(user) or (target_club_id and user_is_club_admin(user, target_club_id)) or user_can_edit_match(user, match)):
                return jsonify({"error": "Sin permiso para editar este partido"}), 403

        # Actualizar campos de tiempos manuales si se proporcionan
        if 'kick_off_1_seconds' in data:
            match.kick_off_1_seconds = data['kick_off_1_seconds']
            print(f"DEBUG: Actualizando kick_off_1_seconds = {data['kick_off_1_seconds']}")
        if 'end_1_seconds' in data:
            match.end_1_seconds = data['end_1_seconds']
            print(f"DEBUG: Actualizando end_1_seconds = {data['end_1_seconds']}")
        if 'kick_off_2_seconds' in data:
            match.kick_off_2_seconds = data['kick_off_2_seconds']
            print(f"DEBUG: Actualizando kick_off_2_seconds = {data['kick_off_2_seconds']}")
        if 'end_2_seconds' in data:
            match.end_2_seconds = data['end_2_seconds']
            print(f"DEBUG: Actualizando end_2_seconds = {data['end_2_seconds']}")
        
        # Actualizar campos de delay si se proporcionan
        if 'global_delay_seconds' in data:
            match.global_delay_seconds = data['global_delay_seconds']
            print(f"DEBUG: Actualizando global_delay_seconds = {data['global_delay_seconds']}")
        if 'event_delays' in data:
            match.event_delays = data['event_delays']
            print(f"DEBUG: Actualizando event_delays = {data['event_delays']}")

        if 'team_id' in data:
            match.team_id = data['team_id']
            print(f"DEBUG: Actualizando team_id = {data['team_id']}")
        
        print(f"DEBUG: Valores después de actualización - global_delay: {match.global_delay_seconds}, event_delays: {match.event_delays}")
        
        db.commit()
        print(f"✅ Partido actualizado correctamente: {match.id}")
        
        # Si se actualizaron los tiempos del partido, recalcular Game_Time automáticamente
        times_updated = any([
            'kick_off_1_seconds' in data,
            'end_1_seconds' in data,
            'kick_off_2_seconds' in data,
            'end_2_seconds' in data
        ])
        
        if times_updated:
            print(f"🔄 Tiempos actualizados, recalculando Game_Time...")
            try:
                # Importar aquí para evitar circular imports
                from enricher import calculate_game_time_from_zero
                
                # Obtener eventos del partido
                events = db.query(Event).filter(Event.match_id == id).order_by(Event.timestamp_sec).all()
                
                if events:
                    # Preparar datos para recalcular
                    events_data = [{
                        'timestamp_sec': e.timestamp_sec,
                        'event_type': e.event_type,
                        'extra_data': e.extra_data or {}
                    } for e in events]
                    
                    # Configurar tiempos manuales
                    match_times = {
                        'kick_off_1': match.kick_off_1_seconds or 0,
                        'end_1': match.end_1_seconds or 2400,
                        'kick_off_2': match.kick_off_2_seconds or 2700,
                        'end_2': match.end_2_seconds or 4800
                    }
                    
                    profile = {
                        'time_mapping': {
                            'method': 'manual',
                            'manual_times': match_times
                        }
                    }
                    
                    # Recalcular Game_Time
                    updated_events = calculate_game_time_from_zero(events_data, match_info={}, profile=profile)
                    
                    # Actualizar eventos en la base de datos
                    for i, event in enumerate(events):
                        if i < len(updated_events):
                            updated_data = updated_events[i]
                            if 'extra_data' in updated_data:
                                event.extra_data = updated_data['extra_data']
                                from sqlalchemy.orm.attributes import flag_modified
                                flag_modified(event, "extra_data")
                    
                    db.commit()
                    print(f"✅ Game_Time recalculado para {len(events)} eventos")
            except Exception as recalc_err:
                print(f"⚠️ Error recalculando Game_Time: {str(recalc_err)}")
                import traceback
                traceback.print_exc()
                # No fallar el update del partido por esto
        
        # Devolver el partido actualizado
        result = {
            "id": match.id,
            "team": match.team.name if match.team else None,
            "team_id": match.team_id,
            "opponent": match.opponent_name,
            "date": match.date.isoformat() if match.date is not None else None,
            "location": match.location,
            "video_url": match.video_url,
            "competition": match.competition,
            "round": match.round,
            "field": match.field,
            "rain": match.rain,
            "muddy": match.muddy,
            "wind_1p": match.wind_1p,
            "wind_2p": match.wind_2p,
            "referee": match.referee,
            "result": match.result,
            "kick_off_1_seconds": match.kick_off_1_seconds,
            "end_1_seconds": match.end_1_seconds,
            "kick_off_2_seconds": match.kick_off_2_seconds,
            "end_2_seconds": match.end_2_seconds,
            "global_delay_seconds": match.global_delay_seconds,
            "event_delays": match.event_delays
        }
        
        print(f"DEBUG: Resultado a devolver: {result}")
        return jsonify(result), 200
    except Exception as e:
        db.rollback()
        print(f"ERROR: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@match_bp.route('/matches/<int:id>', methods=['DELETE'])
def delete_match(id):
    """Eliminar un partido y todos sus eventos asociados"""
    db = SessionLocal()
    try:
        # Buscar el partido
        match = db.query(Match).get(id)
        if not match:
            return jsonify({"error": "Partido no encontrado"}), 404
        if AUTH_ENABLED:
            user, _ = get_current_user(db)
            if not user:
                return jsonify({"error": "No autorizado"}), 401
            if not user_can_edit_match(user, match):
                return jsonify({"error": "Sin permiso para eliminar este partido"}), 403

        # Eliminar eventos asociados primero (por la restricción de clave foránea)
        events_count = db.query(Event).filter(Event.match_id == id).count()
        db.query(Event).filter(Event.match_id == id).delete()
        
        # Eliminar el partido
        db.delete(match)
        db.commit()
        
        return jsonify({
            "message": f"Partido eliminado exitosamente",
            "deleted_match_id": id,
            "deleted_events_count": events_count
        }), 200
        
    except Exception as e:
        db.rollback()
        print(f"ERROR eliminando partido {id}: {str(e)}")
        return jsonify({"error": f"Error eliminando partido: {str(e)}"}), 500
    finally:
        db.close()


@match_bp.route('/matches/<int:id>/recalculate-times', methods=['POST'])
def recalculate_match_times(id):
    """
    Recalcula los Game_Time de todos los eventos del partido
    usando los tiempos manuales configurados (kick_off_1_seconds, end_1_seconds, etc.)
    """
    db = SessionLocal()
    try:
        # 1. Buscar el partido
        match = db.query(Match).get(id)
        if not match:
            return jsonify({"error": "Partido no encontrado"}), 404
        if AUTH_ENABLED:
            user, _ = get_current_user(db)
            if not user:
                return jsonify({"error": "No autorizado"}), 401
            if not user_can_edit_match(user, match):
                return jsonify({"error": "Sin permiso para editar este partido"}), 403
        
        # 2. Obtener todos los eventos del partido
        events = db.query(Event).filter(Event.match_id == id).order_by(Event.timestamp_sec).all()
        if not events:
            return jsonify({"error": "No hay eventos para recalcular"}), 404
        
        print(f"🔄 Recalculando Game_Time para {len(events)} eventos del partido {id}")
        
        # 3. Obtener tiempos manuales del partido
        # IMPORTANTE: Los valores son SEGUNDOS DEL VIDEO
        # kick_off_1: Segundo del video donde inicia el partido (negativo si no está filmado)
        # end_1: Segundo del video donde termina el primer tiempo (~40' Game_Time)
        # kick_off_2: Segundo del video donde inicia el segundo tiempo  
        # end_2: Segundo del video donde termina el partido (~80' Game_Time)
        #
        # Ejemplo: kick_off_1 = -120, end_1 = 2280
        #   → El partido inició 120s antes del inicio del video
        #   → El primer tiempo termina en el segundo 2280 del video
        #   → Duración REAL del primer tiempo = 2280 - (-120) = 2400s
        kick_off_1 = match.kick_off_1_seconds or 0
        end_1 = match.end_1_seconds or 2400  # Último segundo del 1er tiempo en el video
        kick_off_2 = match.kick_off_2_seconds or 2700
        end_2 = match.end_2_seconds or 4800
        
        # Calcular la duración REAL del primer tiempo basándose en los timestamps del video.
        # Si hay tiempo adicional o interrupciones largas, esto se refleja en end_1 - kick_off_1
        first_half_duration = end_1 - kick_off_1
        
        print(f"📊 Tiempos configurados:")
        print(f"   Kick off 1: {kick_off_1}s")
        print(f"   End 1: {end_1}s")
        print(f"   Kick off 2: {kick_off_2}s")
        print(f"   End 2: {end_2}s")
        print(f"   Duración 1er tiempo: {first_half_duration}s")
        
        # 4. Recalcular Game_Time para cada evento
        updated_count = 0
        for event in events:
            timestamp = event.timestamp_sec
            event_type = event.event_type.upper()
            
            # Determinar período
            if timestamp < kick_off_2:
                period = 1
            else:
                period = 2
            
            # Calcular Game_Time
            if event_type == 'KICK OFF':
                if abs(timestamp - kick_off_1) < 1:  # Primer kick off
                    game_time_sec = 0
                elif abs(timestamp - kick_off_2) < 1:  # Segundo kick off
                    game_time_sec = first_half_duration
                else:  # Otros kick offs
                    if period == 1:
                        game_time_sec = max(0, timestamp - kick_off_1)
                    else:
                        game_time_sec = first_half_duration + (timestamp - kick_off_2)
            elif event_type == 'END':
                if abs(timestamp - end_1) < 1:  # Fin del primer tiempo
                    game_time_sec = first_half_duration
                elif abs(timestamp - end_2) < 1:  # Fin del segundo tiempo
                    second_half_duration = end_2 - kick_off_2
                    game_time_sec = first_half_duration + second_half_duration
                else:  # Otros ends
                    if period == 1:
                        game_time_sec = max(0, timestamp - kick_off_1)
                    else:
                        game_time_sec = first_half_duration + (timestamp - kick_off_2)
            else:
                # Eventos normales
                if period == 1:
                    game_time_sec = max(0, timestamp - kick_off_1)
                else:
                    game_time_sec = first_half_duration + (timestamp - kick_off_2)
            
            # Formatear como MM:SS
            minutes = int(game_time_sec // 60)
            seconds = int(game_time_sec % 60)
            game_time_str = f"{minutes:02d}:{seconds:02d}"
            
            # Actualizar extra_data
            if event.extra_data is None:
                event.extra_data = {}
            
            event.extra_data['Game_Time'] = game_time_str
            event.extra_data['DETECTED_PERIOD'] = period
            
            # Calcular Time_Group (cuartos)
            if game_time_sec < 1200:
                time_group = "0'- 20'"
            elif game_time_sec < 2400:
                time_group = "20' - 40'"
            elif game_time_sec < 3600:
                time_group = "40' - 60'"
            else:
                time_group = "60' - 80'"
            
            event.extra_data['Time_Group'] = time_group
            
            # Marcar como modificado (para JSONB)
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(event, "extra_data")
            
            updated_count += 1
        
        # 5. Commit de los cambios
        db.commit()
        
        print(f"✅ {updated_count} eventos actualizados")
        
        return jsonify({
            "message": "Game_Time recalculado exitosamente",
            "match_id": id,
            "events_updated": updated_count,
            "times_used": {
                "kick_off_1_seconds": kick_off_1,
                "end_1_seconds": end_1,
                "kick_off_2_seconds": kick_off_2,
                "end_2_seconds": end_2,
                "first_half_duration": first_half_duration
            }
        }), 200
        
    except Exception as e:
        db.rollback()
        print(f"❌ ERROR recalculando Game_Time: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Error recalculando tiempos: {str(e)}"}), 500
    finally:
        db.close()


__all__ = ['match_bp']
