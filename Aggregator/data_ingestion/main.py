"""
Main module to orchestrate data ingestion for player_data and team_data databases using nfl-data-py.
"""

from player_data.database import initialize_player_database, is_player_database_populated, get_player_session
from player_data.ingestion import ingest_player_data
from team_data.database import initialize_team_database, is_team_database_populated, get_team_session
from team_data.ingestion import ingest_team_data
from datetime import datetime

def main() -> None:
    """
    Main function to initialize databases and ingest NFL data.
    """
    try:
        player_engine = initialize_player_database()
        player_session = get_player_session(player_engine)

        print("[DEBUG] Initialized player_data database.")
        
        team_engine = initialize_team_database()
        team_session = get_team_session(team_engine)

        print("[DEBUG] Initialized team_data database.")

        if is_player_database_populated(player_session) or is_team_database_populated(team_session):
            print("[ERROR] Database is already populated.")
            return 
        
        current_year = datetime.now().year
        years = list(range(2000, current_year))
        ingest_player_data(years=years, engine=player_engine)
        ingest_team_data(years=years, engine=team_engine)
        
        print("[DEBUG] Data ingestion complete.")
    except Exception as e:
        print(f"[ERROR] An error occurred during ingestion: {str(e)}")

if __name__ == "__main__":
    main()