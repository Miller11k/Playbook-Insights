"""
Module: team_data.aggregation
Provides functions to aggregate player-level game logs into team-level game logs.
"""

import pandas as pd

def aggregate_offensive_stats(df):
    """
    Aggregates offensive stats for each game using the 'recent_team' column.
    
    Groups by:
        recent_team (to be renamed as team_abbr), season, week, season_type, opponent_team.
    
    Aggregated columns:
        completions, attempts, passing_yards, passing_tds,
        carries, rushing_yards, rushing_tds, special_teams_tds.
    
    Args:
        df (DataFrame): Raw player-level game logs.
    
    Returns:
        DataFrame: Aggregated offensive stats with column 'recent_team' renamed to 'team_abbr'.
    """
    off_cols = ['completions', 'attempts', 'passing_yards', 'passing_tds', 
                'carries', 'rushing_yards', 'rushing_tds', 'special_teams_tds']
    off = df.groupby(['recent_team', 'season', 'week', 'season_type', 'opponent_team'], as_index=False)[off_cols].sum()
    off = off.rename(columns={'recent_team': 'team_abbr'})
    return off

def aggregate_defensive_stats(df):
    """
    Aggregates defensive stats for a team using rows where the team's abbreviation appears as 
    the opponent_team (i.e. the team being defended).
    
    Groups by:
        opponent_team, season, week, season_type.
    
    Aggregated columns:
        - For general defensive stats: we sum passing_yards, rushing_yards, sacks, and interceptions.
          Then, we rename passing_yards -> passing_yards_allowed and rushing_yards -> rushing_yards_allowed.
        - For receiving stats allowed, we group separately for players with positions TE, WR, and RB.
          (We assume that when a player is on offense, his receiving yards contribute to the opponent's 
           allowed total on defense.)
    
    After aggregation, we rename:
        opponent_team -> team_abbr,
        and take the first value of recent_team as the offensive opponent (renamed to opponent_team).
    
    Args:
        df (DataFrame): Raw player-level game logs.
    
    Returns:
        DataFrame: Aggregated defensive stats with columns:
                   team_abbr, season, week, season_type, opponent_team,
                   passing_yards_allowed, rushing_yards_allowed, sacks, interceptions,
                   te_yards_allowed, wr_yards_allowed, rb_receiving_yards_allowed.
    """
    # General defensive stats:
    gen = df.groupby(['opponent_team', 'season', 'week', 'season_type'], as_index=False).agg({
        'passing_yards': 'sum',
        'rushing_yards': 'sum',
        'carries': 'sum',
        'sacks': 'sum',
        'interceptions': 'sum',
        'recent_team': 'first'  # Offensive team for this game.
    })
    gen = gen.rename(columns={
        'opponent_team': 'team_abbr',
        'passing_yards': 'passing_yards_allowed',
        'rushing_yards': 'rushing_yards_allowed',
        'recent_team': 'opponent_team',
        'carries': 'carries_allowed'
    })
    
    # Receiving yards allowed by defense.
    recv_te = df[df['position'] == 'TE'].groupby(
        ['opponent_team', 'season', 'week', 'season_type'], as_index=False
    )['receiving_yards'].sum().rename(columns={'opponent_team': 'team_abbr', 'receiving_yards': 'te_yards_allowed'})
    
    recv_wr = df[df['position'] == 'WR'].groupby(
        ['opponent_team', 'season', 'week', 'season_type'], as_index=False
    )['receiving_yards'].sum().rename(columns={'opponent_team': 'team_abbr', 'receiving_yards': 'wr_yards_allowed'})
    
    recv_rb = df[df['position'] == 'RB'].groupby(
        ['opponent_team', 'season', 'week', 'season_type'], as_index=False
    )['receiving_yards'].sum().rename(columns={'opponent_team': 'team_abbr', 'receiving_yards': 'rb_receiving_yards_allowed'})

     # Receptions allowed by defense.
    rec_te = df[df['position'] == 'TE'].groupby(
        ['opponent_team', 'season', 'week', 'season_type'], as_index=False
    )['receptions'].sum().rename(columns={'opponent_team': 'team_abbr', 'receptions': 'te_receptions_allowed'})
    
    rec_wr = df[df['position'] == 'WR'].groupby(
        ['opponent_team', 'season', 'week', 'season_type'], as_index=False
    )['receptions'].sum().rename(columns={'opponent_team': 'team_abbr', 'receptions': 'wr_receptions_allowed'})
    
    rec_rb = df[df['position'] == 'RB'].groupby(
        ['opponent_team', 'season', 'week', 'season_type'], as_index=False
    )['receptions'].sum().rename(columns={'opponent_team': 'team_abbr', 'receptions': 'rb_receptions_allowed'})
    
    # Merge receiving aggregations.
    recv = pd.merge(recv_te, recv_wr, on=['team_abbr', 'season', 'week', 'season_type'], how='outer')
    recv = pd.merge(recv, recv_rb, on=['team_abbr', 'season', 'week', 'season_type'], how='outer')
    recv = recv.fillna(0)
    
    # Merge receptions aggregations.
    rec = pd.merge(rec_te, rec_wr, on=['team_abbr', 'season', 'week', 'season_type'], how='outer')
    rec = pd.merge(rec, rec_rb, on=['team_abbr', 'season', 'week', 'season_type'], how='outer')
    rec = rec.fillna(0)

    recv = pd.merge(recv, rec, on=['team_abbr', 'season', 'week', 'season_type'], how='outer')

    # Merge general defensive and receiving stats.
    def_df = pd.merge(gen, recv, on=['team_abbr', 'season', 'week', 'season_type'], how='outer')
    # def_df = pd.merge(gen, rec, on=['team_abbr', 'season', 'week', 'season_type'], how='outer')
    def_df = def_df.fillna(0)
    return def_df

def merge_team_aggregates(off_df, def_df):
    """
    Merges offensive and defensive aggregated DataFrames on the full game key.
    
    Both DataFrames now have:
        team_abbr, season, week, season_type, opponent_team.
    
    Args:
        off_df (DataFrame): Offensive aggregation.
        def_df (DataFrame): Defensive aggregation.
    
    Returns:
        DataFrame: Merged aggregation.
    """
    merged = pd.merge(off_df, def_df, on=['team_abbr', 'season', 'week', 'season_type', 'opponent_team'], how='outer', suffixes=('_off', '_def'))
    merged = merged.fillna(0)
    return merged