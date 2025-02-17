"""
Module: team_data.ingestion
Handles the ingestion of team data into the team_data database using the nfl-data-py library.
"""

import nfl_data_py as nfl
from sqlalchemy.dialects.postgresql import insert as pg_insert
from .database import get_team_session
from .models import TeamInfo, create_team_game_log_model
from utils import clean_optional_int, clean_optional_float

def ingest_team_info(session, teams_df):
    """
    Ingests team information into the team_info table.
    
    Args:
        session: SQLAlchemy session for team_data database.
        teams_df (DataFrame): DataFrame containing team information.
    """
    if teams_df.empty:
        print("[DEBUG] No team data available.")
        return
    
    records = []
    for _, row in teams_df.iterrows():
        team_abbr = row.get('team_abbr')
        team_data = {
            "team_name": row.get('team_name'),
            "team_color": row.get('team_color'),
            "team_color2": row.get('team_color2'),
            "team_logo": row.get('team_logo_wikipedia') or row.get('team_logo')
        }
        records.append({
            "team_abbr": team_abbr,
            "team_data": team_data
        })
    
    for record in records:
        session.merge(TeamInfo(**record))
    session.commit()
    print(f"[DEBUG] Ingested {len(records)} team info records.")

def ingest_team_game_logs(session, game_logs_df, engine):
    """
    Ingests team game log data into dynamically created game log tables.
    
    Args:
        session: SQLAlchemy session for team_data database.
        game_logs_df (DataFrame): DataFrame containing team game log data.
        engine: SQLAlchemy engine for team_data database.
    """
    if game_logs_df.empty:
        print("[DEBUG] No team game logs data available.")
        return
    
    # Group game logs by team_abbr to create separate tables per team
    grouped = game_logs_df.groupby('recent_team')
    for team_abbr, group in grouped:
        # Dynamically create/get the game log model for this team
        GameLogModel = create_team_game_log_model(team_abbr)
        # Create the table if it does not exist
        GameLogModel.__table__.create(bind=engine, checkfirst=True)
        
        records = []
        for _, row in group.iterrows():
            offensive_stats = {
                "completions": clean_optional_int(row.get('completions', 0)),
                "attempts": clean_optional_int(row.get('attempts', 0)),
                "passing_yards": clean_optional_float(row.get('passing_yards', 0)),
                "passing_tds": clean_optional_int(row.get('passing_tds', 0)),
                "carries": clean_optional_int(row.get('carries', 0)),
                "rushing_yards": clean_optional_float(row.get('rushing_yards', 0)),
                "rushing_tds": clean_optional_int(row.get('rushing_tds', 0))
            }
            defensive_stats = {
                "passing_yards_allowed": clean_optional_float(row.get('passing_yards_allowed', 0)),
                "rushing_yards_allowed": clean_optional_float(row.get('rushing_yards_allowed', 0)),
                "te_yards_allowed": clean_optional_float(row.get('te_yards_allowed', 0)),
                "wr_yards_allowed": clean_optional_float(row.get('wr_yards_allowed', 0)),
                "rb_receiving_yards_allowed": clean_optional_float(row.get('rb_receiving_yards_allowed', 0)),
                "sacks": clean_optional_float(row.get('sacks', 0)),
                "interceptions": clean_optional_int(row.get('interceptions', 0))
            }
            special_teams = {
                "special_teams_tds": clean_optional_int(row.get('special_teams_tds', 0))
            }
            record = {
                "team_abbr": team_abbr,
                "season": int(row.get('season')),
                "week": int(row.get('week')),
                "season_type": row.get('season_type'),
                "opponent_team": row.get('opponent_team'),
                "offensive_stats": offensive_stats,
                "defensive_stats": defensive_stats,
                "special_teams": special_teams
            }
            records.append(record)
        session.bulk_insert_mappings(GameLogModel, records)
        session.commit()
        print(f"[DEBUG] Ingested {len(records)} game logs for team {team_abbr}.")

def ingest_team_data(years=[2022, 2023, 2024], engine=None):
    """
    Main function to ingest team data using the nfl-data-py library.
    
    Args:
        years (list, optional): List of years to import data for.
        engine: SQLAlchemy engine for the team_data database.
    """
    print("[DEBUG] Importing team descriptions...")
    teams_df = nfl.import_team_desc()
    
    print("[DEBUG] Importing team game logs data...")
    game_logs_df = nfl.import_weekly_data(years)
    
    session = get_team_session(engine)
    # ingest_team_info(session, teams_df)
    ingest_team_game_logs(session, game_logs_df, engine)