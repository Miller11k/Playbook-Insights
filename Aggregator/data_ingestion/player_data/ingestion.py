import math
import pandas as pd
import nfl_data_py as nfl
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session
from sqlalchemy.engine import Engine
from .database import get_player_session
from .models import PlayerBasicInfo, create_player_game_log_model
from utils import clean_date_field, clean_optional_int, clean_optional_float

def extract_bye_weeks(schedule_df: pd.DataFrame) -> dict:
    """
    Extracts bye weeks for each team and season from a schedule DataFrame.
    
    Assumes that schedule_df includes:
      - 'season': the season (e.g., 2022)
      - 'week': the week number of the game
      - 'game_type': indicates game type, where regular season games are "REG"
      - 'home_team' and 'away_team': team abbreviations
    
    Only regular season games are considered. For each season, a team's bye week(s)
    is determined as the week(s) that are missing from its schedule.
    
    Returns:
        A dictionary with keys as (team, season) and values as a sorted list of bye weeks.
    """
    bye_weeks = {}
    
    # Filter to only regular season games.
    reg_df = schedule_df[schedule_df['game_type'] == 'REG']
    
    # Process each season separately.
    for season, season_group in reg_df.groupby('season'):
        # Get the sorted list of weeks in the regular season.
        all_weeks = sorted(season_group['week'].unique())
        
        # Combine home and away teams for this season.
        teams = set(season_group['home_team']).union(set(season_group['away_team']))
        
        # For each team, compute the missing week(s).
        for team in teams:
            team_weeks = set(season_group[season_group['home_team'] == team]['week']).union(
                         set(season_group[season_group['away_team'] == team]['week']))
            missing = sorted(set(all_weeks) - team_weeks)
            bye_weeks[(team, season)] = missing
    return bye_weeks

def ingest_player_basic_info(session: Session, roster_df: pd.DataFrame) -> None:
    """
    Ingests player basic information into the player_basic_info table.

    Args:
        session (Session): SQLAlchemy session for the player_data database.
        roster_df (pd.DataFrame): DataFrame containing player roster information.
    """
    if roster_df.empty:
        print("[DEBUG] No player roster data available.")
        return

    print(f"[DEBUG] Starting to ingest players.")
    roster_df = roster_df.drop_duplicates(subset=['player_id'], keep='last')
    records = []
    for _, row in roster_df.iterrows():
        player_id = row.get('player_id')
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

    session.bulk_insert_mappings(PlayerBasicInfo, records)
    session.commit()
    print(f"[DEBUG] Ingested {len(records)} player basic info records.")


def ingest_player_game_logs(session: Session, game_logs_df: pd.DataFrame, engine: Engine, bye_weeks: dict) -> None:
    """
    Ingests player game log data into dynamically created game log tables.

    Args:
        session (Session): SQLAlchemy session for the player_data database.
        game_logs_df (pd.DataFrame): DataFrame containing player game log data.
        engine (Engine): SQLAlchemy engine for the player_data database (to create dynamic tables).
    """
    if game_logs_df.empty:
        print("[DEBUG] No player game logs data available.")
        return

    print(f"[DEBUG] Starting individual player ingestion")
    print(f"[DEBUG] This usually takes a while")

    # Group game logs by player_id
    grouped = game_logs_df.groupby('player_id')
    for player_id, group in grouped:
        # Fill missing weeks with "void" rows
        group = fill_missing_weeks_for_player(group, bye_weeks)
        group = group.drop_duplicates(
            subset=['season', 'week', 'season_type'],
            keep='last'
        )
        # Dynamically create the model/table for this player
        GameLogModel = create_player_game_log_model(player_id)
        GameLogModel.__table__.create(bind=engine, checkfirst=True)

        # Build records using the helper function create_record
        records = []
        for _, row in group.iterrows():
            records.append(create_record(player_id, row))

        # Bulk insert the player's game log records
        session.bulk_insert_mappings(GameLogModel, records)
        session.commit()

    print(f"[DEBUG] Finished player ingestion")


def create_record(player_id: str, row: pd.Series) -> dict:
    """
    Creates a record (dictionary) for insertion into the player's game log table.
    If all numeric fields in any of the stats dictionaries are zero or None,
    that dictionary is set to None. This record is used by bulk_insert_mappings.

    Args:
        player_id (str): The unique player ID (used in the table name).
        row (pd.Series): A single row from the player's game log data.
    
    Returns:
        dict: A record suitable for insertion into the player's game log table.
    """
    def zero_dict_to_null(d: dict) -> dict:
        """
        Returns None if all values in the dictionary are 0 or None;
        otherwise returns the dictionary unchanged.
        """
        if all(v in (0, None) for v in d.values()):
            return None
        return d

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

    # Convert all-zero dictionaries to None.
    passing_stats = zero_dict_to_null(passing_stats)
    rushing_stats = zero_dict_to_null(rushing_stats)
    receiving_stats = zero_dict_to_null(receiving_stats)
    extra_data = zero_dict_to_null(extra_data)

    return {
        "player_id": player_id,
        "season": int(row['season']),
        "week": int(row['week']),
        "season_type": row['season_type'],
        "opponent_team": row.get('opponent_team'),
        "team": row.get('recent_team'),
        "passing_stats": passing_stats,
        "rushing_stats": rushing_stats,
        "receiving_stats": receiving_stats,
        "extra_data": extra_data
    }


def fill_missing_weeks_for_player(player_df: pd.DataFrame, bye_weeks: dict) -> pd.DataFrame:
    """
    For a given player's game logs, identifies missing weeks within each (season, season_type, recent_team)
    grouping and inserts a 'void' row for each missing game. A void row has zeros for numeric stats
    and None for non-numeric fields.

    Args:
        player_df (pd.DataFrame): A subset of game_logs_df for a single player.

    Returns:
        pd.DataFrame: The player_df with missing weeks filled in.
    """
    all_rows = []
    for (season_val, season_type_val, recent_team_val), subdf in player_df.groupby(['season', 'season_type', 'recent_team']):
        present_weeks = subdf['week'].unique()
        min_week, max_week = present_weeks.min(), present_weeks.max()
        all_rows.append(subdf)
        full_range = range(min_week, max_week + 1)
        missing = sorted(set(full_range) - set(present_weeks))
        # Build key for bye week lookup
        bye_key = (recent_team_val, season_val)
        for w in missing:
            void_row = {
                'player_id': subdf['player_id'].iloc[0],
                'season': season_val,
                'season_type': season_type_val,
                'week': w,
                # Set opponent_team to 'BYE' if the bye_weeks dictionary indicates a bye this week.
                'opponent_team': 'BYE' if bye_key in bye_weeks and w in bye_weeks[bye_key] else None,
                'recent_team': recent_team_val,
                # All numeric stats set to zero.
                'completions': 0,
                'attempts': 0,
                'passing_yards': 0,
                'passing_tds': 0,
                'interceptions': 0,
                'sacks': 0,
                'sack_yards': 0,
                'sack_fumbles': 0,
                'sack_fumbles_lost': 0,
                'passing_air_yards': 0,
                'passing_yards_after_catch': 0,
                'passing_first_downs': 0,
                'passing_epa': 0,
                'passing_2pt_conversions': 0,
                'carries': 0,
                'rushing_yards': 0,
                'rushing_tds': 0,
                'rushing_fumbles': 0,
                'rushing_fumbles_lost': 0,
                'rushing_first_downs': 0,
                'rushing_epa': 0,
                'rushing_2pt_conversions': 0,
                'receptions': 0,
                'targets': 0,
                'receiving_yards': 0,
                'receiving_tds': 0,
                'receiving_fumbles': 0,
                'receiving_fumbles_lost': 0,
                'receiving_air_yards': 0,
                'receiving_yards_after_catch': 0,
                'receiving_first_downs': 0,
                'receiving_epa': 0,
                'receiving_2pt_conversions': 0,
                'special_teams_tds': 0,
            }
            all_rows.append(pd.DataFrame([void_row]))
    return pd.concat(all_rows, ignore_index=True) if all_rows else player_df



def ingest_player_data(years: list = [2022, 2023, 2024], engine: Engine = None) -> None:
    """
    Main function to ingest player data using the nfl-data-py library.
    Imports player rosters and game log data, then processes and ingests the data
    into the player_data database.

    Args:
        years (list, optional): List of years for which to import data.
        engine (Engine, optional): SQLAlchemy engine for the player_data database.
    """
    print("[DEBUG] Importing player roster data...")
    roster_df = nfl.import_seasonal_rosters(years)
    roster_df = nfl.clean_nfl_data(roster_df)

    print("[DEBUG] Importing player game log data...")
    game_logs_df = nfl.import_weekly_data(years)

    print("[DEBUG] Importing schedule data for bye week info...")
    schedule_df = nfl.import_schedules(years)
    bye_weeks = extract_bye_weeks(schedule_df)

    session = get_player_session(engine)
    ingest_player_basic_info(session, roster_df)
    ingest_player_game_logs(session, game_logs_df, engine, bye_weeks)