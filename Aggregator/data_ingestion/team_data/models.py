"""
Module: team_data.models
Defines the ORM models for the team_data database, including the TeamInfo model and
a factory function to dynamically create a team’s game log table model.
"""

from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, String, Integer, JSON, ForeignKey

BaseTeam = declarative_base()

class TeamInfo(BaseTeam):
    """
    ORM model for the team_info table.
    
    Stores basic team information as a JSON object.
    """
    __tablename__ = 'team_info'
    
    team_abbr = Column(String(3), primary_key=True)
    team_data = Column(JSON, nullable=False)
    
    def __repr__(self) -> str:
        return f"<TeamInfo(team_abbr={self.team_abbr})>"

def create_team_game_log_model(team_abbr: str):
    """
    Dynamically creates an ORM model class for a team's game log table.
    
    The table name is derived from the team's abbreviation as: {team_abbr}_game_logs.
    The __table_args__ includes 'extend_existing': True to allow redefinition if the table
    is already present in the MetaData.
    
    Args:
        team_abbr (str): The team's abbreviation.
        
    Returns:
        A new ORM model class for the team's game log table.
    """
    tablename = f"{team_abbr}_game_logs"
    
    class TeamGameLog(BaseTeam):
        __tablename__ = tablename
        __table_args__ = {'extend_existing': True}
        team_abbr = Column(String(3), ForeignKey('team_info.team_abbr'), nullable=False)
        season = Column(Integer, primary_key=True)
        week = Column(Integer, primary_key=True)
        season_type = Column(String(10), primary_key=True)
        opponent_team = Column(String(3), primary_key=True)
        offensive_stats = Column(JSON, nullable=True)
        defensive_stats = Column(JSON, nullable=True)
        special_teams = Column(JSON, nullable=True)
        
        def __repr__(self) -> str:
            return f"<TeamGameLog(team_abbr={self.team_abbr}, season={self.season}, week={self.week})>"
    
    return TeamGameLog