from sqlalchemy import create_engine, Column, Integer, String, Float, Date, ForeignKey, UniqueConstraint, JSON
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class Player(Base):
    """
    Represents a player in the database.
    """
    __tablename__ = 'players'
    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    position = Column(String(5))
    team = Column(String(3))
    birth_date = Column(Date)
    entry_year = Column(Integer)
    rookie_year = Column(Integer)
    status = Column(String(50))
    jersey_number = Column(Integer)

    game_logs = relationship("PlayerGameLog", back_populates="player", cascade="all, delete-orphan")


class Team(Base):
    """
    Represents a team in the database.
    """
    __tablename__ = 'teams'
    team_abbr = Column(String(3), primary_key=True)
    team_name = Column(String(50))
    team_color = Column(String(7))
    team_color2 = Column(String(7))
    team_logo = Column(String(200))


class PlayerGameLog(Base):
    """
    Represents the game logs for players, with grouped JSON columns for various stats.
    """
    __tablename__ = 'player_game_logs'
    __table_args__ = (
        UniqueConstraint(
            'player_id', 'season', 'week', 'season_type', 'opponent_team',
            name='uix_player_game_logs_composite'
        ),
    )
    
    id = Column(Integer, primary_key=True)
    player_id = Column(String(50), ForeignKey('players.id'))
    player_name = Column(String(100))
    player_display_name = Column(String(150))
    position = Column(String(10))
    position_group = Column(String(10))
    headshot_url = Column(String(250))
    recent_team = Column(String(3))
    season = Column(Integer)
    week = Column(Integer)
    season_type = Column(String(10))
    opponent_team = Column(String(3))
    
    # Grouped stats stored as JSON for better organization and reduced table width.
    passing_stats = Column(JSON)
    rushing_stats = Column(JSON)
    receiving_stats = Column(JSON)
    extra_data = Column(JSON)
    
    player = relationship("Player", back_populates="game_logs")