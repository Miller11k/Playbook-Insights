import React, { useState, useEffect, useCallback } from 'react';
import axios, { AxiosError } from 'axios';
import Chart from '../../components/charts/Chart'; 
import './TeamStats.css';
import { debounce } from 'lodash';
// import StatsTable from '../../components/StatsTable';
import StatsTableWithChart from '../../components/StatsTableWithChart';


// --- Interfaces ---
// Interface for team search result structure
interface TeamSearchResult {
  code: string;
  name: string;
}

// Interface for each game stat object (includes offensive and receiving data)
interface TeamGameData {
  season: number;
  week: number;
  opponent_team: string;
  aggregated_passing_stats?: { [key: string]: any };
  aggregated_rushing_stats?: { [key: string]: any };
  wr_yards?: number;
  te_yards?: number;
  rb_yards?: number;
  defensive_stats?: { [key: string]: any };
  [key: string]: any;
}

// Configuration of individual chart lines
interface StatDetail {
  labelSuffix: string;
  dataPath: string;
  color: string;
  borderColor: string;
}

// Configuration for a group of stats (e.g., passing, rushing)
interface TeamStatConfig {
  key: string;
  label: string;
  endpoint: string;
  statsToDisplay: StatDetail[];
}

// Helper to safely retrieve nested properties from a game object
const getProperty = (obj: any, path: string): any => {
  if (!obj || !path) return undefined;
  if (!path.includes('.')) return obj[path];
  return path.split('.').reduce((prev, curr) => (
    prev && prev[curr] !== undefined ? prev[curr] : undefined
  ), obj);
};

// --- Stat Category Configuration ---
const categoryOptions: TeamStatConfig[] = [
  {
    key: "passing",
    label: "Passing Stats",
    endpoint: "/passing-stats",
    statsToDisplay: [
      { labelSuffix: "Passing Yards", dataPath: "aggregated_passing_stats.passing_yards", color: 'rgba(54, 162, 235, 0.6)', borderColor: 'rgb(54, 162, 235)' },
      { labelSuffix: "Passing TDs", dataPath: "aggregated_passing_stats.passing_tds", color: 'rgba(255, 99, 132, 0.6)', borderColor: 'rgb(255, 99, 132)' },
      { labelSuffix: "Completions", dataPath: "aggregated_passing_stats.completions", color: 'rgba(75, 192, 192, 0.6)', borderColor: 'rgb(75, 192, 192)' },
    ]
  },
  {
    key: "rushing",
    label: "Rushing Stats",
    endpoint: "/rushing-stats",
    statsToDisplay: [
      { labelSuffix: "Rushing Yards", dataPath: "aggregated_rushing_stats.rushing_yards", color: 'rgba(75, 192, 192, 0.6)', borderColor: 'rgb(75, 192, 192)' },
      { labelSuffix: "Rushing TDs", dataPath: "aggregated_rushing_stats.rushing_tds", color: 'rgba(255, 159, 64, 0.6)', borderColor: 'rgb(255, 159, 64)' },
      { labelSuffix: "Carries", dataPath: "aggregated_rushing_stats.carries", color: 'rgba(153, 102, 255, 0.6)', borderColor: 'rgb(153, 102, 255)' },
    ]
  },
  {
    key: "receiving",
    label: "Receiving Stats (Positional)",
    endpoint: "/api/team-positional-receiving",
    statsToDisplay: [
      { labelSuffix: "WR Yards", dataPath: "wr_yards", color: 'rgba(255, 99, 132, 0.6)', borderColor: 'rgb(255, 99, 132)' },
      { labelSuffix: "TE Yards", dataPath: "te_yards", color: 'rgba(54, 162, 235, 0.6)', borderColor: 'rgb(54, 162, 235)' },
      { labelSuffix: "RB Yards", dataPath: "rb_yards", color: 'rgba(255, 205, 86, 0.6)', borderColor: 'rgb(255, 205, 86)' },
    ]
  }
];

// --- Constants ---
const API_BASE_URL = import.meta.env.VITE_API_URL;
console.log('Using API Base URL:', API_BASE_URL);

// --- Component ---
const TeamStats: React.FC = () => {
  // --- State: Search, filters, and UI ---
  const [teamSearchTerm, setTeamSearchTerm] = useState<string>('');
  const [teamSearchResults, setTeamSearchResults] = useState<TeamSearchResult[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<TeamSearchResult | null>(null);
  const [isSearchingTeams, setIsSearchingTeams] = useState<boolean>(false);
  const [searchTeamError, setSearchTeamError] = useState<string | null>(null);

  const [season, setSeason] = useState<number | ''>('');
  const [week, setWeek] = useState<number | ''>('');
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string>(categoryOptions[0].key);

  const [rawData, setRawData] = useState<TeamGameData[]>([]);
  const [chartData, setChartData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // --- Derived ---
  const selectedCategoryConfig = categoryOptions.find(opt => opt.key === selectedCategoryKey) || categoryOptions[0];
  const currentYear = new Date().getFullYear() - 1;
  const years = Array.from({ length: currentYear - 2000 + 1 }, (_, i) => 2000 + i).reverse();
  const weeks = Array.from({ length: 22 }, (_, i) => i + 1);

  // --- Debounced API call for team search ---
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

  // --- Fetch stats based on selection ---
  const fetchData = useCallback(async () => {
    const currentTeamCode = selectedTeam?.code;
    if (!API_BASE_URL) return setError("API URL missing");
    if (!currentTeamCode) return setError("Please search for and select a team.");
    if (!selectedCategoryConfig) return setError("Invalid category selected.");

    setIsLoading(true);
    setError(null);
    setChartData(null);
    setRawData([]);

    try {
      const params: { team: string; season?: number; week?: number } = { team: currentTeamCode };
      if (season) params.season = season;
      if (week) params.week = week;

      const unifiedUrl = `${API_BASE_URL}/`;
      const response = await axios.get<TeamGameData[]>(unifiedUrl, {
        headers: {
          'x-entity-type': 'team',
          'x-stats-type': selectedCategoryConfig.key
        },
        params
      });

      if (!Array.isArray(response.data)) throw new Error("Received invalid data format from server.");
      const filteredData = response.data.filter((item): item is TeamGameData =>
        item && typeof item === 'object' && item.season != null && item.week != null && item.opponent_team != null
      );

      if (!filteredData.length) {
        setError(`No ${selectedCategoryConfig.label.toLowerCase()} found for the specified criteria.`);
      } else {
        setRawData(filteredData);
      }

    } catch (err: any) {
      const error = err as AxiosError<{ error?: string }>;
      const errorMsg = error.response?.data?.error || error.message || 'Error occurred while fetching stats.';
      setError(`Failed to fetch stats: ${errorMsg}`);
      setRawData([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTeam, season, week, selectedCategoryConfig]);

  // --- Generate chart when data or category changes ---
  useEffect(() => {
    if (!rawData.length || !selectedCategoryConfig || !selectedTeam) return setChartData(null);
    console.log(`📊 Generating chart for: ${selectedCategoryConfig.label}`);

    const labels = rawData.map(game =>
      game.opponent_team === 'BYE' ? `BYE W${game.week}` : `${game.opponent_team || 'N/A'} W${game.week ?? '?'}`
    );

    const datasets = selectedCategoryConfig.statsToDisplay.map(statConfig => ({
      label: `${selectedTeam.code} ${statConfig.labelSuffix}`,
      data: rawData.map(game => game.opponent_team === 'BYE' ? 0 : Number(getProperty(game, statConfig.dataPath)) || 0),
      backgroundColor: statConfig.color,
      borderColor: statConfig.borderColor,
      borderWidth: 1,
      barPercentage: 0.7,
      categoryPercentage: 0.8,
    }));

    setChartData({ labels, datasets });
  }, [rawData, selectedCategoryConfig, selectedTeam]);

  // --- Event Handlers ---
  const handleTeamSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setTeamSearchTerm(term);
    if (selectedTeam) {
      setSelectedTeam(null);
      setRawData([]);
      setChartData(null);
    }
    debouncedTeamSearch(term);
  };

  const handleSelectTeam = (team: TeamSearchResult) => {
    setSelectedTeam(team);
    setTeamSearchTerm('');
    setTeamSearchResults([]);
    setSearchTeamError(null);
  };

  const handleClearTeamSelection = () => {
    setSelectedTeam(null);
    setTeamSearchTerm('');
    setTeamSearchResults([]);
    setSearchTeamError(null);
    setRawData([]);
    setChartData(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam) return setError("Please search for and select a team first.");
    fetchData();
  };

  // --- Render ---
  return (
    <div className="stats-container">
      <h2>Team {selectedCategoryConfig.label}</h2>

      <form className="stats-form" onSubmit={handleSubmit} style={{ maxWidth: '900px' }}>
        <div className="player-search-input-container" style={{ width: '100%', maxWidth: '350px' }}>
          <label htmlFor="team-search-input"> Team: </label>
          <div className="input-group">
            <input
              id="team-search-input"
              type="text"
              placeholder="Search Team..."
              value={selectedTeam ? selectedTeam.name : teamSearchTerm}
              onChange={handleTeamSearchChange}
              onFocus={() => { if (selectedTeam) handleClearTeamSelection(); }}
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

        <label htmlFor="category-select"> Stat Category:
          <select id="category-select" value={selectedCategoryKey} onChange={(e) => setSelectedCategoryKey(e.target.value)}>
            {categoryOptions.map(option => (
              <option key={option.key} value={option.key}>{option.label}</option>
            ))}
          </select>
        </label>

        <label htmlFor="year-select-team"> Year:
          <select id="year-select-team" value={season} onChange={(e) => setSeason(e.target.value ? Number(e.target.value) : '')}>
            <option value="">All Seasons</option>
            {years.map(yr => <option key={yr} value={yr}>{yr}</option>)}
          </select>
        </label>

        <label htmlFor="week-select-team"> Week:
          <select id="week-select-team" value={week} onChange={(e) => setWeek(e.target.value ? Number(e.target.value) : '')} disabled={!season}>
            <option value="">All Weeks</option>
            {weeks.map(wk => <option key={wk} value={wk}>{wk}</option>)}
          </select>
        </label>

        <button className="submit-button" type="submit" disabled={isLoading || !selectedTeam}>
          {isLoading ? 'Loading...' : 'Get Stats'}
        </button>
      </form>

      {error && <p className="error-message">{error}</p>}
      {isLoading && <p className="loading-text">Loading data...</p>}

      {chartData && !isLoading && (
        <div className="chart-container">
          <Chart data={chartData} />
        </div>
      )}

      {/* ↓ Detailed per‐game breakdown for the selected team */}
      {rawData.length > 0 && <StatsTableWithChart data={rawData} />}
    </div>
  );
};

export default TeamStats;