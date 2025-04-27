from player_data.database import initialize_player_database, is_player_database_populated, get_player_session
from player_data.ingestion import ingest_player_data
from team_data.database import initialize_team_database, is_team_database_populated, get_team_session
from team_data.ingestion import ingest_team_data
from player_data.updater import update_player_game_logs
from team_data.updater import update_team_game_logs
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
        
        current_year = datetime.now().year

        if is_player_database_populated(player_session) or is_team_database_populated(team_session):
            print("[INFO] Databases detected as already populated. Starting data update...")
            update_years = list(range(2023, current_year))
            
            update_player_game_logs(player_engine, update_years)
            update_team_game_logs(team_engine, update_years)
            
            print("[DEBUG] Data update complete.")
            return 
        
        print("[INFO] No existing data found. Starting full data ingestion...")
        years = list(range(2000, current_year))
        ingest_player_data(years=years, engine=player_engine)
        ingest_team_data(years=years, engine=team_engine)
        
        print("[DEBUG] Data ingestion complete.")
    except Exception as e:
        print(f"[ERROR] An error occurred during ingestion: {str(e)}")

if __name__ == "__main__":
    main()