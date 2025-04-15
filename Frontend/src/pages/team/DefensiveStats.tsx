import React, { useState, useEffect } from 'react';
import axios from 'axios';
// Assuming Chart component exists and accepts chart.js compatible data structure
import Chart from '../../components/charts/Chart';
// Reusing existing CSS where applicable
import './TeamStats.css';

// Define the structure of the defensive stats object expected from the API
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
  // Add other potential fields if necessary
  [key: string]: number | undefined; // Allow string indexing
}

// Define available defensive stats for selection
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
  // Add more stats here if available in your data
];

const TeamDefensiveStats: React.FC = () => {
  // State variables for form inputs
  const [teamCode, setTeamCode] = useState('');
  const [season, setSeason] = useState<number | ''>('');
  const [week, setWeek] = useState<number | ''>('');
  const [selectedStat, setSelectedStat] = useState<keyof DefensiveStats>(defensiveStatOptions[0].value); // Default to the first stat

  // State variables for data, chart, and errors
  const [rawData, setRawData] = useState<DefensiveStats[]>([]); // Store raw API response
  const [chartData, setChartData] = useState<any>(null); // Data formatted for the Chart component
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Generate dropdown options for years and weeks
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1920 + 1 }, (_, i) => currentYear - i); // From current year down to 1920
  const weeks = Array.from({ length: 22 }, (_, i) => i + 1); // Weeks 1-22

  // Function to fetch data from the API
  const fetchData = async () => {
    if (!teamCode) {
      setError('Please enter a team code.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setChartData(null); // Clear previous chart
    setRawData([]); // Clear previous raw data

    try {
      // Construct API request parameters
      const params: { team: string; season?: number; week?: number } = {
        team: teamCode,
      };
      if (season) params.season = season;
      if (week) params.week = week;

      // Make API call using axios
      const response = await axios.get<DefensiveStats[]>('http://localhost:3000/defensive-stats', {
        params,
      });

      // Filter out any null/empty responses if the API might return them
      const filteredData = response.data.filter((item): item is DefensiveStats => item !== null && typeof item === 'object');

      if (!filteredData.length) {
        setError('No defensive stats found for the specified criteria.');
        setRawData([]);
      } else {
        setRawData(filteredData);
        // Initial chart generation will be handled by useEffect watching rawData and selectedStat
      }
    } catch (err: any) {
      console.error('Error fetching defensive stats:', err);
      setError(err.response?.data?.error || 'An error occurred while fetching stats.');
      setRawData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  // Effect hook to update chart data when raw data or selected stat changes
  useEffect(() => {
    if (rawData.length > 0 && selectedStat) {
      // Generate labels (e.g., "Game 1", "Game 2" or based on week/season if available)
      // Assuming the API returns data in chronological order if multiple games are fetched
      const labels = rawData.map((_, idx) => `Game ${idx + 1}`); // Simple labeling

      // Extract the selected stat's data points
      const dataPoints = rawData.map((item) => {
        const value = item[selectedStat];
        // Ensure value is a number, default to 0 if undefined or not a number
        return typeof value === 'number' ? value : 0;
      });

      // Find the label for the selected stat
      const statLabel = defensiveStatOptions.find(opt => opt.value === selectedStat)?.label || selectedStat;

      // Prepare data structure for the Chart component
      setChartData({
        labels,
        datasets: [
          {
            label: `${statLabel} (${teamCode})`, // Dynamic label
            data: dataPoints,
            backgroundColor: 'rgba(255, 99, 132, 0.5)', // Example styling
            borderColor: 'rgb(255, 99, 132)',
            borderWidth: 1,
          },
        ],
      });
    } else {
      setChartData(null); // Clear chart if no data or stat selected
    }
  }, [rawData, selectedStat, teamCode]); // Re-run effect if these dependencies change

  return (
    <div className="stats-container"> {/* Reuse existing container style */}
      <h2>Team Defensive Stats</h2>

      {/* Form for selecting team, season, week, and stat */}
      <form className="stats-form" onSubmit={handleSubmit}> {/* Reuse existing form style */}
        {/* Team Code Input */}
        <label>
          Team Code:
          <input
            type="text"
            value={teamCode}
            onChange={(e) => setTeamCode(e.target.value.toUpperCase())} // Ensure uppercase
            placeholder="e.g., KC"
            required
            maxLength={3} // Typically 2 or 3 letters
            pattern="[A-Za-z]{2,3}" // Basic pattern validation
            title="Enter a 2 or 3 letter team code"
          />
        </label>

        {/* Season Selector */}
        <label>
          Year:
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">All Seasons</option> {/* Option for no season filter */}
            {years.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </label>

        {/* Week Selector */}
        <label>
          Week:
          <select
            value={week}
            onChange={(e) => setWeek(e.target.value ? Number(e.target.value) : '')}
            disabled={!season} // Optionally disable week if no season is selected
          >
            <option value="">All Weeks</option> {/* Option for no week filter */}
            {weeks.map((wk) => (
              <option key={wk} value={wk}>
                {wk}
              </option>
            ))}
          </select>
        </label>

        {/* Defensive Stat Selector */}
        <label>
          Stat:
          <select
            value={selectedStat}
            onChange={(e) => setSelectedStat(e.target.value as keyof DefensiveStats)}
          >
            {defensiveStatOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {/* Submit Button */}
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Get Stats'}
        </button>
      </form>

      {/* Display Error Messages */}
      {error && <p className="error-message">{error}</p>}

      {/* Display Chart */}
      {chartData && !isLoading && (
        <div className="chart-container"> {/* Reuse existing chart container style */}
          {/* Assuming Chart component takes data prop */}
          <Chart data={chartData} />
        </div>
      )}

      {/* Optional: Display raw data for debugging */}
      {/* {rawData.length > 0 && (
        <pre style={{ color: 'white', marginTop: '20px', textAlign: 'left', maxWidth: '800px' }}>
          {JSON.stringify(rawData, null, 2)}
        </pre>
      )} */}
    </div>
  );
};

export default TeamDefensiveStats;
