import os
import math
from datetime import datetime
import pandas as pd
import nfl_data_py as nfl
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import insert as pg_insert
from schema import Base, Player, Team, PlayerGameLog

# --------------------------
# Helper Functions for Cleaning Data
# --------------------------
def clean_date_field(value):
    """
    Clean a date field and convert it to a date object or return None if invalid.
    
    Args:
        value: The input date value.
        
    Returns:
        A date object if valid, otherwise None.
    """
    if pd.isna(value):
        return None
    return pd.to_datetime(value).date()

def clean_optional_int(value):
    """
    Clean a numeric field and convert it to an integer, or return None if invalid.
    
    Args:
        value: The numeric value to clean.
        
    Returns:
        An integer value if valid, otherwise None.
    """
    if pd.isna(value) or (isinstance(value, float) and math.isnan(value)):
        return None
    return int(value)

def clean_optional_str(value):
    """
    Clean a field and convert it to a string, or return None if invalid.
    
    Args:
        value: The value to clean.
        
    Returns:
        A string representation of the value if valid, otherwise None.
    """
    if pd.isna(value) or (isinstance(value, float) and math.isnan(value)):
        return None
    return str(value)

def clean_optional_float(value):
    """
    Clean a numeric field intended to be a float. If the value is NaN or missing, return None.
    
    Args:
        value: The numeric value to clean.
        
    Returns:
        A float value if valid, otherwise None.
    """
    if pd.isna(value) or (isinstance(value, float) and math.isnan(value)):
        return None
    return float(value)

# --------------------------
# Helper Functions for Building Game Log Data Groups
# --------------------------
def build_basic_info(row):
    """
    Build a dictionary for basic player game log information.
    
    Args:
        row: A row from the game logs DataFrame.
        
    Returns:
        A dictionary containing basic game log info.
    """
    return {
        'player_id': row['player_id'],
        'player_name': row['player_name'],
        'player_display_name': row['player_display_name'],
        'position': row['position'],
        'position_group': row['position_group'],
        'headshot_url': row['headshot_url'],
        'recent_team': row['recent_team'],
        'season': int(row['season']),
        'week': int(row['week']),
        'season_type': row['season_type'],
        'opponent_team': row['opponent_team']
    }

def build_passing_stats(row):
    """
    Build a dictionary for passing statistics.
    
    Args:
        row: A row from the game logs DataFrame.
        
    Returns:
        A dictionary containing passing statistics.
    """
    return {
        'completions': int(row.get('completions', 0)),
        'attempts': int(row.get('attempts', 0)),
        'passing_yards': clean_optional_float(row.get('passing_yards', 0)),
        'passing_tds': int(row.get('passing_tds', 0)),
        'interceptions': int(row.get('interceptions', 0)),
        'sacks': clean_optional_float(row.get('sacks', 0)),
        'sack_yards': clean_optional_float(row.get('sack_yards', 0)),
        'sack_fumbles': int(row.get('sack_fumbles', 0)),
        'sack_fumbles_lost': int(row.get('sack_fumbles_lost', 0)),
        'passing_air_yards': clean_optional_float(row.get('passing_air_yards', 0)),
        'passing_yards_after_catch': clean_optional_float(row.get('passing_yards_after_catch', 0)),
        'passing_first_downs': int(row.get('passing_first_downs', 0)),
        'passing_epa': clean_optional_float(row.get('passing_epa', 0)),
        'passing_2pt_conversions': int(row.get('passing_2pt_conversions', 0))
    }

def build_rushing_stats(row):
    """
    Build a dictionary for rushing statistics.
    
    Args:
        row: A row from the game logs DataFrame.
        
    Returns:
        A dictionary containing rushing statistics.
    """
    return {
        'carries': int(row.get('carries', 0)),
        'rushing_yards': clean_optional_float(row.get('rushing_yards', 0)),
        'rushing_tds': int(row.get('rushing_tds', 0)),
        'rushing_fumbles': int(row.get('rushing_fumbles', 0)),
        'rushing_fumbles_lost': int(row.get('rushing_fumbles_lost', 0)),
        'rushing_first_downs': int(row.get('rushing_first_downs', 0)),
        'rushing_epa': clean_optional_float(row.get('rushing_epa', 0)),
        'rushing_2pt_conversions': int(row.get('rushing_2pt_conversions', 0))
    }

def build_receiving_stats(row):
    """
    Build a dictionary for receiving statistics.
    
    Args:
        row: A row from the game logs DataFrame.
        
    Returns:
        A dictionary containing receiving statistics.
    """
    return {
        'receptions': int(row.get('receptions', 0)),
        'targets': int(row.get('targets', 0)),
        'receiving_yards': clean_optional_float(row.get('receiving_yards', 0)),
        'receiving_tds': int(row.get('receiving_tds', 0)),
        'receiving_fumbles': int(row.get('receiving_fumbles', 0)),
        'receiving_fumbles_lost': int(row.get('receiving_fumbles_lost', 0)),
        'receiving_air_yards': clean_optional_float(row.get('receiving_air_yards', 0)),
        'receiving_yards_after_catch': clean_optional_float(row.get('receiving_yards_after_catch', 0)),
        'receiving_first_downs': int(row.get('receiving_first_downs', 0)),
        'receiving_epa': clean_optional_float(row.get('receiving_epa', 0)),
        'receiving_2pt_conversions': int(row.get('receiving_2pt_conversions', 0))
    }


def build_extra_data(row):
    """
    Build a dictionary for extra miscellaneous data.
    
    Args:
        row: A row from the game logs DataFrame.
        
    Returns:
        A dictionary containing extra data.
    """
    return {
        'special_teams_tds': int(row.get('special_teams_tds', 0))
    }

# --------------------------
# Main Database Functions
# --------------------------
def initialize_database(db_url=None):
    """
    Initializes the database engine using the DATABASE_URL environment variable if not provided.
    
    Args:
        db_url (str): The database URL. If None, will attempt to read from the DATABASE_URL environment variable.
    
    Returns:
        engine: The SQLAlchemy engine instance.
    
    Raises:
        ValueError: If the DATABASE_URL is not set.
    """
    if not db_url:
        db_url = os.environ.get("DATABASE_URL")
        if not db_url:
            raise ValueError("DATABASE_URL environment variable is not set.")
    print(f"[DEBUG] Initializing database with URL: {db_url}")
    engine = create_engine(db_url)
    Base.metadata.create_all(engine)
    return engine

def get_clean_data(years):
    """
    Loads and cleans NFL data for the given years.
    
    Args:
        years (list): List of years to import data for.
    
    Returns:
        tuple: A tuple containing cleaned rosters, teams, and game logs DataFrames.
    """
    print("[DEBUG] Importing seasonal rosters")
    roster = nfl.import_seasonal_rosters(years)
    roster_clean = nfl.clean_nfl_data(roster)

    print("[DEBUG] Importing team descriptions")
    teams = nfl.import_team_desc()

    print("[DEBUG] Importing weekly game logs")
    game_logs = nfl.import_weekly_data(years)

    return roster_clean, teams, game_logs

def populate_teams(session, teams_df):
    """
    Populates the teams table in the database.
    
    Args:
        session: The active SQLAlchemy session.
        teams_df (DataFrame): DataFrame containing team information.
    """
    print("[DEBUG] Populating teams")
    team_records = teams_df.rename(columns={
        'team_abbr': 'team_abbr',
        'team_name': 'team_name',
        'team_color': 'team_color',
        'team_color2': 'team_color2',
        'team_logo_wikipedia': 'team_logo'
    }).to_dict(orient='records')

    session.bulk_insert_mappings(Team, team_records)
    print(f"[DEBUG] Inserted {len(team_records)} team records.")

def upsert_players(session, rosters_df):
    """
    Upserts players into the Player table using a bulk operation with PostgreSQL's ON CONFLICT DO UPDATE.
    
    Args:
        session: The active SQLAlchemy session.
        rosters_df (DataFrame): DataFrame containing player roster information.
    """
    if rosters_df.empty:
        print("[DEBUG] No player records to upsert.")
        return

    print("[DEBUG] Upserting players")
    player_data = rosters_df[[
        'player_id', 'birth_date', 'player_name', 'position', 'team', 'rookie_year', 'entry_year',
        'status', 'jersey_number'
    ]].rename(columns={
        'player_id': 'id',
        'player_name': 'name'
    })
    records = player_data.to_dict(orient='records')

    # Clean the data fields using helper functions.
    for record in records:
        if 'birth_date' in record:
            record['birth_date'] = clean_date_field(record['birth_date'])
        for field in ['rookie_year', 'entry_year', 'jersey_number']:
            if field in record:
                record[field] = clean_optional_int(record[field])

    # Build a bulk upsert statement using PostgreSQL's ON CONFLICT DO UPDATE.
    stmt = pg_insert(Player.__table__).on_conflict_do_update(
        index_elements=['id'],
        set_={
            'name': pg_insert(Player.__table__).excluded.name,
            'position': pg_insert(Player.__table__).excluded.position,
            'birth_date': pg_insert(Player.__table__).excluded.birth_date,
            'team': pg_insert(Player.__table__).excluded.team,
            'rookie_year': pg_insert(Player.__table__).excluded.rookie_year,
            'entry_year': pg_insert(Player.__table__).excluded.entry_year,
            'status': pg_insert(Player.__table__).excluded.status,
            'jersey_number': pg_insert(Player.__table__).excluded.jersey_number
        }
    )
    session.execute(stmt, records)
    print(f"[DEBUG] Upserted {len(records)} player records.")

def populate_game_logs(session, game_logs_df):
    """
    Populates the PlayerGameLog table with detailed game logs, organizing statistics into grouped JSON fields.
    
    Args:
        session: The active SQLAlchemy session.
        game_logs_df (DataFrame): DataFrame containing game log information.
    """
    print("[DEBUG] Populating game logs")
    game_log_records = []
    for _, row in game_logs_df.iterrows():
        # Build the record in grouped JSON format using helper functions.
        log = build_basic_info(row)
        log['passing_stats'] = build_passing_stats(row)
        log['rushing_stats'] = build_rushing_stats(row)
        log['receiving_stats'] = build_receiving_stats(row)
        log['extra_data'] = build_extra_data(row)
        game_log_records.append(log)

    session.bulk_insert_mappings(PlayerGameLog, game_log_records)
    print(f"[DEBUG] Inserted {len(game_log_records)} game log records.")

def populate_database(engine, years=[2024]):
    """
    Main function to populate the database with teams, players, and game logs.
    
    Args:
        engine: The SQLAlchemy engine instance.
        years (list): List of years for which to import data.
    """
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        rosters, teams, game_logs = get_clean_data(years)

        # Populate teams.
        populate_teams(session, teams)

        # Upsert players.
        upsert_players(session, rosters)

        # Populate game logs.
        populate_game_logs(session, game_logs)

        session.commit()
        print("[DEBUG] Database population complete.")
    except Exception as e:
        session.rollback()
        print(f"[ERROR] Error occurred: {str(e)}")
        raise e
    finally:
        session.close()

if __name__ == "__main__":
    engine = initialize_database()  # Uses DATABASE_URL from the environment.
    populate_database(engine, years=[2022, 2023, 2024])