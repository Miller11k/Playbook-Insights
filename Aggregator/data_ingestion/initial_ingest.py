import os
import math
from datetime import datetime
import pandas as pd
import nfl_data_py as nfl
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import insert as pg_insert
from schema import Base, Player, Team, PlayerGameLog


def initialize_database(db_url=None):
    """
    Initializes the database engine using the DATABASE_URL environment variable if not provided.
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
    Loads and cleans the NFL data.
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
    Populates the teams table.
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
    Upserts players into the Player table using PostgreSQL's ON CONFLICT DO UPDATE.
    """
    if rosters_df.empty:
        print("[DEBUG] No player records to upsert.")
        return

    print("[DEBUG] Upserting players")
    player_data = rosters_df[[
        'player_id', 'player_name', 'position', 'team', 'birth_date',
        'height', 'weight', 'college', 'rookie_year', 'entry_year',
        'status', 'jersey_number'
    ]].rename(columns={
        'player_id': 'id',
        'player_name': 'name'
    })
    records = player_data.to_dict(orient='records')

    # Clean numeric and datetime fields.
    for record in records:
        # Clean birth_date
        if 'birth_date' in record:
            if pd.isna(record['birth_date']):
                record['birth_date'] = None
            else:
                record['birth_date'] = pd.to_datetime(record['birth_date']).date()
        # Clean numeric fields
        for field in ['weight', 'rookie_year', 'entry_year', 'jersey_number']:
            if field in record:
                if pd.isna(record[field]) or (isinstance(record[field], float) and math.isnan(record[field])):
                    record[field] = None
                else:
                    record[field] = int(record[field])
        # Convert height to string if valid
        if 'height' in record:
            if pd.isna(record['height']) or (isinstance(record['height'], float) and math.isnan(record['height'])):
                record['height'] = None
            else:
                record['height'] = str(record['height'])

    # Upsert each record.
    for record in records:
        stmt = pg_insert(Player.__table__).values(**record)
        stmt = stmt.on_conflict_do_update(
            index_elements=['id'],
            set_={
                'name': stmt.excluded.name,  # Full name of the player
                'position': stmt.excluded.position,  # Player's position (e.g., QB, WR, RB, TE)
                'team': stmt.excluded.team,  # Current team the player is assigned to
                'birth_date': stmt.excluded.birth_date,  # Date of birth of the player (YYYY-MM-DD)
                'height': stmt.excluded.height,  # Player's height (string format, e.g., "6'2\"")
                'weight': stmt.excluded.weight,  # Player's weight in pounds
                'college': stmt.excluded.college,  # College the player attended
                'rookie_year': stmt.excluded.rookie_year,  # Year the player started as a rookie in the NFL
                'entry_year': stmt.excluded.entry_year,  # Year the player entered the NFL (could differ from rookie year)
                'status': stmt.excluded.status,  # Player's current status (Active, Injured, Free Agent, etc.)
                'jersey_number': stmt.excluded.jersey_number  # Player's jersey number
            }
        )
        session.execute(stmt)
    print(f"[DEBUG] Upserted {len(records)} player records.")


def populate_game_logs(session, game_logs_df):
    """
    Populates the PlayerGameLog table with detailed game logs.
    """
    print("[DEBUG] Populating game logs")
    game_log_records = []
    for _, row in game_logs_df.iterrows():
        log = {
            # Basic Player Info
            'player_id': row['player_id'],  # Unique identifier for the player
            'player_name': row['player_name'],  # Full name of the player
            'player_display_name': row['player_display_name'],  # Display-friendly player name
            'position': row['position'],  # Player's position (e.g., QB, WR, RB, TE)
            'position_group': row['position_group'],  # Position group (e.g., "Offense", "Defense", "Special Teams")
            'headshot_url': row['headshot_url'],  # URL to the player's headshot image
            'recent_team': row['recent_team'],  # Most recent team the player has played for
            'season': int(row['season']),  # Season year of the game log
            'week': int(row['week']),  # Week number in the season
            'season_type': row['season_type'],  # Regular season or postseason
            'opponent_team': row['opponent_team'],  # Opposing team for the game

            # Offensive Stats (Passing)
            'completions': int(row.get('completions', 0)),  # Completed passes by the QB
            'attempts': int(row.get('attempts', 0)),  # Total pass attempts
            'passing_yards': float(row.get('passing_yards', 0)),  # Total passing yards
            'passing_tds': int(row.get('passing_tds', 0)),  # Passing touchdowns
            'interceptions': int(row.get('interceptions', 0)),  # Number of interceptions thrown
            'sacks': float(row.get('sacks', 0)),  # Number of times the QB was sacked
            'sack_yards': float(row.get('sack_yards', 0)),  # Total yards lost due to sacks
            'sack_fumbles': int(row.get('sack_fumbles', 0)),  # Fumbles by the QB while being sacked
            'sack_fumbles_lost': int(row.get('sack_fumbles_lost', 0)),  # Sacked fumbles lost to the defense
            'passing_air_yards': float(row.get('passing_air_yards', 0)),  # Air yards thrown by the QB
            'passing_yards_after_catch': float(row.get('passing_yards_after_catch', 0)),  # Yards gained after a catch
            'passing_first_downs': int(row.get('passing_first_downs', 0)),  # Passes resulting in first downs
            'passing_epa': float(row.get('passing_epa', 0)),  # Expected points added from passing plays
            'passing_2pt_conversions': int(row.get('passing_2pt_conversions', 0)),  # Successful 2-point conversions via passing

            # Offensive Stats (Rushing)
            'carries': int(row.get('carries', 0)),  # Number of rushing attempts
            'rushing_yards': float(row.get('rushing_yards', 0)),  # Total rushing yards gained
            'rushing_tds': int(row.get('rushing_tds', 0)),  # Rushing touchdowns
            'rushing_fumbles': int(row.get('rushing_fumbles', 0)),  # Number of fumbles on rushing plays
            'rushing_fumbles_lost': int(row.get('rushing_fumbles_lost', 0)),  # Fumbles lost to the defense on rushing plays
            'rushing_first_downs': int(row.get('rushing_first_downs', 0)),  # Rushing attempts resulting in first downs
            'rushing_epa': float(row.get('rushing_epa', 0)),  # Expected points added from rushing plays
            'rushing_2pt_conversions': int(row.get('rushing_2pt_conversions', 0)),  # Successful 2-point conversions via rushing

            # Offensive Stats (Receiving)
            'receptions': int(row.get('receptions', 0)),  # Number of completed catches
            'targets': int(row.get('targets', 0)),  # Number of times the player was targeted
            'receiving_yards': float(row.get('receiving_yards', 0)),  # Total receiving yards
            'receiving_tds': int(row.get('receiving_tds', 0)),  # Receiving touchdowns
            'receiving_fumbles': int(row.get('receiving_fumbles', 0)),  # Fumbles on receiving plays
            'receiving_fumbles_lost': int(row.get('receiving_fumbles_lost', 0)),  # Receiving fumbles lost to the defense
            'receiving_air_yards': float(row.get('receiving_air_yards', 0)),  # Air yards gained on receptions
            'receiving_yards_after_catch': float(row.get('receiving_yards_after_catch', 0)),  # Yards gained after making a catch
            'receiving_first_downs': int(row.get('receiving_first_downs', 0)),  # Receptions resulting in first downs
            'receiving_epa': float(row.get('receiving_epa', 0)),  # Expected points added from receiving plays
            'receiving_2pt_conversions': int(row.get('receiving_2pt_conversions', 0)),  # Successful 2-point conversions via receiving

            # Defensive Stats (No defensive stats currently implemented)

            # Classifier Stats (Advanced Analytics)
            'pacr': float(row.get('pacr', 0)),  # Passing Air Conversion Ratio (efficiency of air yards conversion)
            'dakota': float(row.get('dakota', 0)),  # Advanced QB efficiency metric
            'racr': float(row.get('racr', 0)),  # Receiver Air Conversion Ratio (efficiency in converting air yards into receptions)
            'target_share': float(row.get('target_share', 0)),  # Percentage of team's targets received
            'air_yards_share': float(row.get('air_yards_share', 0)),  # Percentage of team's air yards received
            'wopr': float(row.get('wopr', 0)),  # Weighted Opportunity Rating (combines target share and air yards share)

            # Extra Data (Miscellaneous)
            'special_teams_tds': int(row.get('special_teams_tds', 0)),  # Touchdowns scored on special teams plays
            'fantasy_points': float(row.get('fantasy_points', 0)),  # Standard fantasy football points
            'fantasy_points_ppr': float(row.get('fantasy_points_ppr', 0))  # Fantasy points in PPR (Points Per Reception) format
        }
        game_log_records.append(log)

    session.bulk_insert_mappings(PlayerGameLog, game_log_records)
    print(f"[DEBUG] Inserted {len(game_log_records)} game log records.")


def populate_database(engine, years=[2024]):
    """
    Main function to populate the database with teams, players, and game logs.
    """
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        rosters, teams, game_logs = get_clean_data(years)

        # Populate teams
        populate_teams(session, teams)

        # Upsert players
        upsert_players(session, rosters)

        # Populate game logs
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
    engine = initialize_database()  # Uses DATABASE_URL from the environment
    populate_database(engine, years=[2022, 2023, 2024])