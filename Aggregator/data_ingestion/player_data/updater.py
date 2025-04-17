import pandas as pd
import nfl_data_py as nfl
from sqlalchemy.orm import Session
from sqlalchemy.engine import Engine

from .database import get_player_session
from .models import PlayerBasicInfo, create_player_game_log_model
from player_data.ingestion import fill_missing_weeks_for_player, create_record, extract_bye_weeks

def update_player_game_logs(engine: Engine, years: list):
    """
    Update player game logs by comparing new data from nfl-data-py with existing records.
    For each player, missing game logs are inserted.
    
    Args:
        engine (Engine): SQLAlchemy engine for the player_data database.
        years (list): List of seasons to update.
    """
    print("[DEBUG] Updating player game logs...")
    # Import the latest weekly game logs and schedule data
    new_game_logs_df = nfl.import_weekly_data(years)
    schedule_df = nfl.import_schedules(years)
    bye_weeks = extract_bye_weeks(schedule_df)
    
    session = get_player_session(engine)
    # Retrieve all players from the basic info table
    players = session.query(PlayerBasicInfo).all()
    print(f"[DEBUG] Found {len(players)} players.")
    count = 0

    for player in players:
        player_id = player.id
        # Filter new game logs to include only those for this player
        player_game_logs_df = new_game_logs_df[new_game_logs_df['player_id'] == player_id]
        if player_game_logs_df.empty:
            continue

        # Fill missing weeks as per ingestion logic
        player_game_logs_df = fill_missing_weeks_for_player(player_game_logs_df, bye_weeks)
        player_game_logs_df = player_game_logs_df.drop_duplicates(
            subset=['season', 'week', 'season_type'], keep='last'
        )
        
        # Dynamically create the model for the player's game log table and ensure the table exists
        GameLogModel = create_player_game_log_model(player_id)
        GameLogModel.__table__.create(bind=engine, checkfirst=True)
        
        # Query existing game logs from the player's table
        existing_logs = session.query(GameLogModel).all()
        existing_keys = {(log.season, log.week, log.season_type) for log in existing_logs}
        
        # Prepare new records for missing games
        new_records = []
        for _, row in player_game_logs_df.iterrows():
            key = (int(row['season']), int(row['week']), row['season_type'])
            if key not in existing_keys:
                new_records.append(create_record(player_id, row))
        
        if new_records:
            count += 1
            print(f"[DEBUG] Inserting {len(new_records)} new game log(s) for player {player_id}.")
            session.bulk_insert_mappings(GameLogModel, new_records)
            session.commit()
    print(f"[DEBUG] Player game logs update complete, updated {count} players.")