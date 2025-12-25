"""
Enricher Module - VideoAnalysis
Enriquece eventos de rugby con cálculos de Game_Time, detección de períodos y grupos de tiempo.
"""

import pandas as pd

# Mapeo de campos en español a inglés para estandarizar
SPANISH_TO_ENGLISH_MAPPING = {
    'AVANCE': 'ADVANCE',
    'JUGADOR': 'PLAYER',
    'EQUIPO': 'TEAM',
    'VELOCIDAD-RUCK': 'RUCK_SPEED',
    'ENCUADRE-TACKLE': 'TACKLE_FRAME',
    'RESULTADO-LINE': 'LINEOUT_RESULT',
    'POSICION-LINE': 'LINEOUT_POSITION',
    'CANTIDAD-LINE': 'LINEOUT_COUNT',
    'TIRADOR-LINE': 'LINEOUT_THROWER',
    'INFRACCION': 'INFRACTION',
    'TIPO-PUNTOS': 'POINTS_TYPE',
    'TIPO-PERDIDA/RECUPERACION': 'TURNOVER_TYPE',
    'TIPO-PERDIDA/RECUPERACIN': 'TURNOVER_TYPE',  # Variante con acento
    'SCRUM': 'SCRUM_RESULT',
    'PIE': 'KICK_TYPE',
    'RESULTADO-PALOS': 'GOAL_RESULT',
    'TIPO-QUIEBRE': 'BREAK_TYPE',
    'CANAL-QUIEBRE': 'BREAK_CHANNEL'
}

def seconds_to_mmss(seconds):
    """Convierte segundos a formato MM:SS"""
    try:
        # Redondear al segundo más cercano para evitar truncamiento
        total_seconds = round(float(seconds))
        minutes = total_seconds // 60
        secs = total_seconds % 60
        return f"{minutes:02d}:{secs:02d}"
    except Exception:
        return "00:00"

def assign_time_group(game_time_sec, first_half_duration=2400.0):
    """
    Asigna grupos de tiempo basándose en la duración real de los tiempos.
    Divide cada tiempo en dos mitades para crear 4 grupos principales con nombres consistentes.
    """
    first_half_mid = first_half_duration / 2
    second_half_mid = first_half_duration + (first_half_duration / 2)
    
    if game_time_sec < first_half_mid:
        return "Primer cuarto"
    elif game_time_sec < first_half_duration:
        return "Segundo cuarto"
    elif game_time_sec < second_half_mid:
        return "Tercer cuarto"
    else:
        return "Cuarto cuarto"

def translate_fields_to_english(event_data):
    """
    Traduce los campos de español a inglés usando el mapeo definido.
    Preserva los valores originales y crea nuevas claves en inglés.
    """
    translated_data = event_data.copy()
    
    for spanish_key, english_key in SPANISH_TO_ENGLISH_MAPPING.items():
        if spanish_key in event_data:
            # Mover el valor a la clave en inglés
            translated_data[english_key] = event_data[spanish_key]
            # Opcionalmente, eliminar la clave en español para limpiar
            # del translated_data[spanish_key]  # Comentado para mantener compatibilidad
    
    return translated_data

def process_penalty_events(event):
    """Procesa eventos PENALTY para extraer tarjetas"""
    if event.get('event_type', '').upper() == 'PENALTY':
        if 'extra_data' not in event:
            event['extra_data'] = {}
            
        # Intentar obtener descriptor desde extra_data
        descriptor = event.get('extra_data', {}).get('DESCRIPTOR', '')
        
        # También intentar obtener desde campos directos (por compatibilidad)
        if not descriptor:
            descriptor = event.get('DESCRIPTOR', '')
        
        descriptor = str(descriptor).strip().upper()
        
        # Soporte para XML: lista de jugadores
        players_list = event.get('players')
        if isinstance(players_list, list) and len(players_list) > 0:
            player = players_list[0]
        else:
            # Intentar obtener jugador desde extra_data['player'] (normalizado)
            player = event.get('extra_data', {}).get('player', '')
            if not player:
                # Fallback a PLAYER en extra_data
                player = event.get('extra_data', {}).get('PLAYER', '')
        
        player = str(player).strip() if player else ''

        # Procesar según el descriptor
        if descriptor == 'NEUTRAL':
            event['extra_data']['YELLOW-CARD'] = player
            event['extra_data']['RED-CARD'] = None
        elif descriptor == 'NEGATIVE':
            event['extra_data']['YELLOW-CARD'] = None
            event['extra_data']['RED-CARD'] = player
        else:
            event['extra_data']['YELLOW-CARD'] = None
            event['extra_data']['RED-CARD'] = None
    else:
        if 'extra_data' not in event:
            event['extra_data'] = {}
        event['extra_data']['YELLOW-CARD'] = None
        event['extra_data']['RED-CARD'] = None
    
    return event

def process_lineout_events(event):
    """Procesa eventos LINEOUT para extraer lanzador y receptor"""
    if 'extra_data' not in event:
        event['extra_data'] = {}

    # Soporte para XML: lista de jugadores en event['players']
    players_list = event.get('players')
    thrower = None
    receiver = None

    if isinstance(players_list, list) and len(players_list) >= 2:
        # Buscar lanzador (T-) y receptor
        thrower_candidates = [p for p in players_list if isinstance(p, str) and p.startswith('T-')]
        receiver_candidates = [p for p in players_list if isinstance(p, str) and not p.startswith('T-')]
        if thrower_candidates:
            thrower = thrower_candidates[0][2:]  # Sin el prefijo T-
        if receiver_candidates:
            receiver = receiver_candidates[0]
        # Guardar ambos en PLAYER sin el prefijo T-
        event['extra_data']['PLAYER'] = [thrower, receiver] if thrower and receiver else [p[2:] if p.startswith('T-') else p for p in players_list]
    else:
        # Soporte para Excel: campos PLAYER y PLAYER_2
        # Intentar obtener el jugador desde extra_data['player'] (normalizado)
        player = event.get('extra_data', {}).get('player', '')
        if not player:
            # Fallback a PLAYER en extra_data
            player = event.get('extra_data', {}).get('PLAYER', '')
        
        player_2 = event.get('extra_data', {}).get('PLAYER_2', '')
        
        # Convertir a string para procesar
        player = str(player).strip() if player else ''
        player_2 = str(player_2).strip() if player_2 else ''
        
        if player.startswith('T-'):
            thrower = player[2:]
            receiver = player_2
        elif player_2.startswith('T-'):
            thrower = player_2[2:]
            receiver = player
        else:
            # Si no hay prefijo T-, el primer jugador es el lanzador por defecto
            thrower = player if player and player.lower() != 'nan' else None
            receiver = player_2 if player_2 and player_2.lower() != 'nan' else None
        
        # Crear lista de jugadores válidos
        players = [p for p in [thrower, receiver] if p and p.lower() != 'nan']
        event['extra_data']['PLAYER'] = players if players else [thrower] if thrower else None

    # Actualizar campos específicos
    event['extra_data']['LINE_THROWER'] = thrower
    event['extra_data']['LINE_RECEIVER'] = receiver

    return event

def process_tackle_events(event):
    """Procesa eventos TACKLE para contar tackles"""
    if event.get('event_type', '').upper() == 'TACKLE':
        if 'extra_data' not in event:
            event['extra_data'] = {}
        # Soporte para XML: lista de jugadores
        players_list = event.get('players')
        if isinstance(players_list, list) and len(players_list) > 0:
            players = [p for p in players_list if p and p.lower() != 'nan']
        else:
            player = str(event.get('extra_data', {}).get('PLAYER', '')).strip() if event.get('extra_data', {}).get('PLAYER') else None
            player_2 = str(event.get('extra_data', {}).get('PLAYER_2', '')).strip() if event.get('extra_data', {}).get('PLAYER_2') else None
            players = [p for p in [player, player_2] if p and p.lower() != 'nan']
        event['extra_data']['PLAYER'] = players[0] if len(players) == 1 else (players if players else None)
        event['extra_data']['Team_Tackle_Count'] = 1
    return event

def consolidate_descriptors(event):
    """Consolida descriptores duplicados en extra_data"""
    if 'extra_data' not in event:
        return event
    
    extra_data = event['extra_data']
    consolidated = {}
    
    for key, value in extra_data.items():
        if isinstance(value, list):
            # Remover duplicados manteniendo orden
            unique_values = []
            for v in value:
                if v not in unique_values and v is not None and str(v).strip() != '':
                    unique_values.append(v)
            
            # Para ciertos campos, permitir múltiples valores (tackles dobles, etc.)
            if key in ['JUGADOR', 'PLAYER', 'ENCUADRE-TACKLE'] and len(unique_values) > 1:
                consolidated[key] = unique_values
            elif len(unique_values) == 1:
                consolidated[key] = unique_values[0]
            elif len(unique_values) > 1:
                # Para otros campos, tomar el primer valor único
                consolidated[key] = unique_values[0]
                print(f"🔍 Consolidando {key}: {value} -> {unique_values[0]}")
        else:
            consolidated[key] = value
    
    event['extra_data'] = consolidated
    return event

def clean_row(row):
    """Limpia evento removiendo valores inválidos"""
    cleaned = {}
    for k, v in row.items():
        if k == 'extra_data':
            if isinstance(v, dict):
                cleaned_extra = {}
                for ek, ev in v.items():
                    if ev is not None and ev != 'undefined':
                        if isinstance(ev, float) and pd.isna(ev):
                            continue
                        if isinstance(ev, list) and len(ev) == 0:
                            continue
                        cleaned_extra[ek] = ev
                cleaned[k] = cleaned_extra
            else:
                cleaned[k] = v
        else:
            if v is not None and v != 'undefined' and (not isinstance(v, list) or len(v) > 0) and (not (isinstance(v, float) and pd.isna(v))):
                cleaned[k] = v
    return cleaned

def calculate_game_time_from_zero_backup(events, match_info=None, profile=None):
    """
    Calcula Game_Time desde cero de forma simple y clara.
    Game_Time es el tiempo acumulado de juego desde el inicio del partido.
    """
    print(f"DEBUG BACKUP: Procesando {len(events)} eventos")
    if events:
        print(f"DEBUG BACKUP: Primer evento: {events[0]}")
    
    events_df = pd.DataFrame(events)
    
    # Buscar eventos de referencia automáticamente
    kick_off_1_ts = None
    end_1_ts = None
    kick_off_2_ts = None
    end_2_ts = None
    
    # Detectar automáticamente los hitos basándose en el primer y segundo KICK OFF
    kick_off_events = []
    end_events = []
    
    for _, row in events_df.iterrows():
        category = row.get('event_type', '').upper()
        
        # Usar clip_start si está disponible, sino timestamp_sec
        clip_start = row.get('extra_data', {}).get('clip_start')
        if clip_start is not None:
            timestamp = float(clip_start)
        else:
            timestamp = float(row.get('timestamp_sec', row.get('SECOND', 0)))
        
        if category in ['KICK OFF', 'KICK-OFF']:
            kick_off_events.append(timestamp)
        elif category == 'END':
            end_events.append(timestamp)
    
    # Ordenar eventos por timestamp
    kick_off_events.sort()
    end_events.sort()
    
    # Asignar hitos basándose en la secuencia temporal
    if len(kick_off_events) >= 1:
        kick_off_1_ts = kick_off_events[0]
    if len(kick_off_events) >= 2:
        kick_off_2_ts = kick_off_events[1]
    
    # Encontrar el primer END después del primer KICK OFF
    if kick_off_1_ts is not None and end_events:
        for end_ts in end_events:
            if end_ts > kick_off_1_ts:
                end_1_ts = end_ts
                break
    
    # Encontrar el primer END después del segundo KICK OFF
    if kick_off_2_ts is not None and end_events:
        for end_ts in end_events:
            if end_ts > kick_off_2_ts:
                end_2_ts = end_ts
                break
    
    print(f"DEBUG BACKUP: Hitos detectados - kick_off_1: {kick_off_1_ts}, end_1: {end_1_ts}, kick_off_2: {kick_off_2_ts}, end_2: {end_2_ts}")
    
    # Calcular duración del primer tiempo
    first_half_duration = 2400  # 40 minutos por defecto
    if kick_off_1_ts is not None and end_1_ts is not None:
        first_half_duration = end_1_ts - kick_off_1_ts
    elif kick_off_1_ts is not None and kick_off_2_ts is not None:
        # Estimar basándose en el segundo kick off (descanso típico de 15 min)
        first_half_duration = kick_off_2_ts - kick_off_1_ts - 900  # Restar 15 min de descanso
    
    print(f"DEBUG BACKUP: Duración del primer tiempo: {first_half_duration}")
    
    # Procesar cada evento
    enriched_events = []
    
    for i, event in enumerate(events):
        event_dict = event.copy()
        
        # Inicializar extra_data si no existe
        if 'extra_data' not in event_dict:
            event_dict['extra_data'] = {}
        
        # Obtener datos del evento
        category = event_dict.get('event_type', '').upper()
        
        # Usar clip_start si está disponible (datos originales del XML), sino timestamp_sec
        clip_start = event_dict.get('extra_data', {}).get('clip_start')
        if clip_start is not None:
            timestamp = float(clip_start)
        else:
            timestamp = float(event_dict.get('timestamp_sec', event_dict.get('SECOND', 0)))
        
        # Detectar período basándose en la secuencia temporal
        detected_period = 1
        if kick_off_2_ts is not None and timestamp >= kick_off_2_ts:
            detected_period = 2
        elif kick_off_1_ts is not None and timestamp >= kick_off_1_ts:
            detected_period = 1
        
        # Calcular Game_Time
        game_time_sec = 0
        
        if category in ['KICK OFF', 'KICK-OFF']:
            if timestamp == kick_off_1_ts:
                # Inicio del primer período
                game_time_sec = 0
            elif timestamp == kick_off_2_ts:
                # Inicio del segundo período
                game_time_sec = first_half_duration
            else:
                # Otros kick offs
                if detected_period == 1:
                    game_time_sec = max(0, timestamp - kick_off_1_ts) if kick_off_1_ts else timestamp
                else:
                    game_time_sec = first_half_duration + (timestamp - kick_off_2_ts) if kick_off_2_ts else first_half_duration
        elif category == 'END':
            if timestamp == end_1_ts:
                # Fin del primer período
                game_time_sec = first_half_duration
            elif timestamp == end_2_ts:
                # Fin del segundo período
                if kick_off_2_ts is not None and end_2_ts is not None:
                    second_half_duration = end_2_ts - kick_off_2_ts
                    game_time_sec = first_half_duration + second_half_duration
                else:
                    game_time_sec = first_half_duration + 2400  # Default
            else:
                # Otros ends
                if detected_period == 1:
                    game_time_sec = max(0, timestamp - kick_off_1_ts) if kick_off_1_ts else timestamp
                else:
                    game_time_sec = first_half_duration + (timestamp - kick_off_2_ts) if kick_off_2_ts else first_half_duration
        else:
            # Eventos normales
            if detected_period == 1:
                if kick_off_1_ts is not None:
                    game_time_sec = max(0, timestamp - kick_off_1_ts)
                else:
                    game_time_sec = timestamp
            else:  # detected_period == 2
                if kick_off_2_ts is not None:
                    second_half_elapsed = timestamp - kick_off_2_ts
                    game_time_sec = first_half_duration + second_half_elapsed
                else:
                    game_time_sec = first_half_duration + (timestamp - (kick_off_1_ts or 0))
        
        # Asegurar que no sea negativo
        game_time_sec = max(0, game_time_sec)
        
        # Formatear tiempos
        game_time_str = seconds_to_mmss(game_time_sec)
        video_time_str = seconds_to_mmss(timestamp)
        time_group = assign_time_group(game_time_sec, first_half_duration)
        
        # Agregar campos calculados
        event_dict['extra_data']['Game_Time'] = game_time_str
        event_dict['extra_data']['TIME(VIDEO)'] = video_time_str
        event_dict['extra_data']['Time_Group'] = time_group
        event_dict['extra_data']['DETECTED_PERIOD'] = detected_period
        
        enriched_events.append(event_dict)
    
    return enriched_events

def calculate_game_time_from_zero(events, match_info=None, profile=None):
    """Calcula Game_Time usando configuración del perfil: manual, category_based o event_based."""
    # Validar que el perfil sea un diccionario válido

    if not profile or not isinstance(profile, dict):
        raise ValueError("El perfil proporcionado no es válido o está vacío.")

    # Obtener configuración de time_mapping
    method = 'event_based'
    time_mapping = {}
    if 'settings' in profile:
        settings = profile['settings']
        time_mapping = settings.get('time_mapping', {})
        method = time_mapping.get('method', method)
    else:
        # Si no hay 'settings', asumir que profile ya son los settings
        time_mapping = profile.get('time_mapping', {})
        method = time_mapping.get('method', method)

    # Los eventos ya están normalizados, usar nombres estándar
    col_time = 'timestamp_sec'
    col_event_type = 'event_type'

    # Obtener configuración de delays
    global_delay = 0
    event_delays = {}
    if 'delays' in time_mapping:
        delays_config = time_mapping['delays']
        global_delay = delays_config.get('global_delay_seconds', 0)
        event_delays = delays_config.get('event_delays', {})


    # Inicializar hitos con valores predeterminados
    kick_off_1_ts = None
    end_1_ts = None
    kick_off_2_ts = None
    end_2_ts = None

    if method == 'manual':
        # Inicializar timestamps para hitos
        manual = time_mapping.get('manual_times', {})
        kick_off_1_ts = manual.get('kick_off_1', 0)
        end_1_ts = manual.get('end_1', 2400)
        kick_off_2_ts = manual.get('kick_off_2', 2700)
        end_2_ts = manual.get('end_2', 4800)
        
        print(f"🔍 DEBUG enricher: method=manual, manual_times={manual}")
        print(f"🔍 DEBUG enricher: kick_off_1_ts={kick_off_1_ts}, end_1_ts={end_1_ts}, kick_off_2_ts={kick_off_2_ts}, end_2_ts={end_2_ts}")
    else:
        # Detectar hitos según categoría o descriptor
        conf = {
            'kick_off_1': time_mapping.get('kick_off_1', {}),
            'end_1': time_mapping.get('end_1', {}),
            'kick_off_2': time_mapping.get('kick_off_2', {}),
            'end_2': time_mapping.get('end_2', {}),
        }
        
        for ev in events:
            cat = ev.get(col_event_type, '').upper()
            extra = ev.get('extra_data', {})
            ts = ev.get(col_time, None)
            if ts is None:
                continue  # Ignorar eventos sin timestamp válido
            
            # Convertir timestamp a float al inicio
            try:
                ts = float(ts)
            except (ValueError, TypeError):
                print(f"WARNING: No se pudo convertir timestamp {ts} a float, saltando evento")
                continue
            
            for key, cfg in conf.items():
                if not cfg:
                    continue
                match_cat = cat == cfg.get('category', '').upper()
                if method == 'category_based' and match_cat:
                    if locals().get(f"{key}_ts") is None:
                        locals()[f"{key}_ts"] = ts
                elif method == 'event_based' and match_cat:
                    desc = cfg.get('descriptor', '')
                    val = cfg.get('descriptor_value', '')
                    if desc and val and str(extra.get(desc, '')).upper() == val.upper():
                        if locals().get(f"{key}_ts") is None:
                            locals()[f"{key}_ts"] = ts
        

    # Validar que al menos kick_off_1_ts esté definido
    if kick_off_1_ts is None:
        print("WARNING: No se detectó kick_off_1_ts, usando fallback")
        # Fallback: usar el timestamp del primer evento como referencia
        first_event_ts = min(ev.get(col_time, 0) for ev in events if ev.get(col_time) is not None)
        kick_off_1_ts = float(first_event_ts) if first_event_ts is not None else 0
    else:
        kick_off_1_ts = float(kick_off_1_ts)
    
    # Asignar valores por defecto si no se detectaron otros hitos
    if end_1_ts is None:
        end_1_ts = kick_off_1_ts + 2400  # 40 minutos después
    else:
        end_1_ts = float(end_1_ts)
    
    if kick_off_2_ts is None:
        kick_off_2_ts = end_1_ts + 900  # 15 minutos de descanso
    else:
        kick_off_2_ts = float(kick_off_2_ts)
    
    if end_2_ts is None:
        end_2_ts = kick_off_2_ts + 2400  # 40 minutos después
    else:
        end_2_ts = float(end_2_ts)

    # Validar duración de los tiempos
    if kick_off_1_ts is not None and end_1_ts is not None:
        first_half_duration = end_1_ts - kick_off_1_ts
    else:
        first_half_duration = 2400  # Valor por defecto

    # Validar hitos manuales
    if method == 'manual':
        if not all([kick_off_1_ts is not None, end_1_ts is not None, kick_off_2_ts is not None, end_2_ts is not None]):
            print(f"ERROR: Hitos manuales incompletos: kick_off_1_ts={kick_off_1_ts}, end_1_ts={end_1_ts}, kick_off_2_ts={kick_off_2_ts}, end_2_ts={end_2_ts}")
            raise ValueError("Los hitos manuales no están completamente definidos en el perfil.")

    # Validar eventos antes de procesar
    for ev in events:
        if col_time not in ev or ev[col_time] is None:
            print(f"WARNING: Evento sin timestamp válido: {ev}")
        if col_event_type not in ev or not ev[col_event_type]:
            print(f"WARNING: Evento sin tipo válido: {ev}")

    # Depuración de períodos detectados

    # Depuración de hitos manuales

    # Iterar eventos para asignar Game_Time, DETECTED_PERIOD y Time_Group
    enriched_events = []
    for i, ev in enumerate(events):
        event_dict = ev.copy()

        # Inicializar extra_data si no existe
        if 'extra_data' not in event_dict:
            event_dict['extra_data'] = {}

        # Obtener datos del evento
        category = event_dict.get(col_event_type, '').upper()
        timestamp = event_dict.get(col_time, None)

        # Validar datos faltantes
        if timestamp is None or not category:
            event_dict['extra_data']['Game_Time'] = "00:00"
            event_dict['extra_data']['DETECTED_PERIOD'] = None
            event_dict['extra_data']['Time_Group'] = "Sin datos"
            enriched_events.append(event_dict)
            continue

        # Convertir timestamp a float para operaciones matemáticas
        try:
            timestamp = float(timestamp)
        except (ValueError, TypeError):
            event_dict['extra_data']['Game_Time'] = "00:00"
            event_dict['extra_data']['DETECTED_PERIOD'] = None
            event_dict['extra_data']['Time_Group'] = "Sin datos"
            enriched_events.append(event_dict)
            continue

        # Aplicar delays ANTES de calcular Game_Time
        event_type = event_dict.get(col_event_type, '').upper()
        delay_to_apply = global_delay
        
        # Verificar si hay delay específico para este tipo de evento
        if event_type in event_delays:
            delay_to_apply += event_delays[event_type]
        
        # Aplicar delay al timestamp antes de calcular Game_Time
        if delay_to_apply != 0:
            timestamp += delay_to_apply
            event_dict.setdefault('extra_data', {})['_delay_applied'] = delay_to_apply
        else:
            event_dict.setdefault('extra_data', {})['_delay_applied'] = 0

        # Detectar período con timestamp ajustado
        detected_period = 1
        if kick_off_2_ts is not None and timestamp >= kick_off_2_ts:
            detected_period = 2
        elif kick_off_1_ts is not None and timestamp >= kick_off_1_ts:
            detected_period = 1

        # Calcular Game_Time con timestamp ajustado
        # Ya no necesitamos validar kick_off_1_ts porque tenemos fallback
        if detected_period == 1:
            game_time_sec = timestamp - kick_off_1_ts
        else:
            game_time_sec = first_half_duration + (timestamp - kick_off_2_ts)

        # Asegurar que Game_Time no sea negativo (clamp to 0)
        game_time_sec = max(0, game_time_sec)

        # Asignar Time_Group
        time_group = assign_time_group(game_time_sec, first_half_duration)

        # Enriquecer evento
        event_dict['extra_data']['Game_Time'] = seconds_to_mmss(game_time_sec)
        event_dict['extra_data']['DETECTED_PERIOD'] = detected_period
        event_dict['extra_data']['Time_Group'] = time_group

        # Mantener timestamp_sec como float para precisión decimal
        event_dict['timestamp_sec'] = timestamp

        # Limpiar evento
        event_dict = clean_row(event_dict)
        enriched_events.append(event_dict)

    return enriched_events


def calculate_try_origin_and_phases(events):
    """
    Calcula el origen y fases de cada try analizando la secuencia de eventos previos.
    
    Args:
        events: Lista de eventos ya normalizados y enriquecidos
        
    Returns:
        Lista de eventos con TRY_ORIGIN y TRY_PHASES añadidos en extra_data
    """
    if not events:
        return events
    
    # Categorías que pueden iniciar una secuencia ofensiva
    origin_categories = ["TURNOVER", "SCRUM", "LINEOUT", "KICKOFF", "PENALTY"]
    
    # Función para detectar si un evento es un try
    def is_try_event(event):
        if event.get('event_type', '').upper() != 'POINTS':
            return False
        
        # Buscar tipo de punto en varios campos
        extra_data = event.get('extra_data', {})
        points_type = (event.get('POINTS') or 
                      extra_data.get('TIPO-PUNTOS') or
                      extra_data.get('TIPO_PUNTOS') or
                      extra_data.get('TIPO-PERDIDA/RECUPERACIN') or  # A veces está mal etiquetado
                      extra_data.get('POINTS_TYPE'))
        
        is_try = points_type and str(points_type).upper() == 'TRY'
        if is_try:
            print(f"🔍 DEBUG: Try detectado en {event.get('timestamp_sec'):.1f}s, team={event.get('team', 'N/A')}")
        return is_try
    
    # Función para encontrar el evento de origen más cercano
    def find_origin_event(try_event, all_events):
        try_time = try_event.get('timestamp_sec', 0)
        try_team = try_event.get('team', '')
        
        # Buscar eventos de origen en ventana de 2 minutos (120 segundos) antes del try
        max_time_window = 120
        
        # Buscar eventos de origen previos
        candidates = []
        for event in all_events:
            event_time = event.get('timestamp_sec', 0)
            time_diff = try_time - event_time
            
            # Solo eventos dentro de la ventana de tiempo
            if time_diff < 0 or time_diff > max_time_window:
                continue
                
            event_type = event.get('event_type', '').upper()
            
            # Buscar eventos de origen (TURNOVER+, SCRUM, LINEOUT, KICK OFF, PENALTY a favor)
            if event_type in origin_categories or event_type in ['TURNOVER+', 'KICK OFF', 'KICKOFF']:
                # Si tenemos info de equipo, verificar que sea del mismo equipo
                if try_team and event.get('team') and event.get('team') != try_team:
                    continue
                candidates.append(event)
        
        if not candidates:
            print(f"⚠️  DEBUG: No se encontró origen para try en {try_time:.1f}s")
            return None
        
        # Retornar el evento más cercano al try
        origin = max(candidates, key=lambda x: x.get('timestamp_sec', 0))
        print(f"✅ DEBUG: Origen encontrado: {origin.get('event_type')} en {origin.get('timestamp_sec'):.1f}s")
        return origin
    
    # Función para contar fases (rucks + 1) entre origen y try
    def count_phases(try_event, origin_event, all_events):
        if not origin_event:
            return 1
        
        try_time = try_event.get('timestamp_sec', 0)
        origin_time = origin_event.get('timestamp_sec', 0)
        try_team = try_event.get('team', '')
        
        # Contar eventos RUCK entre origen y try del mismo equipo
        ruck_count = 0
        for event in all_events:
            event_time = event.get('timestamp_sec', 0)
            if (event.get('event_type', '').upper() == 'RUCK' and
                origin_time < event_time < try_time and
                event.get('team', '') == try_team):
                ruck_count += 1
        
        return ruck_count + 1  # Fases = rucks + 1
    
    # Procesar todos los eventos
    for event in events:
        if is_try_event(event):
            # Encontrar origen
            origin_event = find_origin_event(event, events)
            
            # Calcular fases
            phases = count_phases(event, origin_event, events)
            
            # Añadir datos calculados a extra_data
            if 'extra_data' not in event:
                event['extra_data'] = {}
            
            if origin_event:
                event['extra_data']['TRY_ORIGIN'] = origin_event.get('event_type', '').upper()
                print(f"DEBUG: Try en {event.get('timestamp_sec'):.1f}s - origen: {origin_event.get('event_type')} en {origin_event.get('timestamp_sec'):.1f}s, fases: {phases}")
            else:
                event['extra_data']['TRY_ORIGIN'] = 'UNKNOWN'
                print(f"DEBUG: Try en {event.get('timestamp_sec'):.1f}s - sin origen identificado, fases: {phases}")
            
            event['extra_data']['TRY_PHASES'] = phases
    
    return events


def calculate_break_result(events):
    """
    Calcula el resultado de cada quiebre analizando los eventos posteriores.
    
    Args:
        events: Lista de eventos ya normalizados y enriquecidos
        
    Returns:
        Lista de eventos con BREAK_RESULT añadido en extra_data
    """
    if not events:
        return events
    
    # Función para detectar si un evento es un quiebre
    def is_break_event(event):
        return event.get('event_type', '').upper() == 'BREAK'
    
    # Función para determinar el resultado del quiebre
    def find_break_result(break_event, all_events):
        break_time = break_event.get('timestamp_sec', 0)
        break_team = break_event.get('team', '')
        
        # Ventana de 120 segundos después del quiebre
        max_time_window = 120
        
        # Buscar eventos posteriores
        for event in all_events:
            event_time = event.get('timestamp_sec', 0)
            time_diff = event_time - break_time
            
            # Solo eventos dentro de la ventana de tiempo
            if time_diff <= 0 or time_diff > max_time_window:
                continue
            
            event_type = event.get('event_type', '').upper()
            event_team = event.get('team', '')
            extra_data = event.get('extra_data', {})
            
            # TRY - Puntos anotados (del mismo equipo del quiebre)
            if event_type == 'POINTS':
                points_type = (extra_data.get('TIPO-PUNTOS') or 
                             extra_data.get('TIPO_PUNTOS') or 
                             extra_data.get('POINTS_TYPE') or '').upper()
                if points_type == 'TRY' and event_team == break_team:
                    return 'TRY', time_diff
            
            # PENALTY - Penal concedido (cualquier equipo)
            if event_type == 'PENALTY':
                # Si es penal a favor (del equipo del quiebre)
                if event_team == break_team:
                    return 'PENALTY_FOR', time_diff
                # Si es penal en contra
                elif event_team and event_team != break_team:
                    return 'PENALTY_AGAINST', time_diff
            
            # TURNOVER - Pérdida de posesión
            if event_type in ['TURNOVER-', 'TURNOVER']:
                turnover_type = extra_data.get('TIPO-PERDIDA/RECUPERACION') or extra_data.get('TURNOVER_TYPE') or ''
                # Si es pérdida del equipo del quiebre
                if event_team == break_team:
                    return f'TURNOVER_{turnover_type}', time_diff
            
            # KICK - Patada en juego
            if event_type == 'KICK':
                if event_team == break_team:
                    return 'KICK', time_diff
            
            # GOAL-KICK - Patada a los palos
            if event_type == 'GOAL-KICK':
                if event_team == break_team:
                    return 'GOAL_KICK_ATTEMPT', time_diff
        
        # Si no se encontró resultado específico
        return 'CONTINUES', None
    
    # Procesar todos los eventos BREAK
    for event in events:
        if is_break_event(event):
            # Encontrar resultado
            result, time_to_result = find_break_result(event, events)
            
            # Añadir datos calculados a extra_data
            if 'extra_data' not in event:
                event['extra_data'] = {}
            
            event['extra_data']['BREAK_RESULT'] = result
            if time_to_result:
                event['extra_data']['BREAK_RESULT_TIME'] = round(time_to_result, 1)
            
            print(f"DEBUG: Break en {event.get('timestamp_sec'):.1f}s - resultado: {result}" + 
                  (f" ({time_to_result:.1f}s después)" if time_to_result else ""))
    
    return events


def enrich_events(events, match_info, profile=None):
    """
    Función principal de enriquecimiento.
    Procesa eventos de rugby añadiendo Game_Time, períodos y grupos de tiempo.
    """
    # Usar la función principal que maneja tiempos manuales del perfil
    enriched = calculate_game_time_from_zero(events, match_info, profile)
    
    # Procesar eventos especiales y limpiar
    for event_dict in enriched:
        # Consolidar descriptores duplicados PRIMERO
        event_dict = consolidate_descriptors(event_dict)
        
        # Traducir campos de español a inglés
        event_dict = translate_fields_to_english(event_dict)
        
        # Procesar eventos específicos
        if event_dict.get('event_type') == 'PENALTY':
            event_dict = process_penalty_events(event_dict)
        elif event_dict.get('event_type') == 'LINEOUT':
            event_dict = process_lineout_events(event_dict)
        elif event_dict.get('event_type') == 'TACKLE':
            event_dict = process_tackle_events(event_dict)
        
        # Limpiar evento
        event_dict = clean_row(event_dict)
    
    # Calcular origen y fases de tries DESPUÉS de todo el procesamiento
    print("DEBUG: Calculando origen y fases de tries...")
    enriched = calculate_try_origin_and_phases(enriched)
    
    # Calcular resultado de quiebres
    print("DEBUG: Calculando resultado de quiebres...")
    enriched = calculate_break_result(enriched)
    
    return enriched
