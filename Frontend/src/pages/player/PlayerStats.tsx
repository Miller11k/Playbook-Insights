import React, { useState, useEffect, useCallback } from 'react';
import axios, { AxiosError } from 'axios';
import Chart from '../../components/charts/Chart';
import './PlayerStats.css';
import { debounce } from 'lodash';

// --- Interfaces ---
// Interface for search result items when querying player names
interface PlayerSearchResult { id: string; name: string; }

// Interface representing full game stats for a player
interface PlayerFullGameStats {
  player_id: string;
  season: number;
  week: number;
  opponent_team: string;
  passing_stats?: {
    passing_yards?: number;
    passing_tds?: number;
    interceptions?: number;
    completions?: number;
    attempts?: number;
  };
  rushing_stats?: {
    rushing_yards?: number;
    rushing_tds?: number;
    carries?: number;
  };
  receiving_stats?: {
    receiving_yards?: number;
    receiving_tds?: number;
    receptions?: number;
    targets?: number;
  };
  [key: string]: any;
}

// Interface for defensive stats data fetched for opponent teams
interface OpponentDefensiveStatsData {
  passing_yards_allowed?: number;
  sacks?: number;
  interceptions?: number;
  rushing_yards_allowed?: number;
  carries_allowed?: number;
  wr_yards_allowed?: number;
  te_yards_allowed?: number;
  wr_receptions_allowed?: number;
  te_receptions_allowed?: number;
  season?: number;
  week?: number;
  opponent_team?: string;
}

// --- Stat Configuration ---
// Defines how each stat should be displayed and mapped for player vs. opponent
interface StatConfig {
  key: string;
  label: string;
  playerDataPath: string;
  defensiveCounterPath: string;
  playerChartLabelSuffix: string;
  opponentChartLabel: string;
}

// Available stat options for dropdown selection
const statOptions: StatConfig[] = [
  {
    key: "pass_yds",
    label: "Passing Yards",
    playerDataPath: "passing_stats.passing_yards",
    defensiveCounterPath: "passing_yards_allowed",
    playerChartLabelSuffix: "Passing Yards",
    opponentChartLabel: "Pass Yards Allowed"
  },
  {
    key: "pass_tds",
    label: "Passing TDs",
    playerDataPath: "passing_stats.passing_tds",
    defensiveCounterPath: "passing_yards_allowed",
    playerChartLabelSuffix: "Passing TDs",
    opponentChartLabel: "Pass Yards Allowed"
  },
  {
    key: "rush_yds",
    label: "Rushing Yards",
    playerDataPath: "rushing_stats.rushing_yards",
    defensiveCounterPath: "rushing_yards_allowed",
    playerChartLabelSuffix: "Rushing Yards",
    opponentChartLabel: "Rush Yards Allowed"
  },
  {
    key: "rush_tds",
    label: "Rushing TDs",
    playerDataPath: "rushing_stats.rushing_tds",
    defensiveCounterPath: "rushing_yards_allowed",
    playerChartLabelSuffix: "Rushing TDs",
    opponentChartLabel: "Rush Yards Allowed"
  },
  {
    key: "rec_yds",
    label: "Receiving Yards",
    playerDataPath: "receiving_stats.receiving_yards",
    defensiveCounterPath: "passing_yards_allowed",
    playerChartLabelSuffix: "Receiving Yards",
    opponentChartLabel: "Pass Yards Allowed"
  },
  {
    key: "receptions",
    label: "Receptions",
    playerDataPath: "receiving_stats.receptions",
    defensiveCounterPath: "passing_yards_allowed",
    playerChartLabelSuffix: "Receptions",
    opponentChartLabel: "Pass Yards Allowed"
  },
  {
    key: "carries",
    label: "Carries",
    playerDataPath: "rushing_stats.carries",
    defensiveCounterPath: "carries_allowed",
    playerChartLabelSuffix: "Carries",
    opponentChartLabel: "Carries Allowed"
  },
];

// --- Helper Function ---
// Safely access nested object properties by path (e.g., "a.b.c")
const getProperty = (obj: any, path: string): any => {
  if (!obj || !path) return undefined;
  if (!path.includes('.')) return obj[path];
  const properties = path.split('.');
  return properties.reduce((prev, curr) => (
    prev && prev[curr] !== undefined ? prev[curr] : undefined
  ), obj);
};

// --- Constants ---
// Base URL for API calls, configured via environment or default empty
const API_BASE_URL = import.meta.env.VITE_API_URL;
console.log('Using API Base URL:', API_BASE_URL);

// List of NFL teams for defensive opponent dropdown
const nflTeams = [
  { code: 'ARI', name: 'Arizona Cardinals' },
  { code: 'ATL', name: 'Atlanta Falcons' },
  { code: 'BAL', name: 'Baltimore Ravens' },
  { code: 'BUF', name: 'Buffalo Bills' },
  { code: 'CAR', name: 'Carolina Panthers' },
  { code: 'CHI', name: 'Chicago Bears' },
  { code: 'CIN', name: 'Cincinnati Bengals' },
  { code: 'CLE', name: 'Cleveland Browns' },
  { code: 'DAL', name: 'Dallas Cowboys' },
  { code: 'DEN', name: 'Denver Broncos' },
  { code: 'DET', name: 'Detroit Lions' },
  { code: 'GB', name: 'Green Bay Packers' },
  { code: 'HOU', name: 'Houston Texans' },
  { code: 'IND', name: 'Indianapolis Colts' },
  { code: 'JAX', name: 'Jacksonville Jaguars' },
  { code: 'KC', name: 'Kansas City Chiefs' },
  { code: 'LV', name: 'Las Vegas Raiders' },
  { code: 'LAC', name: 'Los Angeles Chargers' },
  { code: 'LAR', name: 'Los Angeles Rams' },
  { code: 'MIA', name: 'Miami Dolphins' },
  { code: 'MIN', name: 'Minnesota Vikings' },
  { code: 'NE', name: 'New England Patriots' },
  { code: 'NO', name: 'New Orleans Saints' },
  { code: 'NYG', name: 'New York Giants' },
  { code: 'NYJ', name: 'New York Jets' },
  { code: 'PHI', name: 'Philadelphia Eagles' },
  { code: 'PIT', name: 'Pittsburgh Steelers' },
  { code: 'SF', name: 'San Francisco 49ers' },
  { code: 'SEA', name: 'Seattle Seahawks' },
  { code: 'TB', name: 'Tampa Bay Buccaneers' },
  { code: 'TEN', name: 'Tennessee Titans' },
  { code: 'WAS', name: 'Washington Commanders' }
];

// --- Component ---
// PlayerStats component handles search input, API calls, and chart rendering
const PlayerStats: React.FC = () => {
  // --- State ---  
  const [playerSearchTerms, setPlayerSearchTerms] = useState<string[]>(['']); // Search input values
  const [focusedInputIndex, setFocusedInputIndex] = useState<number | null>(null); // Which input is active
  const [searchResults, setSearchResults] = useState<PlayerSearchResult[]>([]); // Name search results
  const [selectedPlayers, setSelectedPlayers] = useState<(PlayerSearchResult | null)[]>([null]); // Chosen players
  const [isSearching, setIsSearching] = useState<boolean>(false); // Indicates search in progress
  const [season, setSeason] = useState<number | ''>(''); // Season filter
  const [week, setWeek] = useState<number | ''>(''); // Week filter
  const [selectedStatKey, setSelectedStatKey] = useState<string>(statOptions[0].key); // Chosen stat
  const [playerGameLogs, setPlayerGameLogs] = useState<PlayerFullGameStats[][]>([]); // Fetched game logs
  const [playerChartData, setPlayerChartData] = useState<any>(null); // Data for player chart
  const [showDefensiveSelector, setShowDefensiveSelector] = useState<boolean>(false); // Toggle opponent section
  const [selectedOpponentTeam, setSelectedOpponentTeam] = useState<string>(''); // Defensive team filter
  const [opponentDefChartData, setOpponentDefChartData] = useState<any>(null); // Data for opponent chart
  const [opponentRawDefData, setOpponentRawDefData] = useState<OpponentDefensiveStatsData[]>([]); // Raw defensive data
  const [opponentDefLoading, setOpponentDefLoading] = useState<boolean>(false); // Loading state for defense
  const [opponentDefError, setOpponentDefError] = useState<string | null>(null); // Error for defense section
  const [error, setError] = useState<string | null>(null); // General error for player fetch
  const [searchError, setSearchError] = useState<string | null>(null); // Error for name search
  const [isLoading, setIsLoading] = useState<boolean>(false); // Loading player stats

  // --- Derived State ---
  const selectedStatConfig = statOptions.find(opt => opt.key === selectedStatKey) || statOptions[0];

  // --- Dropdown Options ---
  const currentYear = new Date().getFullYear() - 1; // Upper bound for year selection
  const years = Array.from({ length: currentYear - 2000 + 1 }, (_, i) => 2000 + i).reverse();
  const weeks = Array.from({ length: 22 }, (_, i) => i + 1); // Valid weeks

  // --- API Calls ---  
  // Debounced search to fetch player name suggestions
  const debouncedSearch = useCallback(
    debounce(async (searchTerm: string, index: number) => {
      if (!API_BASE_URL) {
        setSearchError("API URL missing");
        setIsSearching(false);
        return;
      }
      if (searchTerm.trim().length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        setSearchError(null);
        return;
      }
      console.log(`🚀 Triggering API Search: "${searchTerm}" (Index: ${index})`);
      setIsSearching(true);
      setSearchError(null);
      try {
        const apiUrl = `${API_BASE_URL}/search`;
        console.log(`📞 Calling API: GET ${apiUrl}?name=${searchTerm}`);
        const response = await axios.get<PlayerSearchResult[]>(apiUrl, { params: { name: searchTerm } });
        if (!Array.isArray(response.data)) {
          throw new Error("Invalid data format from server.");
        }
        setSearchResults(response.data);
      } catch (err) {
        const error = err as AxiosError<{ error?: string }>;
        console.error('❌ Search API Error:', error.response?.data || error.message);
        setSearchError(error.response?.data?.error || 'Search failed.');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500),
    [API_BASE_URL]
  );

  // Fetch and combine stats for all selected players
  const fetchAllPlayerStats = async () => {
    if (!API_BASE_URL) {
      setError("API URL missing");
      return;
    }
    // Reset relevant state before new fetch
    setError(null);
    setPlayerChartData(null);
    setShowDefensiveSelector(false);
    setSelectedOpponentTeam('');
    setOpponentDefChartData(null);
    setOpponentDefError(null);
    setOpponentRawDefData([]);
    setPlayerGameLogs([]);

    const validPlayerIds = selectedPlayers.map(p => p?.id).filter((id): id is string => !!id);
    if (validPlayerIds.length === 0) {
      setError('Please search for and select at least one player.');
      return;
    }
    setIsLoading(true);

    try {
      const combinedLogs: PlayerFullGameStats[][] = [];
      for (let i = 0; i < validPlayerIds.length; i++) {
        const id = validPlayerIds[i];
        const playerLogs: { [key: string]: PlayerFullGameStats } = {};
        const unifiedUrl = `${API_BASE_URL}/`;
        console.log(`📞 Fetching all stats for Player ID: ${id} via ${unifiedUrl}`);

        const statTypes = ['passing', 'rushing', 'receiving'] as const;
        const requests = statTypes.map(key =>
          axios.get<PlayerFullGameStats[]>(unifiedUrl, {
            headers: {
              'x-entity-type': 'player',
              'x-stats-type': key
            },
            params: { id, ...(season && { season }), ...(week && { week }) }
          })
          .then(response => ({ key, data: response.data }))
          .catch(err => {
            console.warn(`⚠️ Failed to fetch ${key} stats for ${id}:`, err.message);
            return { key, data: [] };
          })
        );

        const responses = await Promise.all(requests);

        // Merge data by season-week key
        responses.forEach(response => {
          if (response && Array.isArray(response.data)) {
            response.data.forEach(game => {
              if (game && game.season != null && game.week != null && game.opponent_team != null) {
                const gameKey = `${game.season}-${game.week}`;
                if (!playerLogs[gameKey]) {
                  playerLogs[gameKey] = {
                    player_id: id,
                    season: game.season,
                    week: game.week,
                    opponent_team: game.opponent_team
                  };
                }
                const statsDataKey = `${response.key}_stats` as keyof PlayerFullGameStats;
                if (game[statsDataKey]) {
                  playerLogs[gameKey][statsDataKey] = game[statsDataKey];
                }
              } else {
                console.warn(`Skipping incomplete game data for player ${id}:`, game);
              }
            });
          } else {
            console.error(`❌ Invalid data format for ${response?.key} stats for player ${id}`);
          }
        });

        // Sort logs chronologically
        const sortedLogs = Object.values(playerLogs).sort((a, b) => {
          if (a.season !== b.season) return a.season - b.season;
          return a.week - b.week;
        });
        combinedLogs.push(sortedLogs);
      }

      console.log("✅ Combined Player Game Logs:", combinedLogs);
      setPlayerGameLogs(combinedLogs);
    } catch (err: any) {
      const error = err as AxiosError<{ error?: string }>;
      console.error('❌ Error fetching player stats:', error.response?.data || error.message);
      setError(error.response?.data?.error || error.message || 'Error fetching player stats.');
      setPlayerGameLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Chart Generation Effects ---

  // Effect 1: Build player chart when game logs or stat selection changes
  useEffect(() => {
    if (!playerGameLogs || playerGameLogs.length === 0 || !playerGameLogs[0]?.length) {
      setPlayerChartData(null);
      return;
    }
    console.log(`📊 Regenerating player chart for stat: ${selectedStatConfig.label}`);

    const firstPlayerData = playerGameLogs[0];
    const labels = firstPlayerData.map(game => {
      if (game.opponent_team === 'BYE') return `BYE W${game.week}`;
      const opponentCode = game.opponent_team || 'N/A';
      const weekNum = game.week != null ? game.week : '?';
      return `${opponentCode} W${weekNum}`;
    });
    const gameCount = labels.length;

    const datasets = playerGameLogs.map((playerData, idx) => {
      const dataArray = Array.from({ length: gameCount }, (_, i) => {
        const gameData = playerData[i];
        const statValue = getProperty(gameData, selectedStatConfig.playerDataPath);
        return gameData?.opponent_team === 'BYE' ? 0 : Number(statValue) || 0;
      });
      const playerName = selectedPlayers[idx]?.name || `Player ${idx + 1}`;
      return {
        label: `${playerName} ${selectedStatConfig.playerChartLabelSuffix}`,
        data: dataArray,
        borderColor: `hsl(${idx * 120}, 60%, 60%)`,
        backgroundColor: `hsla(${idx * 120}, 60%, 60%, 0.1)`,
        borderWidth: 2,
        fill: false,
        tension: 0.1
      };
    });

    setPlayerChartData({ labels, datasets });
  }, [playerGameLogs, selectedStatKey, selectedPlayers, season, selectedStatConfig]);

  // --- Effect 2: Fetch and build opponent defensive chart when relevant state changes ---
  useEffect(() => {
    const fetchAndGenerateOpponentChart = async () => {
      console.log("DEFENSE EFFECT 1: Triggered. Opponent:", selectedOpponentTeam);

      if (!API_BASE_URL) {
        setOpponentDefError("API URL missing");
        return;
      }
      if (!selectedOpponentTeam || !playerChartData?.labels?.length) {
        console.log("DEFENSE EFFECT 1: Exiting - no opponent or no player data.");
        setOpponentDefChartData(null);
        setOpponentRawDefData([]);
        return;
      }

      setOpponentDefLoading(true);
      setOpponentDefError(null);
      setOpponentDefChartData(null);

      try {
        const unifiedUrl = `${API_BASE_URL}/`;
        const params = { team: selectedOpponentTeam, ...(season && { season }), ...(week && { week }) };
        console.log(`DEFENSE EFFECT 1: Fetching defensive stats for ${selectedOpponentTeam}`, params);

        const response = await axios.get<OpponentDefensiveStatsData[]>(unifiedUrl, {
          headers: { 'x-entity-type': 'team', 'x-stats-type': 'defensive' },
          params
        });
        console.log("DEFENSE EFFECT 1: Raw data:", response.data);

        if (!response.data || !Array.isArray(response.data)) {
          throw new Error("Invalid defensive stats format.");
        }

        let opponentData = response.data.filter(d => d && d.week !== undefined && d.opponent_team !== undefined);
        console.log("DEFENSE EFFECT 1: Filtered data:", opponentData);

        const gameCount = playerChartData.labels.length;
        if (opponentData.length > gameCount) {
          opponentData = opponentData.slice(0, gameCount);
        } else if (opponentData.length < gameCount) {
          const paddingNeeded = gameCount - opponentData.length;
          opponentData = [...opponentData, ...Array(paddingNeeded).fill({ week: null, opponent_team: 'N/A' })];
        }

        if (opponentData.filter(g => g.opponent_team !== 'N/A').length === 0 && gameCount > 0) {
          setOpponentDefError(`No usable defensive data for ${selectedOpponentTeam}.`);
          setOpponentRawDefData([]);
          setOpponentDefLoading(false);
          return;
        }

        setOpponentRawDefData(opponentData);

        const defensiveStatPath = selectedStatConfig.defensiveCounterPath;
        console.log(`DEFENSE EFFECT 1: Using path "${defensiveStatPath}"`);

        const opponentLabels = opponentData.map(game => {
          if (!game || game.week == null || game.opponent_team == null) return `Game ?`;
          if (game.opponent_team === 'BYE') return `BYE W${game.week}`;
          return `${game.opponent_team} W${game.week}`;
        });
        console.log("DEFENSE EFFECT 1: Labels:", opponentLabels);

        const defensiveData = opponentData.map(game => {
          const statValue = getProperty(game, defensiveStatPath);
          return Number(statValue) || 0;
        });
        console.log("DEFENSE EFFECT 1: Data array:", defensiveData);

        const newChartData = {
          labels: opponentLabels,
          datasets: [
            {
              label: `${selectedOpponentTeam} ${selectedStatConfig.opponentChartLabel}`,
              data: defensiveData,
              backgroundColor: 'rgba(255, 99, 132, 0.6)',
              borderColor: 'rgb(255, 99, 132)',
              borderWidth: 1,
              barPercentage: 0.6,
              categoryPercentage: 0.7
            },
          ],
        };
        setOpponentDefChartData(newChartData);
      } catch (err: any) {
        const error = err as AxiosError<{ error?: string }>;
        console.error("❌ DEFENSE EFFECT 1:", error.response?.data || error.message);
        setOpponentDefError(error.response?.data?.error || err.message || `Failed to load defensive stats.`);
        setOpponentRawDefData([]);
      } finally {
        setOpponentDefLoading(false);
      }
    };

    fetchAndGenerateOpponentChart();
  }, [selectedOpponentTeam, playerChartData, season, week, selectedStatConfig, API_BASE_URL]);

  // --- Effect 3: Regenerate opponent chart when selected stat changes ---
  useEffect(() => {
    console.log("DEFENSE EFFECT 2: Triggered for new stat:", selectedStatKey);

    if (!selectedOpponentTeam || opponentRawDefData.length === 0) {
      return;
    }

    const gameCount = opponentRawDefData.length;
    const defensiveStatPath = selectedStatConfig.defensiveCounterPath;

    const opponentLabels = opponentRawDefData.map(game => {
      if (!game || game.week == null || game.opponent_team == null) return `Game ?`;
      if (game.opponent_team === 'BYE') return `BYE W${game.week}`;
      return `${game.opponent_team} W${game.week}`;
    });
    console.log("DEFENSE EFFECT 2: Labels:", opponentLabels);

    const defensiveData = opponentRawDefData.map(game => {
      const statValue = getProperty(game, defensiveStatPath);
      return Number(statValue) || 0;
    });
    console.log("DEFENSE EFFECT 2: Data array:", defensiveData);

    const newChartData = {
      labels: opponentLabels,
      datasets: [
        {
          label: `${selectedOpponentTeam} ${selectedStatConfig.opponentChartLabel}`,
          data: defensiveData,
          backgroundColor: 'rgba(255, 99, 132, 0.6)',
          borderColor: 'rgb(255, 99, 132)',
          borderWidth: 1,
          barPercentage: 0.6,
          categoryPercentage: 0.7
        },
      ],
    };
    setOpponentDefChartData(newChartData);
  }, [selectedStatKey, opponentRawDefData, selectedOpponentTeam, selectedStatConfig]);

  // --- Event Handlers ---
  // Handle typing in the search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const term = e.target.value;
    const newTerms = [...playerSearchTerms];
    newTerms[index] = term;
    setPlayerSearchTerms(newTerms);
    setFocusedInputIndex(index);
    setSearchResults([]);
    setSearchError(null);
    debouncedSearch(term, index);
  };

  // Handle selecting a player from search results
  const handleSelectPlayer = (player: PlayerSearchResult, index: number) => {
    console.log(`Player selected (Index: ${index}):`, player);
    const newSelected = [...selectedPlayers];
    newSelected[index] = player;
    setSelectedPlayers(newSelected);
    const newTerms = [...playerSearchTerms];
    newTerms[index] = '';
    setPlayerSearchTerms(newTerms);
    setSearchResults([]);
    setFocusedInputIndex(null);
    setSearchError(null);
  };

  // Clear a chosen player selection
  const handleClearSelection = (index: number) => {
    console.log(`Clearing selection (Index: ${index})`);
    const newSelected = [...selectedPlayers];
    newSelected[index] = null;
    setSelectedPlayers(newSelected);
    const newTerms = [...playerSearchTerms];
    newTerms[index] = '';
    setPlayerSearchTerms(newTerms);
  };

  // Add another search field up to 3 players
  const addPlayerSearchField = () => {
    if (selectedPlayers.length < 3) {
      setSelectedPlayers(prev => [...prev, null]);
      setPlayerSearchTerms(prev => [...prev, '']);
    }
  };

  // Handle form submission to fetch stats
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submit button clicked - Fetching all player stats");
    setError(null);
    setPlayerChartData(null);
    fetchAllPlayerStats();
  };

  // Toggle visibility of the defensive stats section
  const toggleDefensiveSection = () => {
    console.log("Toggling defensive section. Current:", showDefensiveSelector);
    setShowDefensiveSelector(prevShow => {
      const closing = prevShow;
      if (closing) {
        setSelectedOpponentTeam('');
        setOpponentDefChartData(null);
        setOpponentDefError(null);
        setOpponentRawDefData([]);
        console.log("Cleared defensive state on close.");
      }
      return !prevShow;
    });
  };

  // --- Render ---
  return (
    <div className="stats-container player-stats-page-container">
      <h2>Player {selectedStatConfig.playerChartLabelSuffix} Stats</h2>

      <form className="stats-form player-stats-form" onSubmit={handleSubmit}>
        {selectedPlayers.map((selectedPlayer, idx) => (
          <div key={idx} className="player-search-input-container">
            <label htmlFor={`player-search-${idx}`}> Player {idx + 1}: </label>
            <div className="input-group">
              <input
                id={`player-search-${idx}`}
                type="text"
                placeholder="Search Player Name..."
                value={selectedPlayer ? selectedPlayer.name : playerSearchTerms[idx]}
                onChange={(e) => handleSearchChange(e, idx)}
                onFocus={() => {
                  if (selectedPlayer) { handleClearSelection(idx); }
                  setFocusedInputIndex(idx);
                  setSearchResults([]);
                  setSearchError(null);
                }}
                onBlur={() => {
                  setTimeout(() => {
                    if (focusedInputIndex === idx) {
                      setFocusedInputIndex(null);
                    }
                  }, 200);
                }}
                autoComplete="off"
              />
              {selectedPlayer && (
                <button
                  type="button"
                  className="clear"
                  onClick={() => handleClearSelection(idx)}
                  title="Clear selection"
                > X </button>
              )}
            </div>
            <div className="search-status" style={{ height: '1.2em', marginTop: '4px', textAlign: 'left' }}>
              {focusedInputIndex === idx && isSearching && <span className="searching">Searching...</span>}
              {focusedInputIndex === idx && searchError && <span className="error">{searchError}</span>}
            </div>
            {focusedInputIndex === idx && searchResults.length > 0 && !selectedPlayer && (
              <ul className="search-results-list">
                {searchResults.map((player) => (
                  <li
                    key={player.id}
                    onMouseDown={() => handleSelectPlayer(player, idx)}
                  >
                    {player.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {selectedPlayers.length < 3 && (
          <button type="button" className="secondary" onClick={addPlayerSearchField}> Add Player </button>
        )}

        <div className="filters-group" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap', width: '100%', justifyContent: 'center' }}>
          <label htmlFor="stat-select"> Stat:
            <select id="stat-select" value={selectedStatKey} onChange={(e) => setSelectedStatKey(e.target.value)}>
              {statOptions.map((option) => (<option key={option.key} value={option.key}>{option.label}</option>))}
            </select>
          </label>
          <label htmlFor="year-select"> Year:
            <select id="year-select" value={season} onChange={(e) => setSeason(e.target.value ? Number(e.target.value) : '')}>
              <option value="">All Seasons</option>
              {years.map((yr) => (<option key={yr} value={yr}>{yr}</option>))}
            </select>
          </label>
          <label htmlFor="week-select"> Week:
            <select id="week-select" value={week} onChange={(e) => setWeek(e.target.value ? Number(e.target.value) : '')} disabled={!season}>
              <option value="">All Weeks</option>
              {weeks.map((wk) => (<option key={wk} value={wk}>{wk}</option>))}
            </select>
          </label>
        </div>

        <button className="submit-button" type="submit" disabled={isLoading || selectedPlayers.every(p => p === null)} style={{ marginTop: '1rem' }}>
          {isLoading ? 'Loading...' : 'Get Stats'}
        </button>
      </form>

      {error && <p className="error-message">{error}</p>}
      {isLoading && <p className="loading-text">Loading player data...</p>}

      {playerChartData && !isLoading && (
        <div className="chart-container" style={{ marginBottom: '1rem' }}>
          <Chart data={playerChartData} />
        </div>
      )}

      {playerChartData && !isLoading && (
        <button className="toggle-defense-button" onClick={toggleDefensiveSection}>
          <span style={{ marginRight: '8px', fontSize: '1.2em' }}>{showDefensiveSelector ? '-' : '+'}</span>
          See Defensive Strength
        </button>
      )}

      {showDefensiveSelector && playerChartData && (
        <div className="opponent-defensive-section">
          <h3>Opponent Defensive Performance ({selectedStatConfig.opponentChartLabel})</h3>
          <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            <label htmlFor="opponent-select" style={{ color: 'var(--text-muted)', marginRight: '10px' }}>Select Defensive Team:</label>
            <select
              id="opponent-select"
              value={selectedOpponentTeam}
              onChange={(e) => setSelectedOpponentTeam(e.target.value)}
            >
              <option value="">-- Select Team --</option>
              {nflTeams.map(team => (<option key={team.code} value={team.code}>{team.name} ({team.code})</option>))}
            </select>
          </div>

          {opponentDefLoading && <p className="loading-text">Loading defensive stats...</p>}
          {opponentDefError && <p className="error-message">{opponentDefError}</p>}

          {opponentDefChartData && !opponentDefLoading && !opponentDefError && (
            <div className="chart-container">
              <Chart data={opponentDefChartData} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlayerStats;