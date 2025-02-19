"""
Module: player_data.models
Defines the ORM models for the player_data database, including the PlayerBasicInfo model and
a factory function to dynamically create a player’s game log table model.
"""

from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, String, Integer, JSON, ForeignKeyConstraint

BasePlayer = declarative_base()

class PlayerBasicInfo(BasePlayer):
    """
    ORM model for the player_basic_info table.
    
    Stores basic information about a player as a JSON object.
    """
    __tablename__ = 'player_basic_info'
    
    id = Column(String(50), primary_key=True)
    info = Column(JSON, nullable=False)
    
    def __repr__(self) -> str:
        return f"<PlayerBasicInfo(id={self.id})>"

def create_player_game_log_model(player_id: str):
    """
    Dynamically creates an ORM model class for a player's game log table.
    
    The table name is derived from the player's ID as: {player_id}_game_logs.
    
    Args:
        player_id (str): The player's unique identifier.
        
    Returns:
        A new ORM model class for the player's game log table.
    """
    tablename = f"{player_id}_game_logs"
    
    class PlayerGameLog(BasePlayer):
        __tablename__ = tablename
        player_id = Column(String(50), nullable=False)
        season = Column(Integer, primary_key=True)
        week = Column(Integer, primary_key=True)
        season_type = Column(String(10), primary_key=True)
        opponent_team = Column(String(3), primary_key=True)
        basic_info = Column(JSON, nullable=False)
        passing_stats = Column(JSON, nullable=True)
        rushing_stats = Column(JSON, nullable=True)
        receiving_stats = Column(JSON, nullable=True)
        extra_data = Column(JSON, nullable=True)
        
        __table_args__ = (
            ForeignKeyConstraint(['player_id'], ['player_basic_info.id']),
        )
        
        def __repr__(self) -> str:
            return f"<PlayerGameLog(player_id={self.player_id}, season={self.season}, week={self.week})>"
    
    return PlayerGameLog