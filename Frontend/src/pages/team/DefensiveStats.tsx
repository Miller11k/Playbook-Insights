import React, { useState, useEffect, useCallback } from 'react';
import axios, { AxiosError } from 'axios';
import Chart from '../../components/charts/Chart';
import './TeamStats.css';
import { debounce } from 'lodash';
import { Helmet } from 'react-helmet'

// --- Interfaces ---
// Structure of the defensive stats returned from API
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

// Structure of team search results from API
interface TeamSearchResult {
  code: string;
  name: string;
}

// --- Constants ---
// Base URL for backend API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
console.log('DEF STATS Using API Base URL:', API_BASE_URL);

// Options for dropdown stat selection
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
  // Team search input state
  const [teamSearchTerm, setTeamSearchTerm] = useState<string>('');
  const [teamSearchResults, setTeamSearchResults] = useState<TeamSearchResult[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<TeamSearchResult | null>(null);
  const [isSearchingTeams, setIsSearchingTeams] = useState<boolean>(false);
  const [searchTeamError, setSearchTeamError] = useState<string | null>(null);

  // Filters for year and week
  const [season, setSeason] = useState<number | ''>('');
  const [week, setWeek] = useState<number | ''>('');
  const [selectedStat, setSelectedStat] = useState<keyof DefensiveStats>(defensiveStatOptions[0].value);

  // Data and chart state
  const [rawData, setRawData] = useState<DefensiveStats[]>([]);
  const [chartData, setChartData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Dropdown options for year and week
  const currentYear = new Date().getFullYear() - 1;
  const years = Array.from({ length: currentYear - 2000 + 1 }, (_, i) => 2000 + i).reverse();
  const weeks = Array.from({ length: 22 }, (_, i) => i + 1);

  // Debounced team search using backend /search-team endpoint
  const debouncedTeamSearch = useCallback(
    debounce(async (searchTerm: string) => {
      if (!API_BASE_URL) {
        setSearchTeamError("API URL missing");
        setIsSearchingTeams(false);
        return;
      }
      if (searchTerm.trim().length < 2) {
        setTeamSearchResults([]);
        setIsSearchingTeams(false);
        setSearchTeamError(null);
        return;
      }

      console.log(`🚀 Triggering API Team Search: "${searchTerm}"`);
      setIsSearchingTeams(true);
      setSearchTeamError(null);
      try {
        const apiUrl = `${API_BASE_URL}/search-team`;
        console.log(`📞 Calling API: GET ${apiUrl}?query=${searchTerm}`);
        const response = await axios.get<TeamSearchResult[]>(apiUrl, { params: { query: searchTerm } });
        if (!Array.isArray(response.data)) throw new Error("Invalid data format from server.");
        setTeamSearchResults(response.data);
      } catch (err) {
        const error = err as AxiosError<{ error?: string }>;
        console.error('❌ Team Search API Error:', error.response?.data || error.message);
        setSearchTeamError(error.response?.data?.error || 'Team search failed.');
        setTeamSearchResults([]);
      } finally {
        setIsSearchingTeams(false);
      }
    }, 500),
    []
  );

  // Fetch defensive stats for selected team
  const fetchData = async () => {
    const currentTeamCode = selectedTeam?.code;

    if (!currentTeamCode) {
      setError('Please search for and select a team.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setChartData(null);
    setRawData([]);

    try {
      const params: { team: string; season?: number; week?: number } = { team: currentTeamCode };
      if (season) params.season = season;
      if (week) params.week = week;

      const unifiedUrl = `${API_BASE_URL}/`;
      console.log(`DEF STATS: Calling ${unifiedUrl}`, params);
      const response = await axios.get<DefensiveStats[]>(unifiedUrl, {
        headers: {
          'x-entity-type': 'team',
          'x-stats-type': 'defensive'
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
      const error = err as AxiosError;
      console.error('Error fetching defensive stats:', err);
      if (error.response) {
        // setError(error.response.data || `API Error: ${error.response.status}`);
      } else if (error.request) {
        setError('Network Error: Could not reach API server.');
      } else {
        setError(`Request Setup Error: ${error.message}`);
      }
      setRawData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Form submit triggers data fetch
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam) {
      setError("Please search for and select a team first.");
      return;
    }
    fetchData();
  };

  // Handle changes to search input
  const handleTeamSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setTeamSearchTerm(term);
    if (selectedTeam) {
      setSelectedTeam(null);
      setRawData([]);
      setChartData(null);
      setError(null);
    }
    setTeamSearchResults([]);
    setSearchTeamError(null);
    debouncedTeamSearch(term);
  };

  // Handle team selection from dropdown
  const handleSelectTeam = (team: TeamSearchResult) => {
    console.log(`Team selected:`, team);
    setSelectedTeam(team);
    setTeamSearchTerm('');
    setTeamSearchResults([]);
    setSearchTeamError(null);
  };

  // Clear selected team and reset states
  const handleClearTeamSelection = () => {
    setSelectedTeam(null);
    setTeamSearchTerm('');
    setTeamSearchResults([]);
    setSearchTeamError(null);
    setRawData([]);
    setChartData(null);
    setError(null);
  };

  // When raw data or filters change, regenerate chart
  useEffect(() => {
    if (rawData.length > 0 && selectedStat && selectedTeam) {
      const labels = rawData.map(game => {
        if (String(game.opponent_team) === 'BYE') return `BYE W${game.week}`;
        const opponentCode = game.opponent_team || 'N/A';
        const weekNum = game.week != null ? game.week : '?';
        return `${opponentCode} W${weekNum}`;
      });

      const dataPoints = rawData.map((item) => {
        const value = item[selectedStat];
        return typeof value === 'number' ? value : 0;
      });

      const statLabel = defensiveStatOptions.find(opt => opt.value === selectedStat)?.label || selectedStat;

      setChartData({
        labels,
        datasets: [
          {
            label: `${statLabel} (${selectedTeam.code})`,
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
  }, [rawData, selectedStat, selectedTeam]);

  // --- Render ---
  return (
    <>
    <Helmet>
      <title>Defensive Stats | Playbook Insights</title>
    </Helmet>

    <h2>Defensive Stats</h2>
    <div className="stats-container">
      <h2>Team Defensive Stats</h2>

      <form className="stats-form" onSubmit={handleSubmit}>
        {/* Team search input with auto-select dropdown */}
        <div className="player-search-input-container" style={{ width: '100%', maxWidth: '350px' }}>
          <label htmlFor="team-search-input"> Team: </label>
          <div className="input-group">
            <input
              id="team-search-input"
              type="text"
              placeholder="Search Team..."
              value={selectedTeam ? selectedTeam.name : teamSearchTerm}
              onChange={handleTeamSearchChange}
              onFocus={() => {
                if (selectedTeam) handleClearTeamSelection();
                setTeamSearchResults([]);
                setSearchTeamError(null);
              }}
              onBlur={() => setTimeout(() => setTeamSearchResults([]), 200)}
              autoComplete="off"
            />
            {selectedTeam && (
              <button type="button" className="clear" onClick={handleClearTeamSelection} title="Clear selection"> X </button>
            )}
          </div>
          <div className="search-status" style={{ height: '1.2em', marginTop: '4px' }}>
            {isSearchingTeams && <span className="searching">Searching...</span>}
            {searchTeamError && <span className="error">{searchTeamError}</span>}
          </div>
          {teamSearchResults.length > 0 && !selectedTeam && (
            <ul className="search-results-list">
              {teamSearchResults.map((team) => (
                <li key={team.code} onMouseDown={() => handleSelectTeam(team)}>
                  {team.name} ({team.code})
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Season filter */}
        <label>
          Year:
          <select value={season} onChange={(e) => setSeason(e.target.value ? Number(e.target.value) : '')}>
            <option value="">All Seasons</option>
            {years.map((yr) => (<option key={yr} value={yr}>{yr}</option>))}
          </select>
        </label>

        {/* Week filter */}
        <label>
          Week:
          <select value={week} onChange={(e) => setWeek(e.target.value ? Number(e.target.value) : '')} disabled={!season}>
            <option value="">All Weeks</option>
            {weeks.map((wk) => (<option key={wk} value={wk}>{wk}</option>))}
          </select>
        </label>

        {/* Stat filter */}
        <label>
          Stat:
          <select value={selectedStat} onChange={(e) => setSelectedStat(e.target.value as keyof DefensiveStats)}>
            {defensiveStatOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        {/* Submit button */}
        <button className="submit-button" type="submit" disabled={isLoading || !selectedTeam}>
          {isLoading ? 'Loading...' : 'Get Stats'}
        </button>
      </form>

      {/* Error message */}
      {error && <p className="error-message">{error}</p>}

      {/* Chart display */}
      {chartData && !isLoading && (
        <div className="chart-container">
          <Chart data={chartData} />
        </div>
      )}
    </div>
    </>

  );
};

export default TeamDefensiveStats;