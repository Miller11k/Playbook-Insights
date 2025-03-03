"""
Module: team_data.database
Handles the initialization of the team_data database engine and session creation.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.engine import Engine
from .models import BaseTeam, TeamInfo

def is_team_database_populated(session: Session) -> bool:
    """
    Checks if the team database already contains data.

    Args:
        session: SQLAlchemy session.

    Returns:
        bool: True if the database contains records, False otherwise.
    """
    return session.query(TeamInfo).first() is not None

def initialize_team_database(db_url: str = None) -> Engine:
    """
    Initializes the team_data database engine and creates all tables if not already present.
    
    Args:
        db_url (str, optional): The database URL. If None, uses the TEAM_DATABASE_URL environment variable.
        
    Returns:
        engine: The SQLAlchemy engine instance.
        
    Raises:
        ValueError: If the database URL is not provided.
    """
    if not db_url:
        db_url = os.environ.get("TEAM_DATABASE_URL")
        if not db_url:
            raise ValueError("TEAM_DATABASE_URL environment variable is not set.")
    engine = create_engine(db_url)
    BaseTeam.metadata.create_all(engine)
    return engine

def get_team_session(engine: Engine) -> Session:
    """
    Creates and returns a new SQLAlchemy session for the team_data database.
    
    Args:
        engine: The SQLAlchemy engine instance.
        
    Returns:
        session: A new SQLAlchemy session.
    """
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()