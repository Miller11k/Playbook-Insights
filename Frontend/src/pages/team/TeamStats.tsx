import React, { useState, useEffect, useCallback } from 'react';
import axios, { AxiosError } from 'axios';
import Chart from '../../components/charts/Chart'; // Ensure casing is correct: components
import './TeamStats.css'; // Use a shared or specific CSS file
import { debounce } from 'lodash';

// --- Interfaces ---
interface TeamSearchResult { code: string; name: string; } // For team search results

// Updated interface for game data, expecting positional receiving yards from new endpoint
interface TeamGameData {
    season: number;
    week: number;
    opponent_team: string;
    aggregated_passing_stats?: { [key: string]: any };
    aggregated_rushing_stats?: { [key: string]: any };
    // Fields expected from the new /api/team-positional-receiving endpoint
    wr_yards?: number;
    te_yards?: number;
    rb_yards?: number; // Or rb_receiving_yards
    // Fields from /api/defensive-stats endpoint
    defensive_stats?: { [key: string]: any };
    [key: string]: any;
}

// --- Stat Configuration ---
interface StatDetail {
    labelSuffix: string;
    dataPath: string;    // Dot notation path relative to each item in the response array
    color: string;
    borderColor: string;
}

interface TeamStatConfig {
    key: string;
    label: string;
    endpoint: string; // API endpoint path (relative to API_BASE_URL)
    statsToDisplay: StatDetail[];
}

// Helper to safely get nested properties
const getProperty = (obj: any, path: string): any => {
  if (!obj || !path) return undefined;
  if (!path.includes('.')) { return obj[path]; }
  return path.split('.').reduce((prev, curr) => (prev && prev[curr] !== undefined ? prev[curr] : undefined), obj);
};

// Configuration for different stat categories
// ** FIX: Updated Receiving category endpoint and dataPaths **
const categoryOptions: TeamStatConfig[] = [
    {
        key: "passing", label: "Passing Stats", endpoint: "/passing-stats",
        statsToDisplay: [
            { labelSuffix: "Passing Yards", dataPath: "aggregated_passing_stats.passing_yards", color: 'rgba(54, 162, 235, 0.6)', borderColor: 'rgb(54, 162, 235)' },
            { labelSuffix: "Passing TDs", dataPath: "aggregated_passing_stats.passing_tds", color: 'rgba(255, 99, 132, 0.6)', borderColor: 'rgb(255, 99, 132)' },
            { labelSuffix: "Completions", dataPath: "aggregated_passing_stats.completions", color: 'rgba(75, 192, 192, 0.6)', borderColor: 'rgb(75, 192, 192)' },
        ]
    },
    {
        key: "rushing", label: "Rushing Stats", endpoint: "/rushing-stats",
        statsToDisplay: [
            { labelSuffix: "Rushing Yards", dataPath: "aggregated_rushing_stats.rushing_yards", color: 'rgba(75, 192, 192, 0.6)', borderColor: 'rgb(75, 192, 192)' },
            { labelSuffix: "Rushing TDs", dataPath: "aggregated_rushing_stats.rushing_tds", color: 'rgba(255, 159, 64, 0.6)', borderColor: 'rgb(255, 159, 64)' },
            { labelSuffix: "Carries", dataPath: "aggregated_rushing_stats.carries", color: 'rgba(153, 102, 255, 0.6)', borderColor: 'rgb(153, 102, 255)' },
        ]
    },
    {
        // ** UPDATED CATEGORY to show OFFENSIVE positional receiving yards **
        key: "receiving", // Changed key back
        label: "Receiving Stats (Positional)", // Changed label
        // ** ASSUMES NEW ENDPOINT exists that calculates and returns this **
        endpoint: "/api/team-positional-receiving", // NEW Endpoint needed
        statsToDisplay: [
            // Displaying offensive yards gained *by* the selected team's positions
            // Assumes the new API returns top-level fields like wr_yards, te_yards etc.
            { labelSuffix: "WR Yards", dataPath: "wr_yards", color: 'rgba(255, 99, 132, 0.6)', borderColor: 'rgb(255, 99, 132)' },
            { labelSuffix: "TE Yards", dataPath: "te_yards", color: 'rgba(54, 162, 235, 0.6)', borderColor: 'rgb(54, 162, 235)' },
            { labelSuffix: "RB Yards", dataPath: "rb_yards", color: 'rgba(255, 205, 86, 0.6)', borderColor: 'rgb(255, 205, 86)' }, // Or rb_receiving_yards
        ]
    },
    // Removed the general "defense" category as requested
];

// --- Constants ---
const API_BASE_URL = import.meta.env.VITE_API_URL || '';
console.log('Using API Base URL:', API_BASE_URL);

// --- Component ---
const TeamStats: React.FC = () => {
  // --- State ---
  // Team Selection State
  const [teamSearchTerm, setTeamSearchTerm] = useState<string>('');
  const [teamSearchResults, setTeamSearchResults] = useState<TeamSearchResult[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<TeamSearchResult | null>(null);
  const [isSearchingTeams, setIsSearchingTeams] = useState<boolean>(false);
  const [searchTeamError, setSearchTeamError] = useState<string | null>(null);
  // Filters and Category
  const [season, setSeason] = useState<number | ''>('');
  const [week, setWeek] = useState<number | ''>('');
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string>(categoryOptions[0].key);
  // Data and Chart
  const [rawData, setRawData] = useState<TeamGameData[]>([]);
  const [chartData, setChartData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null); // General fetch error
  const [isLoading, setIsLoading] = useState<boolean>(false);

   // --- Derived State ---
  const selectedCategoryConfig = categoryOptions.find(opt => opt.key === selectedCategoryKey) || categoryOptions[0];

  // --- Dropdown Options ---
  const currentYear = new Date().getFullYear()-1;
  const years = Array.from({ length: currentYear - 2000 + 1 }, (_, i) => 2000 + i).reverse();
  const weeks = Array.from({ length: 22 }, (_, i) => i + 1);

  // --- API Calls ---
  // Debounced Team Search
  const debouncedTeamSearch = useCallback(
    debounce(async (searchTerm: string) => {
      if (!API_BASE_URL) { setSearchTeamError("API URL missing"); setIsSearchingTeams(false); return; }
      if (searchTerm.trim().length < 2) { setTeamSearchResults([]); setIsSearchingTeams(false); setSearchTeamError(null); return; }

      console.log(`🚀 Triggering API Team Search: "${searchTerm}"`);
      setIsSearchingTeams(true); setSearchTeamError(null);
      try {
        // ** NEW API ENDPOINT for team search **
        const apiUrl = `${API_BASE_URL}/search-team`; // Assuming this path
        console.log(`📞 Calling API: GET ${apiUrl}?query=${searchTerm}`);
        const response = await axios.get<TeamSearchResult[]>(apiUrl, { params: { query: searchTerm } }); // Use 'query' param? Or 'name'? Check API.
        if (!Array.isArray(response.data)) { throw new Error("Invalid data format from server."); }
        setTeamSearchResults(response.data);
      } catch (err) {
        const error = err as AxiosError<{ error?: string }>;
        console.error('❌ Team Search API Error:', error.response?.data || error.message);
        setSearchTeamError(error.response?.data?.error || 'Team search failed.'); setTeamSearchResults([]);
      } finally { setIsSearchingTeams(false); }
    }, 500), []
  );


  // --- Data Fetching (Only called by handleSubmit now) ---
  const fetchData = useCallback(async () => {
    // Use selectedTeam?.code instead of teamCode
    const currentTeamCode = selectedTeam?.code;

    if (!API_BASE_URL) { setError("API URL missing"); return; }
    if (!currentTeamCode) { setError('Please search for and select a team.'); return; } // Changed validation
    if (!selectedCategoryConfig) { setError('Invalid category selected.'); return; }

    setIsLoading(true); setError(null); setChartData(null); setRawData([]);

    try {
      // Use currentTeamCode from selectedTeam state
      const params: { team: string; season?: number; week?: number } = { team: currentTeamCode };
      if (season) params.season = season;
      if (week) params.week = week;

      const unifiedUrl = `${API_BASE_URL}/`;
      console.log(`📞 Calling API: GET ${unifiedUrl} with headers x-entity-type=team, x-stats-type=${selectedCategoryConfig.key} and params:`, params);
      const response = await axios.get<TeamGameData[]>(unifiedUrl, {
        headers: {
            'x-entity-type': 'team',
            'x-stats-type' : selectedCategoryConfig.key
        },
        params
      });

      if (!Array.isArray(response.data)) {
          console.error("API did not return an array:", response.data);
          throw new Error("Received invalid data format from server.");
      }

      const filteredData = response.data.filter((item): item is TeamGameData =>
          item !== null && typeof item === 'object' && item.season != null && item.week != null && item.opponent_team != null
      );

       if (!filteredData.length) {
        setError(`No ${selectedCategoryConfig.label.toLowerCase()} found for the specified criteria.`);
      } else {
          console.log(`✅ Received ${filteredData.length} valid game logs for ${selectedCategoryConfig.label}`);
          setRawData(filteredData);
      }

    } catch (err: any) {
      const error = err as AxiosError<{ error?: string }>;
      console.error(`❌ Error fetching team ${selectedCategoryConfig.key} stats:`, error.response?.status, error.response?.data || error.message);
      if (error.response?.status === 404) {
          setError(`API endpoint not found for ${selectedCategoryConfig.label} (${selectedCategoryConfig.endpoint}). Check backend routes.`);
      } else {
          const errorMsg = error.response?.data?.error || error.message || 'An error occurred while fetching stats.';
          setError(`Failed to fetch stats: ${errorMsg}`);
      }
      setRawData([]);
    } finally {
      setIsLoading(false);
    }
  // Update dependencies for useCallback
  }, [selectedTeam, season, week, selectedCategoryConfig]);

  // --- Chart Generation Effect ---
  useEffect(() => {
    if (!rawData || rawData.length === 0 || !selectedCategoryConfig || !selectedTeam) { // Need selectedTeam for label
        setChartData(null);
        return;
    }
    console.log(`📊 Generating chart for: ${selectedCategoryConfig.label}`);

    const isSingleSeason = !!season;
    const labels = rawData.map((game, idx) => {
        if (game.opponent_team === 'BYE') return `BYE (W${game.week})`;
        const gameIndex = idx + 1;
        return isSingleSeason ? `Game ${gameIndex} (W${game.week})` : `Game ${gameIndex} (S${game.season} W${game.week})`;
    });

    const datasets = selectedCategoryConfig.statsToDisplay.map(statConfig => {
        const dataArray = rawData.map(game => {
            const statValue = getProperty(game, statConfig.dataPath);
            return game.opponent_team === 'BYE' ? 0 : Number(statValue) || 0;
        });
        return {
            // Use selectedTeam.code for the label
            label: `${selectedTeam.code} ${statConfig.labelSuffix}`,
            data: dataArray,
            backgroundColor: statConfig.color,
            borderColor: statConfig.borderColor,
            borderWidth: 1,
            barPercentage: 0.7,
            categoryPercentage: 0.8,
        };
    });

    setChartData({ labels, datasets });

  // Update dependencies for chart generation
  }, [rawData, selectedCategoryConfig, selectedTeam, season]);


  // --- Event Handlers ---
  const handleTeamSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const term = e.target.value;
      setTeamSearchTerm(term);
      // Clear selection when user starts typing again
      if (selectedTeam) {
          setSelectedTeam(null);
          setRawData([]); // Clear old data if selection is cleared
          setChartData(null);
      }
      debouncedTeamSearch(term);
  };

   const handleSelectTeam = (team: TeamSearchResult) => {
       console.log(`Team selected:`, team);
       setSelectedTeam(team);
       setTeamSearchTerm(''); // Clear search term visually
       setTeamSearchResults([]); // Hide results
       setSearchTeamError(null);
       // Do NOT fetch data here, wait for submit button
   };

   const handleClearTeamSelection = () => {
       setSelectedTeam(null);
       setTeamSearchTerm('');
       setTeamSearchResults([]);
       setSearchTeamError(null);
       setRawData([]); // Clear data when selection is cleared
       setChartData(null);
   };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Get Stats button clicked");
     // Check if a team is selected before fetching
    if (!selectedTeam) {
        setError("Please search for and select a team first.");
        return;
    }
    fetchData(); // Fetch data on submit
  };

  // --- Render ---
  return (
    <div className="stats-container">
      {/* Dynamic Title */}
      <h2>Team {selectedCategoryConfig.label}</h2>

      {/* Form */}
      <form className="stats-form" onSubmit={handleSubmit} style={{maxWidth: '900px'}}> {/* Wider form? */}

         {/* Team Search Input */}
         <div className="player-search-input-container" style={{width: '100%', maxWidth: '350px'}}> {/* Style container */}
             <label htmlFor="team-search-input"> Team: </label>
             <div className="input-group">
                <input
                    id="team-search-input"
                    type="text"
                    placeholder="Search Team..."
                    value={selectedTeam ? selectedTeam.name : teamSearchTerm}
                    onChange={handleTeamSearchChange}
                    onFocus={() => {
                        // Clear selection to allow searching again
                        if (selectedTeam) { handleClearTeamSelection(); }
                        setTeamSearchResults([]);
                        setSearchTeamError(null);
                    }}
                    onBlur={() => { setTimeout(() => { setTeamSearchResults([]); /* Hide results on blur */ }, 200); }}
                    autoComplete="off"
                />
               {selectedTeam && (
                   <button type="button" className="clear" onClick={handleClearTeamSelection} title="Clear selection" > X </button>
               )}
             </div>
             <div className="search-status" style={{ height: '1.2em', marginTop: '4px' }}>
                {isSearchingTeams && <span className="searching">Searching...</span>}
                {searchTeamError && <span className="error">{searchTeamError}</span>}
             </div>
            {/* Team Search Results Dropdown */}
            {teamSearchResults.length > 0 && !selectedTeam && (
                 <ul className="search-results-list">
                    {teamSearchResults.map((team) => (
                    <li key={team.code} onMouseDown={() => handleSelectTeam(team)} >
                        {team.name} ({team.code})
                    </li>
                    ))}
                </ul>
            )}
          </div>

         {/* Category Selector */}
         <label htmlFor="category-select"> Stat Category:
            <select id="category-select" value={selectedCategoryKey} onChange={(e) => setSelectedCategoryKey(e.target.value)} >
                {categoryOptions.map((option) => (
                    <option key={option.key} value={option.key}>{option.label}</option>
                ))}
            </select>
         </label>

        {/* Filters */}
        <label htmlFor="year-select-team"> Year:
            <select id="year-select-team" value={season} onChange={(e) => setSeason(e.target.value ? Number(e.target.value) : '')}>
                <option value="">All Seasons</option>
                {years.map((yr) => (<option key={yr} value={yr}>{yr}</option>))}
            </select>
        </label>
        <label htmlFor="week-select-team"> Week:
            <select id="week-select-team" value={week} onChange={(e) => setWeek(e.target.value ? Number(e.target.value) : '')} disabled={!season}>
                <option value="">All Weeks</option>
                {weeks.map((wk) => (<option key={wk} value={wk}>{wk}</option>))}
            </select>
        </label>

        {/* Submit Button */}
        <button className="submit-button" type="submit" disabled={isLoading || !selectedTeam}> {/* Disable if no team selected */}
            {isLoading ? 'Loading...' : 'Get Stats'}
        </button>
      </form>

      {/* Error Message */}
      {error && <p className="error-message">{error}</p>}
      {/* Loading Indicator */}
      {isLoading && <p className="loading-text">Loading data...</p>}

      {/* Chart Display */}
      {chartData && !isLoading && (
        <div className="chart-container">
          <Chart data={chartData} />
        </div>
      )}
    </div>
  );
};

export default TeamStats;
