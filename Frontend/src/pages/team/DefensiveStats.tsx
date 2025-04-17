import React, { useState, useEffect, useCallback } from 'react';
import axios, { AxiosError } from 'axios';
import Chart from '../../components/charts/Chart';
// Assuming TeamStats.css contains styles for the form AND search components
import './TeamStats.css';
// Import debounce
import { debounce } from 'lodash';

// --- Interfaces ---
// Interface for the defensive stats object expected from the API
interface DefensiveStats {
  passing_yards_allowed?: number;
  rushing_yards_allowed?: number;
  te_yards_allowed?: number;
  wr_yards_allowed?: number;
  rb_receiving_yards_allowed?: number;
  te_receptions_allowed?: number;
  wr_receptions_allowed?: number;
  rb_receptions_allowed?: number;
  carries_allowed?: number;
  sacks?: number;
  interceptions?: number;
  [key: string]: number | undefined;
}

// Interface for team search results (copied from TeamStats)
interface TeamSearchResult { code: string; name: string; }

// --- Constants ---
// Copied from TeamStats - adjust if needed
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'; // Ensure this is correct
console.log('DEF STATS Using API Base URL:', API_BASE_URL);

// Define available defensive stats for selection (keep as is)
const defensiveStatOptions: { value: keyof DefensiveStats; label: string }[] = [
  { value: 'passing_yards_allowed', label: 'Passing Yards Allowed' },
  { value: 'rushing_yards_allowed', label: 'Rushing Yards Allowed' },
  { value: 'sacks', label: 'Sacks' },
  { value: 'interceptions', label: 'Interceptions' },
  { value: 'te_yards_allowed', label: 'TE Yards Allowed' },
  { value: 'wr_yards_allowed', label: 'WR Yards Allowed' },
  { value: 'rb_receiving_yards_allowed', label: 'RB Receiving Yards Allowed' },
  { value: 'te_receptions_allowed', label: 'TE Receptions Allowed' },
  { value: 'wr_receptions_allowed', label: 'WR Receptions Allowed' },
  { value: 'rb_receptions_allowed', label: 'RB Receptions Allowed' },
  { value: 'carries_allowed', label: 'Carries Allowed' },
];

// --- Component ---
const TeamDefensiveStats: React.FC = () => {
  // --- State ---
  // REMOVED: const [teamCode, setTeamCode] = useState('');
  // ADDED: Team Search State (from TeamStats)
  const [teamSearchTerm, setTeamSearchTerm] = useState<string>('');
  const [teamSearchResults, setTeamSearchResults] = useState<TeamSearchResult[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<TeamSearchResult | null>(null); // Replaces teamCode state
  const [isSearchingTeams, setIsSearchingTeams] = useState<boolean>(false);
  const [searchTeamError, setSearchTeamError] = useState<string | null>(null);

  // Filters State (keep as is)
  const [season, setSeason] = useState<number | ''>('');
  const [week, setWeek] = useState<number | ''>('');
  const [selectedStat, setSelectedStat] = useState<keyof DefensiveStats>(defensiveStatOptions[0].value);

  // Data & UI State (keep as is)
  const [rawData, setRawData] = useState<DefensiveStats[]>([]);
  const [chartData, setChartData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // --- Dropdown Options (keep as is) ---
  const currentYear = new Date().getFullYear()-1;
  const years = Array.from({ length: currentYear - 2000 + 1 }, (_, i) => 2000 + i).reverse();
  const weeks = Array.from({ length: 22 }, (_, i) => i + 1);

  // --- API Calls ---
  // ADDED: Debounced Team Search (from TeamStats)
   const debouncedTeamSearch = useCallback(
    debounce(async (searchTerm: string) => {
      if (!API_BASE_URL) { setSearchTeamError("API URL missing"); setIsSearchingTeams(false); return; }
      if (searchTerm.trim().length < 2) { setTeamSearchResults([]); setIsSearchingTeams(false); setSearchTeamError(null); return; }

      console.log(`🚀 Triggering API Team Search: "${searchTerm}"`);
      setIsSearchingTeams(true); setSearchTeamError(null);
      try {
        // Ensure this endpoint exists on your backend
        const apiUrl = `${API_BASE_URL}/search-team`;
        console.log(`📞 Calling API: GET ${apiUrl}?query=${searchTerm}`);
        const response = await axios.get<TeamSearchResult[]>(apiUrl, { params: { query: searchTerm } });
        if (!Array.isArray(response.data)) { throw new Error("Invalid data format from server."); }
        setTeamSearchResults(response.data);
      } catch (err) {
        const error = err as AxiosError<{ error?: string }>;
        console.error('❌ Team Search API Error:', error.response?.data || error.message);
        setSearchTeamError(error.response?.data?.error || 'Team search failed.'); setTeamSearchResults([]);
      } finally { setIsSearchingTeams(false); }
    }, 500), [] // Add API_BASE_URL if needed, though it's read outside
  );


  // MODIFIED: Function to fetch data - uses selectedTeam.code
  const fetchData = async () => {
    // Use selectedTeam?.code instead of teamCode
    const currentTeamCode = selectedTeam?.code;

    if (!currentTeamCode) { // Check selectedTeam instead of teamCode
      setError('Please search for and select a team.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setChartData(null);
    setRawData([]);

    try {
      const params: { team: string; season?: number; week?: number } = {
        team: currentTeamCode, // Use code from selected team
      };
      if (season) params.season = season;
      if (week) params.week = week;

      // Assuming the endpoint is correct for defensive stats
      const unifiedUrl = `${API_BASE_URL}/`;
      console.log(`DEF STATS: Calling ${unifiedUrl} with headers x-entity-type=team, x-stats-type=defensive and params:`, params);
      const response = await axios.get<DefensiveStats[]>(unifiedUrl, {
        headers: {
          'x-entity-type': 'team',
          'x-stats-type' : 'defensive'
        },
        params
      });
      console.log(`DEF STATS: Received raw data:`, response.data);

      const filteredData = response.data.filter((item): item is DefensiveStats => item !== null && typeof item === 'object');

      if (!filteredData.length) {
        setError('No defensive stats found for the specified criteria.');
        setRawData([]);
      } else {
        setRawData(filteredData);
      }
    } catch (err: any) {
      const error = err as AxiosError; // Use AxiosError for better type checking
      console.error('Error fetching defensive stats:', err);
      // Check for network error vs API error response
      if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          //  setError(error.response.data? || `API Error: ${error.response.status}`);
      } else if (error.request) {
          // The request was made but no response was received
           setError('Network Error: Could not reach API server.');
      } else {
           // Something happened in setting up the request that triggered an Error
           setError(`Request Setup Error: ${error.message}`);
      }
      setRawData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // MODIFIED: Handle form submission - checks selectedTeam
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam) { // Check if a team is selected
        setError("Please search for and select a team first.");
        return;
    }
    fetchData();
  };

  // ADDED: Event Handlers for Team Search (from TeamStats)
  const handleTeamSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const term = e.target.value;
      setTeamSearchTerm(term);
      // Clear selection when user starts typing again
      if (selectedTeam) {
          setSelectedTeam(null);
          setRawData([]); // Clear old data
          setChartData(null); // Clear chart
          setError(null); // Clear errors
      }
      // Reset search results and trigger debounced search
      setTeamSearchResults([]);
      setSearchTeamError(null);
      debouncedTeamSearch(term);
  };

   const handleSelectTeam = (team: TeamSearchResult) => {
       console.log(`Team selected:`, team);
       setSelectedTeam(team);
       setTeamSearchTerm(''); // Clear search term visually
       setTeamSearchResults([]); // Hide results
       setSearchTeamError(null);
       // Optionally trigger fetchData here OR rely on submit button
       // fetchData(); // <-- Uncomment this if you want data to load immediately on selection
   };

   const handleClearTeamSelection = () => {
       setSelectedTeam(null);
       setTeamSearchTerm('');
       setTeamSearchResults([]);
       setSearchTeamError(null);
       setRawData([]); // Clear data
       setChartData(null); // Clear chart
       setError(null); // Clear errors
   };


  // MODIFIED: Effect hook to update chart data - uses selectedTeam.code for label
  useEffect(() => {
    if (rawData.length > 0 && selectedStat && selectedTeam) { // Check selectedTeam
      const labels = rawData.map((_, idx) => `Game ${idx + 1}`);
      const dataPoints = rawData.map((item) => {
        const value = item[selectedStat];
        return typeof value === 'number' ? value : 0;
      });
      const statLabel = defensiveStatOptions.find(opt => opt.value === selectedStat)?.label || selectedStat;

      setChartData({
        labels,
        datasets: [
          {
            label: `${statLabel} (${selectedTeam.code})`, // Use selectedTeam.code
            data: dataPoints,
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            borderColor: 'rgb(255, 99, 132)',
            borderWidth: 1,
          },
        ],
      });
    } else {
      setChartData(null);
    }
  // Update dependency array
  }, [rawData, selectedStat, selectedTeam]); // Use selectedTeam instead of teamCode

  // --- Render ---
  return (
    <div className="stats-container">
      <h2>Team Defensive Stats</h2>

      {/* Form */}
      <form className="stats-form" onSubmit={handleSubmit}>
        {/* ADDED: Team Search Input (replaces simple text input) */}
        {/* Using player-search-input-container class for structure/styling consistency */}
        <div className="player-search-input-container" style={{width: '100%', maxWidth: '350px'}}>
            <label htmlFor="team-search-input"> Team: </label>
            <div className="input-group">
              <input
                  id="team-search-input"
                  type="text"
                  placeholder="Search Team..."
                  value={selectedTeam ? selectedTeam.name : teamSearchTerm} // Display name or search term
                  onChange={handleTeamSearchChange}
                  onFocus={() => {
                      if (selectedTeam) { handleClearTeamSelection(); } // Clear selection on focus if already selected
                      setTeamSearchResults([]); // Clear results on focus
                      setSearchTeamError(null);
                  }}
                  onBlur={() => {
                      // Delay hiding results slightly to allow click
                      setTimeout(() => { setTeamSearchResults([]); }, 200);
                  }}
                  autoComplete="off"
              />
              {/* Show clear button only when a team is selected */}
              {selectedTeam && (
                  <button type="button" className="clear" onClick={handleClearTeamSelection} title="Clear selection"> X </button>
              )}
            </div>
            {/* Search Status Display */}
            <div className="search-status" style={{ height: '1.2em', marginTop: '4px' }}>
              {isSearchingTeams && <span className="searching">Searching...</span>}
              {searchTeamError && <span className="error">{searchTeamError}</span>}
            </div>
            {/* Search Results Dropdown */}
            {teamSearchResults.length > 0 && !selectedTeam && (
                <ul className="search-results-list">
                  {teamSearchResults.map((team) => (
                  <li key={team.code} onMouseDown={() => handleSelectTeam(team)} >
                      {team.name} ({team.code}) {/* Display name and code */}
                  </li>
                  ))}
              </ul>
            )}
        </div>

        {/* Season Selector (Keep as is) */}
        <label>
          Year:
          <select value={season} onChange={(e) => setSeason(e.target.value ? Number(e.target.value) : '')}>
            <option value="">All Seasons</option>
            {years.map((yr) => (<option key={yr} value={yr}>{yr}</option>))}
          </select>
        </label>

        {/* Week Selector (Keep as is) */}
        <label>
          Week:
          <select value={week} onChange={(e) => setWeek(e.target.value ? Number(e.target.value) : '')} disabled={!season}>
            <option value="">All Weeks</option>
            {weeks.map((wk) => (<option key={wk} value={wk}>{wk}</option>))}
          </select>
        </label>

        {/* Defensive Stat Selector (Keep as is) */}
        <label>
          Stat:
          <select value={selectedStat} onChange={(e) => setSelectedStat(e.target.value as keyof DefensiveStats)}>
            {defensiveStatOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        {/* Submit Button - MODIFIED disabled condition */}
        <button className="submit-button" type="submit" disabled={isLoading || !selectedTeam}> {/* Check selectedTeam */}
          {isLoading ? 'Loading...' : 'Get Stats'}
        </button>
      </form>

      {/* Display Error Messages (Keep as is) */}
      {error && <p className="error-message">{error}</p>}

      {/* Display Chart (Keep as is) */}
      {chartData && !isLoading && (
        <div className="chart-container">
          <Chart data={chartData} />
        </div>
      )}

    </div>
  );
};

export default TeamDefensiveStats;