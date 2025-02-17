"""
Module: player_data.ingestion
Handles the ingestion of player data into the player_data database using the nfl-data-py library.
"""

import math
import pandas as pd
import nfl_data_py as nfl
from sqlalchemy.dialects.postgresql import insert as pg_insert
from .database import get_player_session
from .models import PlayerBasicInfo, create_player_game_log_model
from utils import clean_date_field, clean_optional_int, clean_optional_float

def ingest_player_basic_info(session, roster_df):
    """
    Ingests player basic information into the player_basic_info table.
    
    Args:
        session: SQLAlchemy session for player_data database.
        roster_df (DataFrame): DataFrame containing player roster information.
    """
    if roster_df.empty:
        print("[DEBUG] No player roster data available.")
        return

    records = []
    for _, row in roster_df.iterrows():
        player_id = row.get('player_id')
        # Build the info JSON structure as defined in the schema
        info = {
            "name": row.get('player_name'),
            "position": row.get('position'),
            "birth_date": str(clean_date_field(row.get('birth_date'))) if row.get('birth_date') is not None else None,
            "team": row.get('team'),
            "rookie_year": clean_optional_int(row.get('rookie_year')),
            "entry_year": clean_optional_int(row.get('entry_year')),
            "status": row.get('status'),
            "jersey_number": clean_optional_int(row.get('jersey_number'))
        }
        records.append({
            "id": player_id,
            "info": info
        })
    
    # Using session.merge allows upserting the record
    for record in records:
        session.merge(PlayerBasicInfo(**record))
    session.commit()
    print(f"[DEBUG] Ingested {len(records)} player basic info records.")

def ingest_player_game_logs(session, game_logs_df, engine):
    """
    Ingests player game log data into dynamically created game log tables.
    
    Args:
        session: SQLAlchemy session for player_data database.
        game_logs_df (DataFrame): DataFrame containing player game log data.
        engine: SQLAlchemy engine for player_data database (to create dynamic tables).
    """
    if game_logs_df.empty:
        print("[DEBUG] No player game logs data available.")
        return
    print(f"[DEBUG] Starting individual player ingestion")
    print(f"[DEBUG] This usually takes a minute or 2")
    # Group game logs by player_id to create separate tables per player
    grouped = game_logs_df.groupby('player_id')
    for player_id, group in grouped:
        # Dynamically create/get the game log model for this player
        GameLogModel = create_player_game_log_model(player_id)
        # Create the table in the database if not already present
        GameLogModel.__table__.create(bind=engine, checkfirst=True)
        
        records = []
        for _, row in group.iterrows():
            # Build basic_info JSON structure for the game log
            basic_info = {
                "player_name": row.get('player_name'),
                "player_display_name": row.get('player_display_name'),
                "position": row.get('position'),
                "position_group": row.get('position_group'),
                "headshot_url": row.get('headshot_url'),
                "recent_team": row.get('recent_team')
            }
            # Build JSON stats for passing, rushing, receiving and extra data
            passing_stats = {
                "completions": clean_optional_int(row.get('completions', 0)),
                "attempts": clean_optional_int(row.get('attempts', 0)),
                "passing_yards": clean_optional_float(row.get('passing_yards', 0)),
                "passing_tds": clean_optional_int(row.get('passing_tds', 0)),
                "interceptions": clean_optional_int(row.get('interceptions', 0)),
                "sacks": clean_optional_float(row.get('sacks', 0)),
                "sack_yards": clean_optional_float(row.get('sack_yards', 0)),
                "sack_fumbles": clean_optional_int(row.get('sack_fumbles', 0)),
                "sack_fumbles_lost": clean_optional_int(row.get('sack_fumbles_lost', 0)),
                "passing_air_yards": clean_optional_float(row.get('passing_air_yards', 0)),
                "passing_yards_after_catch": clean_optional_float(row.get('passing_yards_after_catch', 0)),
                "passing_first_downs": clean_optional_int(row.get('passing_first_downs', 0)),
                "passing_epa": clean_optional_float(row.get('passing_epa', 0)),
                "passing_2pt_conversions": clean_optional_int(row.get('passing_2pt_conversions', 0))
            }
            rushing_stats = {
                "carries": clean_optional_int(row.get('carries', 0)),
                "rushing_yards": clean_optional_float(row.get('rushing_yards', 0)),
                "rushing_tds": clean_optional_int(row.get('rushing_tds', 0)),
                "rushing_fumbles": clean_optional_int(row.get('rushing_fumbles', 0)),
                "rushing_fumbles_lost": clean_optional_int(row.get('rushing_fumbles_lost', 0)),
                "rushing_first_downs": clean_optional_int(row.get('rushing_first_downs', 0)),
                "rushing_epa": clean_optional_float(row.get('rushing_epa', 0)),
                "rushing_2pt_conversions": clean_optional_int(row.get('rushing_2pt_conversions', 0))
            }
            receiving_stats = {
                "receptions": clean_optional_int(row.get('receptions', 0)),
                "targets": clean_optional_int(row.get('targets', 0)),
                "receiving_yards": clean_optional_float(row.get('receiving_yards', 0)),
                "receiving_tds": clean_optional_int(row.get('receiving_tds', 0)),
                "receiving_fumbles": clean_optional_int(row.get('receiving_fumbles', 0)),
                "receiving_fumbles_lost": clean_optional_int(row.get('receiving_fumbles_lost', 0)),
                "receiving_air_yards": clean_optional_float(row.get('receiving_air_yards', 0)),
                "receiving_yards_after_catch": clean_optional_float(row.get('receiving_yards_after_catch', 0)),
                "receiving_first_downs": clean_optional_int(row.get('receiving_first_downs', 0)),
                "receiving_epa": clean_optional_float(row.get('receiving_epa', 0)),
                "receiving_2pt_conversions": clean_optional_int(row.get('receiving_2pt_conversions', 0))
            }
            extra_data = {
                "special_teams_tds": clean_optional_int(row.get('special_teams_tds', 0))
            }
            record = {
                "player_id": player_id,
                "season": int(row.get('season')),
                "week": int(row.get('week')),
                "season_type": row.get('season_type'),
                "opponent_team": row.get('opponent_team'),
                "basic_info": basic_info,
                "passing_stats": passing_stats,
                "rushing_stats": rushing_stats,
                "receiving_stats": receiving_stats,
                "extra_data": extra_data
            }
            records.append(record)
        # Bulk insert the game log records for the player
        session.bulk_insert_mappings(GameLogModel, records)
        session.commit()
    print(f"[DEBUG] Finished player ingestion")

def ingest_player_data(years=[2022, 2023, 2024], engine=None):
    """
    Main function to ingest player data using the nfl-data-py library.
    
    Args:
        years (list, optional): List of years to import data for.
        engine: SQLAlchemy engine for the player_data database.
    """
    # Import and clean player roster and game logs using nfl-data-py
    print("[DEBUG] Importing player roster data...")
    roster_df = nfl.import_seasonal_rosters(years)
    roster_df = nfl.clean_nfl_data(roster_df)
    
    print("[DEBUG] Importing player game log data...")
    game_logs_df = nfl.import_weekly_data(years)
    
    # Get a session from the engine and run ingestion steps
    session = get_player_session(engine)
    ingest_player_basic_info(session, roster_df)
    ingest_player_game_logs(session, game_logs_df, engine)