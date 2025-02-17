"""
Main module to orchestrate data ingestion for player_data and team_data databases using nfl-data-py.
"""

from player_data.database import initialize_player_database
from player_data.ingestion import ingest_player_data
from team_data.database import initialize_team_database
from team_data.ingestion import ingest_team_data

def main():
    """
    Main function to initialize databases and ingest NFL data.
    """
    try:
        # Initialize the player_data database
        player_engine = initialize_player_database()
        print("[DEBUG] Initialized player_data database.")
        
        # Initialize the team_data database
        team_engine = initialize_team_database()
        print("[DEBUG] Initialized team_data database.")
        
        # Ingest player and team data using specified years
        ingest_player_data(years=[2022, 2023, 2024], engine=player_engine)
        ingest_team_data(years=[2022, 2023, 2024], engine=team_engine)
        
        print("[DEBUG] Data ingestion complete.")
    except Exception as e:
        print(f"[ERROR] An error occurred during ingestion: {str(e)}")

if __name__ == "__main__":
    main()