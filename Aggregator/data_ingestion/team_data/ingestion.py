import nfl_data_py as nfl
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy.engine import Engine
from sqlalchemy.dialects.postgresql import insert as pg_insert

from .database import get_team_session
from .models import TeamInfo, create_team_game_log_model
from team_data.aggregation import aggregate_offensive_stats, aggregate_defensive_stats, merge_team_aggregates


def ingest_team_info(session: Session, teams_df: pd.DataFrame) -> None:
    """
    Ingests team information into the team_info table using a bulk insert with
    'ON CONFLICT DO NOTHING' to skip duplicates if they already exist in the database.

    Args:
        session (Session): SQLAlchemy session for the team_data database.
        teams_df (pd.DataFrame): DataFrame containing team information.
    """
    if teams_df.empty:
        print("[DEBUG] No team data available.")
        return

    teams_df = teams_df.drop_duplicates(subset=['team_abbr'], keep='last')
    print(f"[DEBUG] Inserting {len(teams_df)} unique team records into team_info.")

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

    stmt = pg_insert(TeamInfo).values(records)
    stmt = stmt.on_conflict_do_nothing(index_elements=['team_abbr'])
    session.execute(stmt)
    session.commit()
    print(f"[DEBUG] Insert attempted for {len(records)} teams; duplicates were skipped if present.")


def fill_missing_bye_weeks_for_team(team_df: pd.DataFrame) -> pd.DataFrame:
    """
    For each (season, season_type) subset where season_type is 'REG', fill missing weeks with a 'BYE' row.
    A bye week row is created with opponent_team set to 'BYE' and all statistical columns zeroed.

    Args:
        team_df (pd.DataFrame): DataFrame containing team game log data.

    Returns:
        pd.DataFrame: Updated DataFrame with bye-week rows appended.
    """
    all_rows = []
    # Group by season and season_type to fill missing weeks per season.
    for (season_val, season_type_val), subdf in team_df.groupby(['season', 'season_type']):
        if season_type_val != "REG":
            all_rows.append(subdf)
            continue

        present_weeks = subdf['week'].unique()
        full_weeks = range(1, 19) if season_val >= 2021 else range(1, 18)
        missing_weeks = sorted(set(full_weeks) - set(present_weeks))
        all_rows.append(subdf)  # Append existing rows.

        for w in missing_weeks:
            bye_row = {
                'team_abbr': subdf['team_abbr'].iloc[0],
                'season': season_val,
                'season_type': season_type_val,
                'week': w,
                'opponent_team': 'BYE',
                # Offensive stats set to zero.
                'completions': 0,
                'attempts': 0,
                'passing_yards': 0.0,
                'passing_tds': 0,
                'carries': 0,
                'rushing_yards': 0.0,
                'rushing_tds': 0,
                # Defensive stats set to zero.
                'passing_yards_allowed': 0.0,
                'rushing_yards_allowed': 0.0,
                'te_yards_allowed': 0.0,
                'wr_yards_allowed': 0.0,
                'rb_receiving_yards_allowed': 0.0,
                'te_receptions_allowed': 0.0,
                'wr_receptions_allowed': 0.0,
                'rb_receptions_allowed': 0.0,
                'carries_allowed': 0,
                'sacks': 0.0,
                'interceptions': 0,
                # Special teams stats set to zero.
                'special_teams_tds': 0
            }
            all_rows.append(pd.DataFrame([bye_row]))

    if len(all_rows) == 1:
        return team_df
    return pd.concat(all_rows, ignore_index=True)


def lookup_scores(row: pd.Series, team_abbr: str, schedules_df: pd.DataFrame) -> (object, object):
    """
    Looks up the schedule row for the given game log row and returns the team and opponent scores.

    Args:
        row (pd.Series): A row from the game logs DataFrame.
        team_abbr (str): The team's abbreviation.
        schedules_df (pd.DataFrame): DataFrame containing schedule data.

    Returns:
        tuple: (team_score, opponent_score) if found; otherwise, (None, None).
    """
    sched_rows = schedules_df[
        (schedules_df['season'] == row['season']) &
        (schedules_df['week'] == row['week']) &
        (
            ((schedules_df['home_team'] == team_abbr) & (schedules_df['away_team'] == row['opponent_team'])) |
            ((schedules_df['away_team'] == team_abbr) & (schedules_df['home_team'] == row['opponent_team']))
        )
    ]
    if sched_rows.empty:
        return None, None

    sched_row = sched_rows.iloc[0]
    if sched_row['home_team'] == team_abbr:
        return sched_row['home_score'], sched_row['away_score']
    else:
        return sched_row['away_score'], sched_row['home_score']


def compute_game_result(row: pd.Series, team_abbr: str, schedules_df: pd.DataFrame,
                        current_season: int, wins: int, losses: int, ties: int) -> (object, int, int, int, int):
    """
    Computes the game result for a given team game log row. It determines the team's score, the opponent's score,
    and updates the cumulative season record.

    Args:
        row (pd.Series): A row from the game logs DataFrame.
        team_abbr (str): The team's abbreviation.
        schedules_df (pd.DataFrame): DataFrame containing schedule data.
        current_season (int): The current season being processed.
        wins (int): The cumulative wins so far.
        losses (int): The cumulative losses so far.

    Returns:
        tuple:
            game_result (str or dict): "BYE" if a bye week; otherwise, a dict with game scores and cumulative record.
            current_season (int): Updated season value.
            wins (int): Updated wins count.
            losses (int): Updated losses count.
    """
    # For bye weeks, no game result is computed.
    if row['opponent_team'] == 'BYE':
        return "BYE", current_season, wins, losses, ties

    team_score, opponent_score = lookup_scores(row, team_abbr, schedules_df)

    if team_score is not None and opponent_score is not None:
        # Cast scores to native Python int to ensure JSON serializability.
        team_score = int(team_score)
        opponent_score = int(opponent_score)
        # Reset season record if processing a new season.
        if current_season is None or current_season != int(row['season']):
            current_season = int(row['season'])
            wins = 0
            losses = 0
            ties = 0

        # Determine win or loss for the game.
        if team_score > opponent_score:
            wins += 1
        elif team_score < opponent_score:
            losses += 1
        else:
            ties+=1 

        record_str = f"{wins}-{losses}" if not ties else f"{wins}-{losses}-{ties}"
        game_result = {
            "team_score": team_score,
            "opponent_score": opponent_score,
            "record": record_str
        }
    else:
        game_result = {
            "team_score": None,
            "opponent_score": None,
            "record": None
        }
    return game_result, current_season, wins, losses, ties


def aggregate_team_game_logs(session: Session, game_logs_df: pd.DataFrame,
                             schedules_df: pd.DataFrame, engine: Engine) -> None:
    """
    Aggregates player-level game logs into team-level records, computes game results by merging schedule data,
    and inserts the records into dynamically created game log tables.

    Args:
        session (Session): SQLAlchemy session for the team_data database.
        game_logs_df (pd.DataFrame): DataFrame containing game logs.
        schedules_df (pd.DataFrame): DataFrame containing schedule information.
        engine (Engine): SQLAlchemy engine for database operations.
    """
    # Aggregate offensive and defensive statistics, then merge.
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

        group = group.drop_duplicates(
            subset=['season', 'week', 'season_type', 'opponent_team'],
            keep='last'
        )
        # Fill in missing bye weeks and sort records.
        group = fill_missing_bye_weeks_for_team(group)
        group = group.sort_values(['season', 'week'])

        # Create or get the dynamic game log model for the team and ensure the table exists.
        GameLogModel = create_team_game_log_model(team_abbr)
        GameLogModel.__table__.create(bind=engine, checkfirst=True)

        records = []
        current_season = None
        wins = 0
        losses = 0
        ties = 0


        for _, row in group.iterrows():
            # Compute game result and update the cumulative season record.
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
            records.append(record)

        session.bulk_insert_mappings(GameLogModel, records)
        session.commit()

    print(f"[DEBUG] Aggregated and ingested {len(merged)} team game log records in bulk.")


def ingest_team_data(years: list = [2022, 2023, 2024], engine: Engine = None) -> None:
    """
    Main function to ingest team data using nfl-data-py. This function imports team descriptions,
    game logs, and schedules, then processes and ingests the data into the team_data database.

    Args:
        years (list, optional): List of seasons for which to ingest data. Defaults to [2022, 2023, 2024].
        engine (Engine, optional): SQLAlchemy engine for database operations. Defaults to None.
    """
    print("[DEBUG] Importing team descriptions...")
    teams_df = nfl.import_team_desc()

    print("[DEBUG] Importing team game logs data...")
    game_logs_df = nfl.import_weekly_data(years)

    print("[DEBUG] Importing game schedules...")
    schedules_df = nfl.import_schedules(years)

    session = get_team_session(engine)

    ingest_team_info(session, teams_df)
    aggregate_team_game_logs(session, game_logs_df, schedules_df, engine)