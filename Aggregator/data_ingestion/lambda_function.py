from player_data.database import initialize_player_database, get_player_session
from team_data.database import initialize_team_database, get_team_session
from player_data.updater import update_player_game_logs
from team_data.updater import update_team_game_logs
from datetime import datetime
import os # For environment variables

NFL_SEASON_MONTHS = list(range(8, 13)) + list(range(1, 3))

def lambda_handler(event, context):
    """
    AWS Lambda handler function to update NFL game logs weekly during the season.
    """
    current_month = datetime.now().month
    current_year = datetime.now().year

    # --- Easiest way to handle "during the season" ---
    if current_month not in NFL_SEASON_MONTHS:
        print(f"[INFO] Current month ({current_month}) is outside the NFL season. Skipping update.")
        return {
            'statusCode': 200,
            'body': 'Outside NFL season, update skipped.'
        }
    # -------------------------------------------------

    print("[INFO] NFL season check passed. Initializing databases...")
    try:
        # Use environment variables for database connection strings/credentials
        # These will be configured in the Lambda function settings
        player_db_url = os.environ.get('PLAYER_DB_URL')
        team_db_url = os.environ.get('TEAM_DB_URL')

        if not player_db_url or not team_db_url:
             raise ValueError("Database URLs not configured in environment variables.")

        # Adapt initialize functions if they need the URL passed directly
        player_engine = initialize_player_database(player_db_url)
        team_engine = initialize_team_database(team_db_url)

        # Note: You might not need sessions if the update functions only need the engine
        # player_session = get_player_session(player_engine)
        # team_session = get_team_session(team_engine)

        print("[INFO] Databases initialized. Starting data update...")

        # Determine the year(s) to update. Usually just the current or previous season.
        # This might need refinement based on how your update logic works.
        # For a weekly update, you often only need the current NFL season year.
        update_years = [current_year] # Or maybe [current_year-1, current_year] depending on season timing

        update_player_game_logs(player_engine, update_years)
        update_team_game_logs(team_engine, update_years)

        print("[INFO] Data update complete.")
        return {
            'statusCode': 200,
            'body': 'Data update successful.'
        }

    except Exception as e:
        print(f"[ERROR] An error occurred during update: {str(e)}")
        # Re-raise the exception to signal failure to Lambda
        raise e