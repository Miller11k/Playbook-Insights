from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import insert as pg_insert
from schema import Base, Player, Team, GameLog
import nfl_data_py as nfl
import pandas as pd
from datetime import datetime
import math

def initialize_database(db_url='postgresql://shkembi:B01ler@172.17.0.3:5432/database'):
    engine = create_engine(db_url)
    Base.metadata.create_all(engine)
    return engine

def get_clean_data(years):
    roster = nfl.import_seasonal_rosters(years)
    roster_clean = nfl.clean_nfl_data(roster)
    
    teams = nfl.import_team_desc()
    game_logs = nfl.import_weekly_data(years)
    
    return roster_clean, teams, game_logs

def populate_database(engine, years=[2024]):
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        rosters, teams, game_logs = get_clean_data(years)

        
        # Create player ID to name mapping (if needed later)
        player_id_to_name = rosters.set_index('player_id')['player_name'].to_dict()
        
        # Insert teams with proper column mapping
        team_records = teams.rename(columns={
            'team_abbr': 'team_abbr',
            'team_name': 'team_name',
            'team_color': 'team_color',
            'team_color2': 'team_color2',
            'team_logo_wikipedia': 'team_logo'
        }).to_dict(orient='records')
        session.bulk_insert_mappings(Team, team_records)
        
        # -------------------------------
        # UPSERT players using PostgreSQL dialect
        # -------------------------------
        if not rosters.empty:
            player_data = rosters[[
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
                for field in ['weight', 'rookie_year', 'entry_year', 'jersey_number']:
                    if field in record:
                        if pd.isna(record[field]) or (isinstance(record[field], float) and math.isnan(record[field])):
                            record[field] = None
                        else:
                            record[field] = int(record[field])
                if 'height' in record:
                    if pd.isna(record['height']) or (isinstance(record['height'], float) and math.isnan(record['height'])):
                        record['height'] = None
                    else:
                        record['height'] = str(record['height'])
            
            for record in records:
                stmt = pg_insert(Player.__table__).values(**record)
                stmt = stmt.on_conflict_do_update(
                    index_elements=['id'],
                    set_={
                        'name': stmt.excluded.name,
                        'position': stmt.excluded.position,
                        'team': stmt.excluded.team,
                        'birth_date': stmt.excluded.birth_date,
                        'height': stmt.excluded.height,
                        'weight': stmt.excluded.weight,
                        'college': stmt.excluded.college,
                        'rookie_year': stmt.excluded.rookie_year,
                        'entry_year': stmt.excluded.entry_year,
                        'status': stmt.excluded.status,
                        'jersey_number': stmt.excluded.jersey_number
                    }
                )
                session.execute(stmt)
        
        # -------------------------------
        # Insert detailed game logs
        # -------------------------------
        game_log_records = []
        for _, row in game_logs.iterrows():
            log = {
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
                'opponent_team': row['opponent_team'],
                
                # Offensive Stats
                'completions': int(row.get('completions', 0)),
                'attempts': int(row.get('attempts', 0)),
                'passing_yards': float(row.get('passing_yards', 0)),
                'passing_tds': int(row.get('passing_tds', 0)),
                'interceptions': int(row.get('interceptions', 0)),
                'sacks': float(row.get('sacks', 0)),
                'sack_yards': float(row.get('sack_yards', 0)),
                'sack_fumbles': int(row.get('sack_fumbles', 0)),
                'sack_fumbles_lost': int(row.get('sack_fumbles_lost', 0)),
                'passing_air_yards': float(row.get('passing_air_yards', 0)),
                'passing_yards_after_catch': float(row.get('passing_yards_after_catch', 0)),
                'passing_first_downs': int(row.get('passing_first_downs', 0)),
                'passing_epa': float(row.get('passing_epa', 0)),
                'passing_2pt_conversions': int(row.get('passing_2pt_conversions', 0)),
                'pacr': float(row.get('pacr', 0)),
                'dakota': float(row.get('dakota', 0)),
                'carries': int(row.get('carries', 0)),
                'rushing_yards': float(row.get('rushing_yards', 0)),
                'rushing_tds': int(row.get('rushing_tds', 0)),
                'rushing_fumbles': int(row.get('rushing_fumbles', 0)),
                'rushing_fumbles_lost': int(row.get('rushing_fumbles_lost', 0)),
                'rushing_first_downs': int(row.get('rushing_first_downs', 0)),
                'rushing_epa': float(row.get('rushing_epa', 0)),
                'rushing_2pt_conversions': int(row.get('rushing_2pt_conversions', 0)),
                'receptions': int(row.get('receptions', 0)),
                'targets': int(row.get('targets', 0)),
                'receiving_yards': float(row.get('receiving_yards', 0)),
                'receiving_tds': int(row.get('receiving_tds', 0)),
                'receiving_fumbles': int(row.get('receiving_fumbles', 0)),
                'receiving_fumbles_lost': int(row.get('receiving_fumbles_lost', 0)),
                'receiving_air_yards': float(row.get('receiving_air_yards', 0)),
                'receiving_yards_after_catch': float(row.get('receiving_yards_after_catch', 0)),
                'receiving_first_downs': int(row.get('receiving_first_downs', 0)),
                'receiving_epa': float(row.get('receiving_epa', 0)),
                'receiving_2pt_conversions': int(row.get('receiving_2pt_conversions', 0)),
                'racr': float(row.get('racr', 0)),
                'target_share': float(row.get('target_share', 0)),
                'air_yards_share': float(row.get('air_yards_share', 0)),
                'wopr': float(row.get('wopr', 0)),
                'special_teams_tds': int(row.get('special_teams_tds', 0)),
                'fantasy_points': float(row.get('fantasy_points', 0)),
                'fantasy_points_ppr': float(row.get('fantasy_points_ppr', 0))
            }
            game_log_records.append(log)
        session.bulk_insert_mappings(GameLog, game_log_records)
        
    except Exception as e:
        session.rollback()
        print(f"Error occurred: {str(e)}")
        raise e
    finally:
        session.close()

if __name__ == "__main__":
    engine = initialize_database()
    populate_database(engine, years=[2022, 2023, 2024])