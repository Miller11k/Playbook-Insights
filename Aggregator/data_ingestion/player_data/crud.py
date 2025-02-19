"""
Module: player_data.crud
Provides CRUD functions for the PlayerBasicInfo model.
"""

from sqlalchemy.orm import Session
from .models import PlayerBasicInfo
from typing import Optional, Dict, Any

def create_player(session: Session, player_id: str, info: Dict[str, Any]) -> PlayerBasicInfo:
    """
    Create a new player record.

    Args:
        session: SQLAlchemy session.
        player_id: Unique identifier for the player.
        info: Dictionary containing player information.

    Returns:
        The created PlayerBasicInfo instance.
    """
    player = PlayerBasicInfo(id=player_id, info=info)
    session.add(player)
    session.commit()
    session.refresh(player)
    return player

def get_player(session: Session, player_id: str) -> Optional[PlayerBasicInfo]:
    """
    Retrieve a player record by player_id.

    Args:
        session: SQLAlchemy session.
        player_id: Unique identifier for the player.

    Returns:
        The PlayerBasicInfo instance if found, else None.
    """
    return session.query(PlayerBasicInfo).filter(PlayerBasicInfo.id == player_id).first()

def update_player(session: Session, player_id: str, new_info: Dict[str, Any]) -> Optional[PlayerBasicInfo]:
    """
    Update an existing player's info.

    Args:
        session: SQLAlchemy session.
        player_id: Unique identifier for the player.
        new_info: Dictionary containing the updated player information.

    Returns:
        The updated PlayerBasicInfo instance if found, else None.
    """
    player = session.query(PlayerBasicInfo).filter(PlayerBasicInfo.id == player_id).first()
    if player:
        player.info = new_info
        session.commit()
        session.refresh(player)
    return player

def delete_player(session: Session, player_id: str) -> bool:
    """
    Delete a player record by player_id.

    Args:
        session: SQLAlchemy session.
        player_id: Unique identifier for the player.

    Returns:
        True if deletion was successful, False otherwise.
    """
    player = session.query(PlayerBasicInfo).filter(PlayerBasicInfo.id == player_id).first()
    if player:
        session.delete(player)
        session.commit()
        return True
    return False