import pandas as pd
import nfl_data_py as nfl
from sqlalchemy.orm import Session
from sqlalchemy.engine import Engine

from .database import get_team_session
from .models import TeamInfo, create_team_game_log_model
from team_data.aggregation import aggregate_offensive_stats, aggregate_defensive_stats, merge_team_aggregates
from team_data.ingestion import fill_missing_bye_weeks_for_team, compute_game_result

def update_team_game_logs(engine: Engine, years: list):
    """
    Update team game logs by comparing new aggregated data from nfl-data-py with existing records.
    For each team, missing game logs are inserted.
    
    Args:
        engine (Engine): SQLAlchemy engine for the team_data database.
        years (list): List of seasons to update.
    """
    print("[DEBUG] Updating team game logs...")
    new_game_logs_df = nfl.import_weekly_data(years)
    schedules_df = nfl.import_schedules(years)
    
    # Aggregate offensive and defensive stats and merge into a single DataFrame
    off_df = aggregate_offensive_stats(new_game_logs_df)
    def_df = aggregate_defensive_stats(new_game_logs_df)
    merged = merge_team_aggregates(off_df, def_df)
    
    if merged.empty:
        print("[DEBUG] No new team game log data available.")
        return
    
    # Remove duplicates and fill in bye weeks as in ingestion
    merged = merged.drop_duplicates(
        subset=['season', 'week', 'season_type', 'opponent_team'], keep='last'
    )
    merged = fill_missing_bye_weeks_for_team(merged)
    merged = merged.sort_values(['season', 'week'])
    
    session = get_team_session(engine)
    teams = merged['team_abbr'].unique()
    print(f"[DEBUG] Found {len(teams)} teams to update.")
    
    for team_abbr in teams:
        team_group = merged[merged['team_abbr'] == team_abbr]
        
        # Dynamically create the model for the team's game log table and ensure the table exists
        GameLogModel = create_team_game_log_model(team_abbr)
        GameLogModel.__table__.create(bind=engine, checkfirst=True)
        
        # Query existing game logs for this team
        existing_logs = session.query(GameLogModel).all()
        existing_keys = {(log.season, log.week, log.season_type, log.opponent_team) for log in existing_logs}
        
        new_records = []
        current_season = None
        wins = 0
        losses = 0
        ties = 0
        count = 0
        for _, row in team_group.iterrows():
            key = (int(row['season']), int(row['week']), row['season_type'], row['opponent_team'])
            if key not in existing_keys:
                # Compute the game result (win/loss/tie) using schedule data
                game_result, current_season, wins, losses, ties = compute_game_result(
                    row, team_abbr, schedules_df, current_season, wins, losses, ties
                )
                record = {
                    "team_abbr": team_abbr,
                    "season": int(row['season']),
                    "week": int(row['week']),
                    "season_type": row['season_type'],
                    "opponent_team": row['opponent_team'],
                    "game_result": game_result,
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
                        "carries_allowed": int(row.get('carries_allowed', 0)),
                        "sacks": float(row.get('sacks', 0)),
                        "interceptions": int(row.get('interceptions', 0))
                    },
                    "special_teams": {
                        "special_teams_tds": int(row.get('special_teams_tds', 0))
                    },
                }
                new_records.append(record)
        
        if new_records:
            count += 1
            print(f"[DEBUG] Inserting {len(new_records)} new game log(s) for team {team_abbr}.")
            session.bulk_insert_mappings(GameLogModel, new_records)
            session.commit()
    print(f"[DEBUG] Team game logs update complete, updated {count} teams.")