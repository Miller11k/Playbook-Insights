import nfl_data_py as nfl
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert as pg_insert

from .database import get_team_session
from .models import TeamInfo, create_team_game_log_model
from team_data.aggregation import aggregate_offensive_stats, aggregate_defensive_stats, merge_team_aggregates


def ingest_team_info(session: Session, teams_df: pd.DataFrame):
    """
    Ingests team information into the team_info table, using a bulk insert with
    'ON CONFLICT DO NOTHING' to skip duplicates if they already exist in the DB.
    
    Args:
        session: SQLAlchemy session for team_data database.
        teams_df (DataFrame): DataFrame containing team information.
    """
    if teams_df.empty:
        print("[DEBUG] No team data available.")
        return
    
    # 1. Deduplicate on team_abbr so we only have one row per team in the DataFrame
    teams_df = teams_df.drop_duplicates(subset=['team_abbr'], keep='last')
    print(f"[DEBUG] Inserting {len(teams_df)} unique team records into team_info.")
    
    # 2. Build a list of dicts for bulk insert
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

    # 3. Use PostgreSQL insert with on_conflict_do_nothing so we skip duplicates
    stmt = pg_insert(TeamInfo).values(records)
    # The primary key is team_abbr, so we specify it as the index_elements:
    stmt = stmt.on_conflict_do_nothing(index_elements=['team_abbr'])
    
    session.execute(stmt)
    session.commit()
    print(f"[DEBUG] Insert attempted for {len(records)} teams; duplicates were skipped if present.")


def aggregate_team_game_logs(session: Session, game_logs_df: pd.DataFrame, engine):
    """
    Aggregates player-level game logs into team-level records and inserts them
    into dynamically created game log tables. If the DB truly is empty, we'll
    get no conflicts, but if it isn't empty, you may also want to use 'on conflict'
    logic here or truncate the tables beforehand.
    """
    off_df = aggregate_offensive_stats(game_logs_df)
    def_df = aggregate_defensive_stats(game_logs_df)
    merged = merge_team_aggregates(off_df, def_df)

    if merged.empty:
        print("[DEBUG] No aggregated team data available.")
        return

    grouped = merged.groupby('team_abbr')
    team_count = 0

    for team_abbr, group in grouped:
        team_count += 1
        print(f"[DEBUG] Inserting team logs for {team_abbr} (team {team_count}/{len(grouped)}).")

        # Optionally deduplicate each team's aggregated data
        group = group.drop_duplicates(
            subset=['season', 'week', 'season_type', 'opponent_team'],
            keep='last'
        )

        GameLogModel = create_team_game_log_model(team_abbr)
        GameLogModel.__table__.create(bind=engine, checkfirst=True)

        records = []
        for _, row in group.iterrows():
            records.append({
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
                    "carries_allowed": int(row.get('carries_allowed', 0)),
                    "sacks": float(row.get('sacks', 0)),
                    "interceptions": int(row.get('interceptions', 0))
                },
                "special_teams": {
                    "special_teams_tds": int(row.get('special_teams_tds', 0))
                }
            })

        # If the table may not be empty, you can do one of:
        # 1. TRUNCATE the table first if you truly want fresh data only.
        # 2. Use "on_conflict_do_nothing" or an upsert approach if you want to skip or update duplicates.
        # For a first-time ingest on an empty table, a simple bulk_insert_mappings is fine.

        session.bulk_insert_mappings(GameLogModel, records)
        session.commit()

    print(f"[DEBUG] Aggregated and ingested {len(merged)} team game log records in bulk.")


def ingest_team_data(years=[2022, 2023, 2024], engine=None):
    """
    Main function to ingest team data using nfl-data-py.
    """
    print("[DEBUG] Importing team descriptions...")
    teams_df = nfl.import_team_desc()
    
    print("[DEBUG] Importing team game logs data...")
    game_logs_df = nfl.import_weekly_data(years)
    
    session = get_team_session(engine)
    
    # Bulk insert team info (deduplicating on team_abbr, skipping if already exists)
    ingest_team_info(session, teams_df)
    
    # Aggregate logs to team logs, then bulk insert for each team
    aggregate_team_game_logs(session, game_logs_df, engine)