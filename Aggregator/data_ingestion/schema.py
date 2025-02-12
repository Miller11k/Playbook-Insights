from sqlalchemy import create_engine, Column, Integer, String, Float, Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

# This class represents a player in the database.
class Player(Base):
    __tablename__ = 'players'
    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    position = Column(String(5))
    team = Column(String(3))
    birth_date = Column(Date)
    height = Column(String(10))
    weight = Column(Integer)
    college = Column(String(100))
    entry_year = Column(Integer)
    rookie_year = Column(Integer)
    status = Column(String(50))
    jersey_number = Column(Integer)

    game_logs = relationship("PlayerGameLog", back_populates="player", cascade="all, delete-orphan")
    # (seasonal_stats relationship omitted for brevity)

# This class represents a team.
class Team(Base):
    __tablename__ = 'teams'
    team_abbr = Column(String(3), primary_key=True)
    team_name = Column(String(50))
    team_color = Column(String(7))
    team_color2 = Column(String(7))
    team_logo = Column(String(200))

# This class represents the game logs for players.
class PlayerGameLog(Base):
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
    
    # Offensive Stats
    completions = Column(Integer, default=0)
    attempts = Column(Integer, default=0)
    passing_yards = Column(Float, default=0)
    passing_tds = Column(Integer, default=0)
    interceptions = Column(Integer, default=0)
    sacks = Column(Float, default=0)
    sack_yards = Column(Float, default=0)
    sack_fumbles = Column(Integer, default=0)
    sack_fumbles_lost = Column(Integer, default=0)
    passing_air_yards = Column(Float, default=0)
    passing_yards_after_catch = Column(Float, default=0)
    passing_first_downs = Column(Integer, default=0)
    passing_epa = Column(Float, default=0)
    passing_2pt_conversions = Column(Integer, default=0)
    pacr = Column(Float, default=0)
    dakota = Column(Float, default=0)
    carries = Column(Integer, default=0)
    rushing_yards = Column(Float, default=0)
    rushing_tds = Column(Integer, default=0)
    rushing_fumbles = Column(Integer, default=0)
    rushing_fumbles_lost = Column(Integer, default=0)
    rushing_first_downs = Column(Integer, default=0)
    rushing_epa = Column(Float, default=0)
    rushing_2pt_conversions = Column(Integer, default=0)
    receptions = Column(Integer, default=0)
    targets = Column(Integer, default=0)
    receiving_yards = Column(Float, default=0)
    receiving_tds = Column(Integer, default=0)
    receiving_fumbles = Column(Integer, default=0)
    receiving_fumbles_lost = Column(Integer, default=0)
    receiving_air_yards = Column(Float, default=0)
    receiving_yards_after_catch = Column(Float, default=0)
    receiving_first_downs = Column(Integer, default=0)
    receiving_epa = Column(Float, default=0)
    receiving_2pt_conversions = Column(Integer, default=0)
    racr = Column(Float, default=0)
    target_share = Column(Float, default=0)
    air_yards_share = Column(Float, default=0)
    wopr = Column(Float, default=0)
    special_teams_tds = Column(Integer, default=0)
    fantasy_points = Column(Float, default=0)
    fantasy_points_ppr = Column(Float, default=0)
    
    player = relationship("Player", back_populates="game_logs")