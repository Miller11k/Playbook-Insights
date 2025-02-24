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