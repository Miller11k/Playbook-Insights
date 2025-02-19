"""
Module: player_data.database
Handles the initialization of the player_data database engine and session creation.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.engine import Engine
from .models import BasePlayer

def initialize_player_database(db_url: str = None) -> Engine:
    """
    Initializes the player_data database engine and creates all tables if not already present.
    
    Args:
        db_url (str, optional): The database URL. If None, uses the PLAYER_DATABASE_URL environment variable.
        
    Returns:
        engine: The SQLAlchemy engine instance.
        
    Raises:
        ValueError: If the database URL is not provided.
    """
    if not db_url:
        db_url = os.environ.get("PLAYER_DATABASE_URL")
        if not db_url:
            raise ValueError("PLAYER_DATABASE_URL environment variable is not set.")
    engine = create_engine(db_url)
    BasePlayer.metadata.create_all(engine)
    return engine

def get_player_session(engine: Engine) -> Session:
    """
    Creates and returns a new SQLAlchemy session for the player_data database.
    
    Args:
        engine: The SQLAlchemy engine instance.
        
    Returns:
        session: A new SQLAlchemy session.
    """
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()