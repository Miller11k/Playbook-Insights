// src/pages/team/PassingStats.tsx
import React, { useState } from 'react';
import axios from 'axios';
import Chart from '../../components/charts/Chart';

const TeamPassingStats: React.FC = () => {
  const [teamCode, setTeamCode] = useState('');
  const [season, setSeason] = useState<number | ''>('');
  const [week, setWeek] = useState<number | ''>('');
  const [chartData, setChartData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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
      const labels = data.map((_: any, idx: number) => `Game ${idx + 1}`);
      const passingYards = data.map((item: any) =>
        Number(item.aggregated_passing_stats?.passing_yards || 0)
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
    <div>
      <h2>Team Passing Stats</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Team Code:
          <input type="text" value={teamCode} onChange={(e) => setTeamCode(e.target.value)} required />
        </label>
        <label>
          Season (Year):
          <input
            type="number"
            value={season}
            onChange={(e) => setSeason(e.target.value ? Number(e.target.value) : '')}
          />
        </label>
        <label>
          Week:
          <input
            type="number"
            value={week}
            onChange={(e) => setWeek(e.target.value ? Number(e.target.value) : '')}
          />
        </label>
        <button type="submit">Get Stats</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {chartData && <Chart data={chartData} />}
    </div>
  );
};

export default TeamPassingStats;
