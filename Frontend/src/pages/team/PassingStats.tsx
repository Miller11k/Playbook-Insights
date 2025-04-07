import React, { useState } from 'react';
import axios from 'axios';
import Chart from '../../components/charts/Chart';
import './TeamStats.css';  // Your page-specific CSS (for form styles, etc.)
import '../StatsContainer.css'; // Import the common container styles

const TeamPassingStats: React.FC = () => {
  const [teamCode, setTeamCode] = useState('');
  const [season, setSeason] = useState<number | ''>('');
  const [week, setWeek] = useState<number | ''>('');
  const [chartData, setChartData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Generate dropdown options
  const years = Array.from({ length: 2024 - 1967 + 1 }, (_, i) => 1967 + i);
  const weeks = Array.from({ length: 21 }, (_, i) => i + 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const response = await axios.get('http://localhost:3000/team-passing-stats', {
        params: {
          team: teamCode,
          ...(season && { season }),
          ...(week && { week }),
        },
      });
      const data = response.data;
      const filteredData = data.filter((item: any) => item !== null);
      if (!filteredData.length) {
        setError('No data found for specified criteria.');
        return;
      }
      const labels = filteredData.map((_: any, idx: number) => `Game ${idx + 1}`);
      const passingYards = filteredData.map((item: any) =>
        Number(item.aggregated_passing_stats?.passing_yards) || 0
      );

      setChartData({
        labels,
        datasets: [
          {
            label: 'Passing Yards',
            data: passingYards,
          },
        ],
      });
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Error fetching stats');
    }
  };

  return (
    <div className="stats-container">
      <h2>Team Passing Stats</h2>
      <form className="stats-form" onSubmit={handleSubmit}>
        <label>
          Team Code:
          <input
            type="text"
            value={teamCode}
            onChange={(e) => setTeamCode(e.target.value)}
            required
          />
        </label>
        <label>
          Year:
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Select Year</option>
            {years.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </label>
        <label>
          Week:
          <select
            value={week}
            onChange={(e) => setWeek(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Select Week</option>
            {weeks.map((wk) => (
              <option key={wk} value={wk}>
                {wk}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">Get Stats</button>
      </form>
      {error && <p className="error-message">{error}</p>}
      {chartData && (
        <div className="chart-container">
          <Chart data={chartData} />
        </div>
      )}
    </div>
  );
};

export default TeamPassingStats;
