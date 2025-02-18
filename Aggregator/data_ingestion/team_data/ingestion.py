"""
Module: team_data.ingestion
Handles the ingestion of team data using nfl-data-py.
This version aggregates player-level game logs into a single team-level record per game.
"""

import nfl_data_py as nfl
from .database import get_team_session
from .models import TeamInfo, create_team_game_log_model
from team_data.aggregation import aggregate_offensive_stats, aggregate_defensive_stats, merge_team_aggregates
import pandas as pd

def ingest_team_info(session, teams_df):
    """
    Ingests team information into the team_info table.
    
    Args:
        session: SQLAlchemy session for the team_data database.
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

def aggregate_team_game_logs(session, game_logs_df, engine):
    """
    Aggregates player-level game logs into team-level game logs and inserts them
    into dynamically created game log tables.
    
    Args:
        session: SQLAlchemy session for the team_data database.
        game_logs_df (DataFrame): Raw player-level game logs.
        engine: SQLAlchemy engine for the team_data database.
    """
    # Aggregate offensive stats using 'recent_team' as the offensive team.
    off_df = aggregate_offensive_stats(game_logs_df)
    # Aggregate defensive stats using 'opponent_team' as the team on defense.
    def_df = aggregate_defensive_stats(game_logs_df)
    # Merge the two aggregations on the full game key.
    merged = merge_team_aggregates(off_df, def_df)
    
    # Iterate over each aggregated record.
    for idx, row in merged.iterrows():
        team_abbr = row['team_abbr']
        # Dynamically create/get the game log model for this team.
        GameLogModel = create_team_game_log_model(team_abbr)
        GameLogModel.__table__.create(bind=engine, checkfirst=True)
        
        record = {
            "team_abbr": team_abbr,
            "season": int(row['season']),
            "week": int(row['week']),
            "season_type": row['season_type'],
            "opponent_team": row['opponent_team'],
            "offensive_stats": {
                "completions": int(row['completions']),
                "attempts": int(row['attempts']),
                "passing_yards": float(row['passing_yards']),
                "passing_tds": int(row['passing_tds']),
                "carries": int(row['carries']),
                "rushing_yards": float(row['rushing_yards']),
                "rushing_tds": int(row['rushing_tds'])
            },
            "defensive_stats": {
                "passing_yards_allowed": float(row.get('passing_yards_allowed', 0)),
                "rushing_yards_allowed": float(row.get('rushing_yards_allowed', 0)),
                "te_yards_allowed": float(row.get('te_yards_allowed', 0)),
                "wr_yards_allowed": float(row.get('wr_yards_allowed', 0)),
                "rb_receiving_yards_allowed": float(row.get('rb_receiving_yards_allowed', 0)),
                "te_receptions_allowed": float(row.get('te_receptions_allowed', 0)),
                "wr_receptions_allowed": float(row.get('wr_receptions_allowed', 0)),
                "rb_receptions_allowed": float(row.get('rb_receptions_allowed', 0)),
                "carries_allowed": int(row.get('carries_allowed')),
                "sacks": float(row.get('sacks', 0)),
                "interceptions": int(row.get('interceptions', 0))
            },
            "special_teams": {
                "special_teams_tds": int(row.get('special_teams_tds', 0))
            }
        }
        session.merge(GameLogModel(**record))
    session.commit()
    print(f"[DEBUG] Aggregated and ingested {len(merged)} team game log records.")

def ingest_team_data(years=[2022, 2023, 2024], engine=None):
    """
    Main function to ingest team data using nfl-data-py.
    
    Args:
        years (list, optional): List of years to import data for.
        engine: SQLAlchemy engine for the team_data database.
    """
    print("[DEBUG] Importing team descriptions...")
    teams_df = nfl.import_team_desc()
    
    print("[DEBUG] Importing team game logs data...")
    game_logs_df = nfl.import_weekly_data(years)
    
    session = get_team_session(engine)
    # Optionally, ingest team info:
    ingest_team_info(session, teams_df)
    
    aggregate_team_game_logs(session, game_logs_df, engine)