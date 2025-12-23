from sqlalchemy import Column, Integer, String, Date, ForeignKey, Float, Text, JSON, Boolean, DateTime
from sqlalchemy.orm import relationship
from db import Base
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime


class Club(Base):
    __tablename__ = "clubs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    logo_url = Column(Text)
    primary_color = Column(String(20))
    secondary_color = Column(String(20))
    accent_color = Column(String(20))
    landing_copy = Column(Text)

    teams = relationship("Team", back_populates="club")
    memberships = relationship("ClubMembership", back_populates="club")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String(255), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100))
    is_active = Column(Boolean, default=True)
    is_email_verified = Column(Boolean, default=False)
    global_role = Column(String(50), default="user")  # super_admin | user
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    memberships = relationship("ClubMembership", back_populates="user")

    def to_safe_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "full_name": self.full_name,
            "is_active": self.is_active,
            "is_email_verified": self.is_email_verified,
            "global_role": self.global_role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class ClubMembership(Base):
    __tablename__ = "club_memberships"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    club_id = Column(Integer, ForeignKey("clubs.id"), nullable=False)
    role = Column(String(50), default="viewer")  # club_admin | analyst | viewer
    can_edit = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="memberships")
    club = relationship("Club", back_populates="memberships")
    team_scopes = relationship("MembershipTeamScope", back_populates="membership", cascade="all, delete-orphan")
    match_scopes = relationship("MembershipMatchScope", back_populates="membership", cascade="all, delete-orphan")

    def to_scope_dict(self):
        return {
            "id": self.id,
            "club_id": self.club_id,
            "role": self.role,
            "can_edit": self.can_edit,
            "team_ids": [t.team_id for t in self.team_scopes],
            "match_ids": [m.match_id for m in self.match_scopes],
            "is_active": self.is_active,
        }


class MembershipTeamScope(Base):
    __tablename__ = "membership_team_scopes"

    id = Column(Integer, primary_key=True)
    membership_id = Column(Integer, ForeignKey("club_memberships.id"), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)

    membership = relationship("ClubMembership", back_populates="team_scopes")
    team = relationship("Team")


class MembershipMatchScope(Base):
    __tablename__ = "membership_match_scopes"

    id = Column(Integer, primary_key=True)
    membership_id = Column(Integer, ForeignKey("club_memberships.id"), nullable=False)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False)

    membership = relationship("ClubMembership", back_populates="match_scopes")
    match = relationship("Match")


class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String(255), unique=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    consumed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String(255), unique=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    consumed_at = Column(DateTime)
    requested_from_ip = Column(String(64))
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True)
    club_id = Column(Integer, ForeignKey("clubs.id"))
    name = Column(String(100))
    category = Column(String(50))
    season = Column(String(20))

    club = relationship("Club", back_populates="teams")
    players = relationship("TeamPlayer", back_populates="team")
    matches = relationship("Match", back_populates="team")


class Player(Base):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True)
    full_name = Column(String(100))
    birth_date = Column(Date)
    nationality = Column(String(50))
    preferred_position = Column(String(50))

    team_links = relationship("TeamPlayer", back_populates="player")
    events = relationship("Event", back_populates="player")


class TeamPlayer(Base):
    __tablename__ = "teamplayers"

    id = Column(Integer, primary_key=True)
    team_id = Column(Integer, ForeignKey("teams.id"))
    player_id = Column(Integer, ForeignKey("players.id"))
    shirt_number = Column(Integer)
    active_since = Column(Date)
    active_until = Column(Date)

    team = relationship("Team", back_populates="players")
    player = relationship("Player", back_populates="team_links")


class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True)
    team_id = Column(Integer, ForeignKey("teams.id"))
    opponent_name = Column(String(100))
    date = Column(Date)
    location = Column(String(100))
    video_url = Column(Text)
    competition = Column(String(100))
    round = Column(String(50))
    field = Column(String(100))
    rain = Column(String(20))
    muddy = Column(String(20))
    wind_1p = Column(String(20))
    wind_2p = Column(String(20))
    referee = Column(String(100))
    result = Column(String)
    import_profile_name = Column(String(100))
    
    # Tiempos manuales en segundos
    kick_off_1_seconds = Column(Integer)
    end_1_seconds = Column(Integer)
    kick_off_2_seconds = Column(Integer)
    end_2_seconds = Column(Integer)
    
    # Delays para ajustar timestamps (en segundos)
    global_delay_seconds = Column(Integer, default=0)  # Delay global aplicado a todos los eventos
    event_delays = Column(JSONB)  # Delays específicos por tipo de evento, ej: {"TACKLE": -2, "PASS": 1}

    team = relationship("Team", back_populates="matches")
    events = relationship("Event", back_populates="match")

    def to_dict(self):
        return {
            "id": self.id,
            "team_id": self.team_id,
            "opponent_name": self.opponent_name,
            "date": self.date.isoformat() if self.date is not None else None,
            "location": self.location,
            "competition": self.competition,
            "round": self.round,
            "result": self.result,
            "video_url": self.video_url,
            "import_profile_name": self.import_profile_name,
            "kick_off_1_seconds": self.kick_off_1_seconds,
            "end_1_seconds": self.end_1_seconds,
            "kick_off_2_seconds": self.kick_off_2_seconds,
            "end_2_seconds": self.end_2_seconds,
            "global_delay_seconds": self.global_delay_seconds,
            "event_delays": self.event_delays,
        }


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True)
    match_id = Column(Integer, ForeignKey("matches.id"))
    player_id = Column(Integer, ForeignKey("players.id"))
    event_type = Column(String(50))
    timestamp_sec = Column(Float)
    x = Column(Float)
    y = Column(Float)
    tag = Column(Text)
    phase = Column(String(50))
    origin = Column(String(50))
    outcome = Column(String(50))
    notes = Column(Text)
    extra_data = Column(JSONB)  # <- esta es la línea clave

    match = relationship("Match", back_populates="events")
    player = relationship("Player", back_populates="events")

    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}


class EventType(Base):
    __tablename__ = "eventtypes"

    id = Column(Integer, primary_key=True)
    code = Column(String(50), unique=True)
    group_name = Column(String(50))
    icon = Column(String(10))
    color = Column(String(20))

    translations = relationship("EventTypeTranslation", back_populates="event_type")


class EventTypeTranslation(Base):
    __tablename__ = "eventtypetranslations"

    id = Column(Integer, primary_key=True)
    event_type_id = Column(Integer, ForeignKey("eventtypes.id"))
    lang_code = Column(String(5))
    label = Column(String(50))
    synonyms = Column(Text)

    event_type = relationship("EventType", back_populates="translations")


class ImportProfile(Base):
    __tablename__ = "import_profiles"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(255))
    settings = Column(JSON)  # Contiene: hoja de eventos, columnas clave, etc.


class CategoryMapping(Base):
    """
    Mapeo múltiple de términos externos a categorías internas.
    Ejemplo: ['Tackle', 'Placcaggio', 'Placaje'] → 'TACKLE'
    """
    __tablename__ = "category_mappings"

    id = Column(Integer, primary_key=True)
    source_term = Column(String(100), nullable=False, index=True)  # Término en archivo (ej: "Placcaggio")
    target_category = Column(String(50), nullable=False, index=True)  # Categoría estándar (ej: "TACKLE")
    mapping_type = Column(String(20), default='event_type')  # 'event_type', 'descriptor', 'zone', etc.
    language = Column(String(10))  # 'es', 'it', 'en', 'fr', etc.
    priority = Column(Integer, default=0)  # Para resolver conflictos (mayor prioridad gana)
    notes = Column(Text)  # Notas explicativas
    
    def to_dict(self):
        return {
            "id": self.id,
            "source_term": self.source_term,
            "target_category": self.target_category,
            "mapping_type": self.mapping_type,
            "language": self.language,
            "priority": self.priority,
            "notes": self.notes
        }
