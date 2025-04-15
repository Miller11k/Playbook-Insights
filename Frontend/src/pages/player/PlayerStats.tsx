// src/pages/player/PlayerStats.tsx

import React, { useState, useEffect, useCallback } from 'react';
import axios, { AxiosError } from 'axios';
import Chart from '../../components/charts/Chart'; // Adjust path if needed
import './PlayerStats.css'; // Make sure this CSS file exists and contains alignment fixes
import { debounce } from 'lodash';

// --- Interfaces ---
interface PlayerSearchResult { id: string; name: string; }

interface PlayerFullGameStats {
  player_id: string; season: number; week: number; opponent_team: string;
  passing_stats?: {
    passing_yards?: number; passing_tds?: number; interceptions?: number; completions?: number; attempts?: number;
  };
  rushing_stats?: {
    rushing_yards?: number; rushing_tds?: number; carries?: number;
  };
  receiving_stats?: {
    receiving_yards?: number; receiving_tds?: number; receptions?: number; targets?: number;
  };
  [key: string]: any;
}

interface OpponentDefensiveStatsData {
  // Define all possible stats your /defensive-stats endpoint might return per game
  passing_yards_allowed?: number; sacks?: number; interceptions?: number;
  rushing_yards_allowed?: number; carries_allowed?: number;
  wr_yards_allowed?: number; te_yards_allowed?: number;
  wr_receptions_allowed?: number; te_receptions_allowed?: number;
  season?: number; // Optional: If returned by API
  week?: number;   // Optional: If returned by API
}

// --- Stat Configuration ---
interface StatConfig {
    key: string;
    label: string;
    playerDataPath: string;
    // Assumes API returns flat defensive stats objects
    defensiveCounterPath: string;
    playerChartLabelSuffix: string;
    opponentChartLabel: string;
}

// Ensure defensiveCounterPath matches the actual keys returned by your /defensive-stats API
const statOptions: StatConfig[] = [
    { key: "pass_yds", label: "Passing Yards", playerDataPath: "passing_stats.passing_yards", defensiveCounterPath: "passing_yards_allowed", playerChartLabelSuffix: "Passing Yards", opponentChartLabel: "Pass Yards Allowed" },
    { key: "pass_tds", label: "Passing TDs", playerDataPath: "passing_stats.passing_tds", defensiveCounterPath: "passing_yards_allowed", playerChartLabelSuffix: "Passing TDs", opponentChartLabel: "Pass Yards Allowed" },
    { key: "rush_yds", label: "Rushing Yards", playerDataPath: "rushing_stats.rushing_yards", defensiveCounterPath: "rushing_yards_allowed", playerChartLabelSuffix: "Rushing Yards", opponentChartLabel: "Rush Yards Allowed" },
    { key: "rush_tds", label: "Rushing TDs", playerDataPath: "rushing_stats.rushing_tds", defensiveCounterPath: "rushing_yards_allowed", playerChartLabelSuffix: "Rushing TDs", opponentChartLabel: "Rush Yards Allowed" },
    { key: "rec_yds", label: "Receiving Yards", playerDataPath: "receiving_stats.receiving_yards", defensiveCounterPath: "passing_yards_allowed", playerChartLabelSuffix: "Receiving Yards", opponentChartLabel: "Pass Yards Allowed" },
    { key: "receptions", label: "Receptions", playerDataPath: "receiving_stats.receptions", defensiveCounterPath: "passing_yards_allowed", playerChartLabelSuffix: "Receptions", opponentChartLabel: "Pass Yards Allowed" },
    { key: "carries", label: "Carries", playerDataPath: "rushing_stats.carries", defensiveCounterPath: "carries_allowed", playerChartLabelSuffix: "Carries", opponentChartLabel: "Carries Allowed" },
];

// --- Helper Function ---
const getProperty = (obj: any, path: string): any => {
  if (!obj || !path) return undefined;
  const properties = path.split('.');
  return properties.reduce((prev, curr) => (prev && prev[curr] !== undefined ? prev[curr] : undefined), obj);
};

// --- Constants ---
const API_BASE_URL = import.meta.env.VITE_API_URL || '';
console.log('Using API Base URL:', API_BASE_URL);

const nflTeams = [
    { code: 'ARI', name: 'Arizona Cardinals' }, { code: 'ATL', name: 'Atlanta Falcons' }, { code: 'BAL', name: 'Baltimore Ravens' }, { code: 'BUF', name: 'Buffalo Bills' }, { code: 'CAR', name: 'Carolina Panthers' }, { code: 'CHI', name: 'Chicago Bears' }, { code: 'CIN', name: 'Cincinnati Bengals' }, { code: 'CLE', name: 'Cleveland Browns' }, { code: 'DAL', name: 'Dallas Cowboys' }, { code: 'DEN', name: 'Denver Broncos' }, { code: 'DET', name: 'Detroit Lions' }, { code: 'GB', name: 'Green Bay Packers' }, { code: 'HOU', name: 'Houston Texans' }, { code: 'IND', name: 'Indianapolis Colts' }, { code: 'JAX', name: 'Jacksonville Jaguars' }, { code: 'KC', name: 'Kansas City Chiefs' }, { code: 'LV', name: 'Las Vegas Raiders' }, { code: 'LAC', name: 'Los Angeles Chargers' }, { code: 'LAR', name: 'Los Angeles Rams' }, { code: 'MIA', name: 'Miami Dolphins' }, { code: 'MIN', name: 'Minnesota Vikings' }, { code: 'NE', name: 'New England Patriots' }, { code: 'NO', name: 'New Orleans Saints' }, { code: 'NYG', name: 'New York Giants' }, { code: 'NYJ', name: 'New York Jets' }, { code: 'PHI', name: 'Philadelphia Eagles' }, { code: 'PIT', name: 'Pittsburgh Steelers' }, { code: 'SF', name: 'San Francisco 49ers' }, { code: 'SEA', name: 'Seattle Seahawks' }, { code: 'TB', name: 'Tampa Bay Buccaneers' }, { code: 'TEN', name: 'Tennessee Titans' }, { code: 'WAS', name: 'Washington Commanders' }
];


// --- Component ---
const PlayerStats: React.FC = () => {
  // --- State ---
  const [playerSearchTerms, setPlayerSearchTerms] = useState<string[]>(['']);
  const [focusedInputIndex, setFocusedInputIndex] = useState<number | null>(null);
  const [searchResults, setSearchResults] = useState<PlayerSearchResult[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<(PlayerSearchResult | null)[]>([null]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [season, setSeason] = useState<number | ''>('');
  const [week, setWeek] = useState<number | ''>('');
  const [selectedStatKey, setSelectedStatKey] = useState<string>(statOptions[0].key);
  const [playerGameLogs, setPlayerGameLogs] = useState<PlayerFullGameStats[][]>([]);
  const [playerChartData, setPlayerChartData] = useState<any>(null);
  const [showDefensiveSelector, setShowDefensiveSelector] = useState<boolean>(false);
  const [selectedOpponentTeam, setSelectedOpponentTeam] = useState<string>('');
  const [opponentDefChartData, setOpponentDefChartData] = useState<any>(null);
  const [opponentRawDefData, setOpponentRawDefData] = useState<OpponentDefensiveStatsData[]>([]);
  const [opponentDefLoading, setOpponentDefLoading] = useState<boolean>(false);
  const [opponentDefError, setOpponentDefError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // --- Derived State ---
  const selectedStatConfig = statOptions.find(opt => opt.key === selectedStatKey) || statOptions[0];

  // --- Dropdown Options ---
  const currentYear = new Date().getFullYear()-1;
  const years = Array.from({ length: currentYear - 2000 + 1 }, (_, i) => 2000 + i).reverse();
  const weeks = Array.from({ length: 22 }, (_, i) => i + 1);

  // --- API Calls ---
   const debouncedSearch = useCallback(
    debounce(async (searchTerm: string, index: number) => {
      if (!API_BASE_URL) { setSearchError("API URL missing"); setIsSearching(false); return; }
      if (searchTerm.trim().length < 2) { setSearchResults([]); setIsSearching(false); setSearchError(null); return; }
      console.log(`🚀 Triggering API Search: "${searchTerm}" (Index: ${index})`);
      setIsSearching(true); setSearchError(null);
      try {
        const apiUrl = `${API_BASE_URL}/search`;
        console.log(`📞 Calling API: GET ${apiUrl}?name=${searchTerm}`);
        const response = await axios.get<PlayerSearchResult[]>(apiUrl, { params: { name: searchTerm } });
        if (!Array.isArray(response.data)) { throw new Error("Invalid data format from server."); }
        setSearchResults(response.data);
      } catch (err) {
        const error = err as AxiosError<{ error?: string }>;
        console.error('❌ Search API Error:', error.response?.data || error.message);
        setSearchError(error.response?.data?.error || 'Search failed.'); setSearchResults([]);
      } finally { setIsSearching(false); }
    }, 500), []
  );

  const fetchAllPlayerStats = async () => {
    if (!API_BASE_URL) { setError("API URL missing"); return; }
    // Reset states
    setError(null); setPlayerChartData(null); setShowDefensiveSelector(false);
    setSelectedOpponentTeam(''); setOpponentDefChartData(null); setOpponentDefError(null);
    setPlayerGameLogs([]);

    const validPlayerIds = selectedPlayers.map(p => p?.id).filter((id): id is string => !!id);
    if (validPlayerIds.length === 0) { setError('Please search for and select at least one player.'); return; }
    setIsLoading(true);

    try {
        const combinedLogs: PlayerFullGameStats[][] = [];
        for (let i = 0; i < validPlayerIds.length; i++) {
            const id = validPlayerIds[i];
            const playerLogs: { [key: string]: PlayerFullGameStats } = {};
            const endpoints = {
                passing: `${API_BASE_URL}/player-passing-stats`,
                rushing: `${API_BASE_URL}/player-rushing-stats`,
                receiving: `${API_BASE_URL}/player-receiving-stats`,
            };
            console.log(`📞 Fetching all stats for Player ID: ${id}`);
            const requests = Object.entries(endpoints).map(([key, url]) =>
                axios.get<PlayerFullGameStats[]>(url, { params: { id, ...(season && { season }), ...(week && { week }) } })
                     .then(response => ({ key, data: response.data }))
                     .catch(err => {
                         console.warn(`⚠️ Failed to fetch ${key} stats for ${id}:`, err.message);
                         return { key, data: [] };
                     })
            );
            const responses = await Promise.all(requests);
            responses.forEach(response => {
                if (response && Array.isArray(response.data)) {
                    response.data.forEach(game => {
                        if (game && game.season != null && game.week != null) {
                            const gameKey = `${game.season}-${game.week}`;
                            if (!playerLogs[gameKey]) {
                                playerLogs[gameKey] = { player_id: id, season: game.season, week: game.week, opponent_team: game.opponent_team || 'N/A', };
                            }
                            if (game[`${response.key}_stats`]) {
                                playerLogs[gameKey][`${response.key}_stats`] = game[`${response.key}_stats`];
                            }
                        }
                    });
                } else {
                     console.error(`❌ Invalid data format received for ${response?.key} stats for player ${id}`);
                }
            });
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
        setError(error.response?.data?.error || error.message || 'Error fetching one or more player stats.');
        setPlayerGameLogs([]);
    } finally {
        setIsLoading(false);
    }
};


  // --- Chart Generation Effects ---

  // Generate Player Offensive Chart Data
  useEffect(() => {
    if (!playerGameLogs || playerGameLogs.length === 0 || !playerGameLogs[0] || playerGameLogs[0].length === 0) {
        setPlayerChartData(null);
        return;
    }
    console.log(`📊 Regenerating player chart for stat: ${selectedStatConfig.label}`);
    const firstPlayerData = playerGameLogs[0];
    const isSingleSeason = !!season;
    const labels = firstPlayerData.map((game, idx) => {
        if (game.opponent_team === 'BYE') return `BYE (W${game.week})`;
        const gameIndex = idx + 1;
        return isSingleSeason ? `Game ${gameIndex} (W${game.week})` : `Game ${gameIndex} (S${game.season} W${game.week})`;
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
            label: `${playerName} ${selectedStatConfig.playerChartLabelSuffix}`, data: dataArray,
            borderColor: `hsl(${idx * 120}, 60%, 60%)`, backgroundColor: `hsla(${idx * 120}, 60%, 60%, 0.1)`,
            borderWidth: 2, fill: false, tension: 0.1
        };
    });
    setPlayerChartData({ labels, datasets });
  }, [playerGameLogs, selectedStatKey, selectedPlayers, season, selectedStatConfig]);


  // Fetch AND Generate Opponent Defensive Chart Data
  useEffect(() => {
    const fetchAndGenerateOpponentChart = async () => {
       console.log("DEFENSE EFFECT 1: Triggered. Opponent:", selectedOpponentTeam, "Player Labels:", !!playerChartData?.labels?.length);

       if (!API_BASE_URL) { setOpponentDefError("API URL missing"); return; }
       if (!selectedOpponentTeam || !playerChartData?.labels?.length) {
           console.log("DEFENSE EFFECT 1: Exiting - No opponent or player labels.");
           setOpponentDefChartData(null);
           setOpponentRawDefData([]);
           return;
       }

       setOpponentDefLoading(true); setOpponentDefError(null); setOpponentDefChartData(null);
       const gameCount = playerChartData.labels.length;

       try {
           const apiUrl = `${API_BASE_URL}/defensive-stats`;
           const params = { team: selectedOpponentTeam, ...(season && { season }), ...(week && { week }) };
           console.log(`DEFENSE EFFECT 1: Fetching ${apiUrl} with params:`, params);
           const response = await axios.get<any[]>(apiUrl, { params });
           console.log("DEFENSE EFFECT 1: API Response raw data:", JSON.stringify(response.data));

           if (!response.data || !Array.isArray(response.data)) {
               console.error("DEFENSE EFFECT 1: API response data is not a valid array:", response.data);
               throw new Error("Invalid data format received from server for defensive stats.");
           }

           let opponentData = response.data.filter(d => d !== null && typeof d === 'object');
           console.log("DEFENSE EFFECT 1: Filtered opponent data (should be array of objects):", opponentData);

           if (opponentData.length !== gameCount) {
               console.warn(`DEFENSE EFFECT 1: Data count (${opponentData.length}) mismatch with player game count (${gameCount}). Alignment might be off.`);
               // Ideally, API data should align with player games based on season/week filters
               // Simple slicing might lead to incorrect matchups if data isn't perfectly ordered
           }

           if (opponentData.length === 0 && gameCount > 0) {
               console.error("DEFENSE EFFECT 1: No valid defensive data objects found after filtering.");
               setOpponentDefError(`No defensive data found for ${selectedOpponentTeam} matching criteria.`);
               setOpponentRawDefData([]);
               setOpponentDefLoading(false);
               return;
           }

           setOpponentRawDefData(opponentData);

           // --- Chart Generation ---
           const defensiveStatPath = selectedStatConfig.defensiveCounterPath;
           console.log(`DEFENSE EFFECT 1: Generating chart using path: "${defensiveStatPath}"`);

           const defensiveData = Array.from({ length: gameCount }, (_, i) => {
               const gameDefObject = opponentData[i]; // Get the defensive data for this game index
               if (!gameDefObject) {
                   console.warn(`DEFENSE EFFECT 1: Missing defensive data for game index ${i}`);
                   return 0;
               }
               const statValue = getProperty(gameDefObject, defensiveStatPath);
               console.log(`DEFENSE EFFECT 1: Game Index ${i}, Path: "${defensiveStatPath}", Raw Value: ${statValue}, Object: ${JSON.stringify(gameDefObject)}`);
               return Number(statValue) || 0;
           });
           console.log("DEFENSE EFFECT 1: Generated chart data array:", defensiveData);

           const labels = playerChartData.labels;
           const newChartData = {
               labels,
               datasets: [
                   {
                       label: `${selectedOpponentTeam} ${selectedStatConfig.opponentChartLabel}`, data: defensiveData,
                       backgroundColor: 'rgba(255, 99, 132, 0.6)', borderColor: 'rgb(255, 99, 132)',
                       borderWidth: 1, barPercentage: 0.6, categoryPercentage: 0.7
                   },
               ],
           };
           console.log("DEFENSE EFFECT 1: Setting opponent chart state:", newChartData);
           setOpponentDefChartData(newChartData);
           // --- End Chart Generation ---

       } catch (err: any) {
           const error = err as AxiosError<{ error?: string }>;
           console.error("❌ DEFENSE EFFECT 1: Error fetching/processing stats:", error.response?.data || error.message);
           setOpponentDefError(error.response?.data?.error || err.message || `Failed to fetch/process stats for ${selectedOpponentTeam}.`);
           setOpponentRawDefData([]);
       } finally {
           setOpponentDefLoading(false);
       }
    };

    fetchAndGenerateOpponentChart();
   // Dependencies include selectedStatConfig now
   }, [selectedOpponentTeam, playerChartData, season, week, selectedStatConfig]);


   // Effect to regenerate opponent chart when ONLY the selected offensive stat changes
   useEffect(() => {
        console.log("DEFENSE EFFECT 2: Triggered. StatKey:", selectedStatKey, "Raw Data Length:", opponentRawDefData.length);

        if (!selectedOpponentTeam || !playerChartData?.labels?.length || opponentRawDefData.length === 0) {
            console.log("DEFENSE EFFECT 2: Exiting - missing data.");
            setOpponentDefChartData(null);
            return;
        }

        // --- Chart Generation (using stored opponentRawDefData) ---
        const gameCount = playerChartData.labels.length;
        const defensiveStatPath = selectedStatConfig.defensiveCounterPath;
        console.log(`DEFENSE EFFECT 2: Regenerating chart using path: "${defensiveStatPath}"`);

        const defensiveData = Array.from({ length: gameCount }, (_, i) => {
            const gameDefObject = opponentRawDefData[i];
            if (!gameDefObject) {
                console.warn(`DEFENSE EFFECT 2: Missing stored defensive data for game index ${i}`);
                return 0;
            }
            const statValue = getProperty(gameDefObject, defensiveStatPath);
            console.log(`DEFENSE EFFECT 2: Game Index ${i}, Path: "${defensiveStatPath}", Raw Value: ${statValue}, Object: ${JSON.stringify(gameDefObject)}`);
            return Number(statValue) || 0;
        });
        console.log("DEFENSE EFFECT 2: Regenerated chart data array:", defensiveData);

        const labels = playerChartData.labels;
        const newChartData = {
            labels,
            datasets: [
                {
                    label: `${selectedOpponentTeam} ${selectedStatConfig.opponentChartLabel}`, data: defensiveData,
                    backgroundColor: 'rgba(255, 99, 132, 0.6)', borderColor: 'rgb(255, 99, 132)',
                    borderWidth: 1, barPercentage: 0.6, categoryPercentage: 0.7
                },
            ],
        };
        console.log("DEFENSE EFFECT 2: Setting opponent chart state:", newChartData);
        setOpponentDefChartData(newChartData);
        // --- End Chart Generation ---

   }, [selectedStatKey, opponentRawDefData, playerChartData, selectedOpponentTeam, selectedStatConfig]);


  // --- Event Handlers ---
   const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
       const term = e.target.value;
       const newTerms = [...playerSearchTerms]; newTerms[index] = term;
       setPlayerSearchTerms(newTerms); setFocusedInputIndex(index);
       setSearchResults([]); setSearchError(null);
       debouncedSearch(term, index);
   };
   const handleSelectPlayer = (player: PlayerSearchResult, index: number) => {
       const newSelected = [...selectedPlayers]; newSelected[index] = player;
       setSelectedPlayers(newSelected);
       const newTerms = [...playerSearchTerms]; newTerms[index] = '';
       setPlayerSearchTerms(newTerms); setSearchResults([]);
       setFocusedInputIndex(null); setSearchError(null);
   };
   const handleClearSelection = (index: number) => {
       const newSelected = [...selectedPlayers]; newSelected[index] = null;
       setSelectedPlayers(newSelected);
       const newTerms = [...playerSearchTerms]; newTerms[index] = '';
       setPlayerSearchTerms(newTerms); setSearchResults([]);
       setFocusedInputIndex(null); setSearchError(null);
   };
   const addPlayerSearchField = () => {
       if (selectedPlayers.length < 3) {
           setSelectedPlayers(prev => [...prev, null]);
           setPlayerSearchTerms(prev => [...prev, '']);
       }
   };
   const handleSubmit = (e: React.FormEvent) => {
       e.preventDefault();
       fetchAllPlayerStats();
   };
   const toggleDefensiveSection = () => {
       console.log("Toggling defensive section. Current state (before toggle):", showDefensiveSelector);
       // Use functional update for state based on previous state
       setShowDefensiveSelector(prevShow => {
            // If turning off (prevShow was true), clear the state
            if (prevShow) {
                setSelectedOpponentTeam('');
                setOpponentDefChartData(null);
                setOpponentDefError(null);
                setOpponentRawDefData([]);
                console.log("Cleared opponent defensive state because section is closing.");
            }
            // Return the new state
            return !prevShow;
       });
   };

  // --- Render ---
  return (
    <div className="stats-container"> {/* Ensure this class is styled in global.css */}
      <h2>Player {selectedStatConfig.playerChartLabelSuffix} Stats</h2>

      <form className="stats-form player-stats-form" onSubmit={handleSubmit}> {/* Ensure classes match CSS file */}
         {/* Player Search Fields */}
         {selectedPlayers.map((selectedPlayer, idx) => (
          <div key={idx} className="player-search-input-container">
             <label htmlFor={`player-search-${idx}`}> Player {idx + 1}: </label>
             <div className="input-group">
                <input id={`player-search-${idx}`} type="text" placeholder="Search Player Name..." value={selectedPlayer ? selectedPlayer.name : playerSearchTerms[idx]} onChange={(e) => handleSearchChange(e, idx)} onFocus={() => { if (selectedPlayer) { handleClearSelection(idx); } setFocusedInputIndex(idx); setSearchResults([]); setSearchError(null); }} onBlur={() => { setTimeout(() => { if (focusedInputIndex === idx) { setFocusedInputIndex(null); } }, 200); }} autoComplete="off" />
               {selectedPlayer && ( <button type="button" className="clear" onClick={() => handleClearSelection(idx)} title="Clear selection" > X </button> )}
             </div>
             <div className="search-status" style={{ height: '1.2em', marginTop: '4px' }}>
                {focusedInputIndex === idx && isSearching && <span className="searching">Searching...</span>}
                {focusedInputIndex === idx && searchError && <span className="error">{searchError}</span>}
             </div>
             {/* Updated Search Results Display */}
            {focusedInputIndex === idx && searchResults.length > 0 && !selectedPlayer && (
              <ul className="search-results-list">
                {searchResults.map((player) => (
                  <li key={player.id} onMouseDown={() => handleSelectPlayer(player, idx)} >
                    {player.name} {/* Only Name */}
                  </li>
                ))}
              </ul>
             )}
          </div>
        ))}
        {selectedPlayers.length < 3 && ( <button type="button" className="secondary" onClick={addPlayerSearchField}> Add Player </button> )}

        {/* Filters Group */}
        {/* Added align-items: flex-end to match form alignment */}
        <div style={{display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap', width: '100%', justifyContent: 'center'}}>
             <label htmlFor="stat-select"> Stat:
                 <select id="stat-select" value={selectedStatKey} onChange={(e) => setSelectedStatKey(e.target.value)}>
                    {statOptions.map((option) => ( <option key={option.key} value={option.key}>{option.label}</option> ))}
                 </select>
             </label>
            <label htmlFor="year-select"> Year:
                <select id="year-select" value={season} onChange={(e) => setSeason(e.target.value ? Number(e.target.value) : '')}>
                    <option value="">All Seasons</option> {years.map((yr) => (<option key={yr} value={yr}>{yr}</option>))}
                </select>
            </label>
            <label htmlFor="week-select"> Week:
                <select id="week-select" value={week} onChange={(e) => setWeek(e.target.value ? Number(e.target.value) : '')} disabled={!season}>
                    <option value="">All Weeks</option> {weeks.map((wk) => (<option key={wk} value={wk}>{wk}</option>))}
                </select>
            </label>
        </div>

        {/* Submit Button - Added class for alignment */}
        <button className="submit-button" type="submit" disabled={isLoading || selectedPlayers.every(p => p === null)} style={{marginTop: '1rem'}}>
             {isLoading ? 'Loading...' : 'Get Stats'}
        </button>
      </form>

      {/* General Errors & Loading Indicators */}
      {error && <p className="error-message">{error}</p>}
      {isLoading && <p className="loading-text">Loading player data...</p>}

      {/* Player Chart */}
      {playerChartData && !isLoading && (
        <div className="chart-container">
          <Chart data={playerChartData} />
        </div>
      )}

      {/* Defensive Strength Button */}
      {playerChartData && !isLoading && (
        <button className="toggle-defense-button" onClick={toggleDefensiveSection} >
            <span style={{ marginRight: '8px', fontSize: '1.2em' }}>+</span> See Defensive Strength
        </button>
      )}

      {/* Opponent Defensive Section */}
      {showDefensiveSelector && playerChartData && (
        <div className="opponent-defensive-section">
           <h3>Opponent Defensive Performance ({selectedStatConfig.opponentChartLabel})</h3>
           <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            <label htmlFor="opponent-select" style={{ color: 'var(--text-muted)', marginRight: '10px' }}>Select Team:</label>
            <select id="opponent-select" value={selectedOpponentTeam} onChange={(e) => setSelectedOpponentTeam(e.target.value)} >
              <option value="">-- Select Opponent --</option>
              {nflTeams.map(team => (<option key={team.code} value={team.code}>{team.name} ({team.code})</option>))}
            </select>
           </div>

           {/* Loading/Error/Chart */}
           {opponentDefLoading && <p className="loading-text">Loading defensive stats...</p>}
           {opponentDefError && <p className="error-message">{opponentDefError}</p>}
           {opponentDefChartData && !opponentDefLoading && !opponentDefError && (
             <div className="chart-container">
               <Chart data={opponentDefChartData} />
             </div>
           )}
        </div>
      )}
    </div> // End stats-container
  );
};

export default PlayerStats;