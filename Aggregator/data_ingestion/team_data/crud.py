"""
Module: team_data.crud
Provides CRUD functions for the TeamInfo model.
"""

from sqlalchemy.orm import Session
from .models import TeamInfo
from typing import Optional, Dict, Any

def create_team(session: Session, team_abbr: str, team_data: Dict[str, Any]) -> TeamInfo:
    """
    Create a new team record.

    Args:
        session: SQLAlchemy session.
        team_abbr: The team's abbreviation.
        team_data: Dictionary containing team information.

    Returns:
        The created TeamInfo instance.
    """
    team = TeamInfo(team_abbr=team_abbr, team_data=team_data)
    session.add(team)
    session.commit()
    session.refresh(team)
    return team

def get_team(session: Session, team_abbr: str) -> Optional[TeamInfo]:
    """
    Retrieve a team record by team abbreviation.

    Args:
        session: SQLAlchemy session.
        team_abbr: The team's abbreviation.

    Returns:
        The TeamInfo instance if found, else None.
    """
    return session.query(TeamInfo).filter(TeamInfo.team_abbr == team_abbr).first()

def update_team(session: Session, team_abbr: str, new_team_data: Dict[str, Any]) -> Optional[TeamInfo]:
    """
    Update an existing team's information.

    Args:
        session: SQLAlchemy session.
        team_abbr: The team's abbreviation.
        new_team_data: Dictionary containing the updated team information.

    Returns:
        The updated TeamInfo instance if found, else None.
    """
    team = session.query(TeamInfo).filter(TeamInfo.team_abbr == team_abbr).first()
    if team:
        team.team_data = new_team_data
        session.commit()
        session.refresh(team)
    return team

def delete_team(session: Session, team_abbr: str) -> bool:
    """
    Delete a team record by team abbreviation.

    Args:
        session: SQLAlchemy session.
        team_abbr: The team's abbreviation.

    Returns:
        True if deletion was successful, False otherwise.
    """
    team = session.query(TeamInfo).filter(TeamInfo.team_abbr == team_abbr).first()
    if team:
        session.delete(team)
        session.commit()
        return True
    return False