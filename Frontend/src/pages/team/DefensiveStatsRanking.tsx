import React, { useState, useEffect } from 'react';
import axios from 'axios';
// Reusing existing CSS where applicable
import './TeamStats.css'; // Or a new CSS file if needed

// Define the structure for ranked team data (adjust based on actual API response)
interface RankedTeamStat {
  team_code: string;
  rank: number;
  value: number; // The value of the stat being ranked
  // Add other relevant fields like team name if available
  team_name?: string;
}

// Define available defensive stats for ranking (similar to the other component)
// Ensure these keys match what the ranking API endpoint expects/returns
const defensiveStatOptionsForRanking: { value: string; label: string }[] = [
  { value: 'passing_yards_allowed', label: 'Passing Yards Allowed' },
  { value: 'rushing_yards_allowed', label: 'Rushing Yards Allowed' },
  { value: 'sacks', label: 'Sacks' },
  { value: 'interceptions', label: 'Interceptions' },
  // Add more stats as needed
];

// Define timeframes for ranking
const timeFrameOptions: { value: string; label: string }[] = [
  { value: 'season', label: 'Season Average' },
  { value: 'last5', label: 'Last 5 Games' },
  { value: 'last10', label: 'Last 10 Games' },
];

const DefensiveStatsRanking: React.FC = () => {
  // State variables for form inputs
  const [season, setSeason] = useState<number | ''>(new Date().getFullYear()); // Default to current year
  const [selectedStat, setSelectedStat] = useState<string>(defensiveStatOptionsForRanking[0].value);
  const [timeFrame, setTimeFrame] = useState<string>(timeFrameOptions[0].value); // Default to 'season'

  // State variables for data, errors, and loading
  const [rankedData, setRankedData] = useState<RankedTeamStat[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Generate dropdown options for years
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1920 + 1 }, (_, i) => currentYear - 1- i);

  // Function to fetch ranked data
  // NOTE: This assumes an API endpoint like '/team-rankings/defensive' exists.
  //       You will need to implement this endpoint on your backend.
  //       It should accept 'stat', 'season', and 'timeframe' parameters.
  const fetchRankings = async () => {
    setIsLoading(true);
    setError(null);
    setRankedData([]);

    try {
      // Construct API request parameters
      const params: { stat: string; timeframe: string; season?: number } = {
        stat: selectedStat,
        timeframe: timeFrame,
      };
      if (season) params.season = season; // Season might be required depending on timeframe

      // *** Replace with your actual API endpoint for rankings ***
      const response = await axios.get<RankedTeamStat[]>('/api/team-rankings/defensive', { // Placeholder URL
        params,
      });

      // Sort data by rank if not already sorted by API
      const sortedData = response.data.sort((a, b) => a.rank - b.rank);

      if (!sortedData.length) {
        setError('No ranking data found for the specified criteria.');
      } else {
        setRankedData(sortedData);
      }
    } catch (err: any) {
      console.error('Error fetching rankings:', err);
      // Provide a more specific error message if possible
      setError(err.response?.data?.error || `Failed to fetch rankings. Ensure the API endpoint '/api/team-rankings/defensive' is correctly implemented.`);
      setRankedData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data when component mounts or parameters change
  useEffect(() => {
    fetchRankings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStat, timeFrame, season]); // Re-fetch when these change

  // Handle form input changes directly triggering re-fetch via useEffect
  const handleStatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStat(e.target.value);
  };

  const handleTimeFrameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTimeFrame(e.target.value);
  };

  const handleSeasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSeason(e.target.value ? Number(e.target.value) : '');
  };

  // Determine if lower or higher value is better for the selected stat
  const isLowerBetter = (stat: string): boolean => {
    // Add stats where lower numbers are better (e.g., yards allowed)
    return stat.includes('_allowed');
  };

  const statLabel = defensiveStatOptionsForRanking.find(opt => opt.value === selectedStat)?.label || selectedStat;
  const lowerBetter = isLowerBetter(selectedStat);

  return (
    <div className="stats-container">
      <h2>Defensive Team Rankings</h2>

      {/* Form for selecting stat, timeframe, and season */}
      <form className="stats-form"> {/* No submit needed if useEffect handles changes */}
        {/* Stat Selector */}
        <label>
          Stat:
          <select value={selectedStat} onChange={handleStatChange}>
            {defensiveStatOptionsForRanking.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {/* Timeframe Selector */}
        <label>
          Period:
          <select value={timeFrame} onChange={handleTimeFrameChange}>
            {timeFrameOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {/* Season Selector */}
        <label>
          Year:
          <select value={season} onChange={handleSeasonChange}>
            <option value="">Select Year</option>
            {years.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </label>
      </form>

      {/* Display Loading Indicator */}
      {isLoading && <p style={{ color: 'white' }}>Loading rankings...</p>}

      {/* Display Error Messages */}
      {error && <p className="error-message">{error}</p>}

      {/* Display Rankings Table */}
      {!isLoading && !error && rankedData.length > 0 && (
        <div className="ranking-table-container" style={{ marginTop: '2rem', width: '80%', maxWidth: '600px', color: 'white' }}>
          <h3>{statLabel} - {timeFrameOptions.find(opt => opt.value === timeFrame)?.label} {season ? `(${season})` : ''}</h3>
          <p style={{ fontSize: '0.9em', marginBottom: '1rem' }}>
            Ranking based on {statLabel}. {lowerBetter ? 'Lower' : 'Higher'} values are better.
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid white' }}>
                <th style={{ padding: '8px', textAlign: 'left' }}>Rank</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Team</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Value</th>
              </tr>
            </thead>
            <tbody>
              {rankedData.map((team) => (
                <tr key={team.team_code} style={{ borderBottom: '1px solid #555' }}>
                  <td style={{ padding: '8px', textAlign: 'left' }}>{team.rank}</td>
                  <td style={{ padding: '8px', textAlign: 'left' }}>
                    {team.team_name || team.team_code} {/* Display name if available */}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>
                    {team.value.toFixed(2)} {/* Format value */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
       {!isLoading && !error && rankedData.length === 0 && (
         <p style={{ color: 'white', marginTop: '1rem' }}>No ranking data available for the selected criteria.</p>
       )}
    </div>
  );
};

export default DefensiveStatsRanking;

