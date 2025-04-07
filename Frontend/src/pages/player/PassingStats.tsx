import React, { useState } from 'react';
import axios from 'axios';
import Chart from '../../components/charts/Chart';
import './PassingStats.css';  // Page-specific CSS
import '../StatsContainer.css'; // Common container styles

const PlayerPassingStats: React.FC = () => {
  const [playerIds, setPlayerIds] = useState<string[]>(['']);
  const [season, setSeason] = useState<number | ''>('');
  const [week, setWeek] = useState<number | ''>('');
  const [chartData, setChartData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const years = Array.from({ length: 2024 - 1967 + 1 }, (_, i) => 1967 + i);
  const weeks = Array.from({ length: 21 }, (_, i) => i + 1);

  const handlePlayerIdChange = (index: number, value: string) => {
    const newIds = [...playerIds];
    newIds[index] = value;
    setPlayerIds(newIds);
  };

  const addPlayerField = () => {
    if (playerIds.length < 3) {
      setPlayerIds([...playerIds, '']);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validPlayerIds = playerIds.filter((id) => id.trim() !== '');
    if (validPlayerIds.length === 0) {
      setError('Please enter at least one player ID.');
      return;
    }

    try {
      const requests = validPlayerIds.map((id) =>
        axios.get('http://localhost:3000/player-passing-stats', {
          params: {
            id,
            ...(season && { season }),
            ...(week && { week }),
          },
        })
      );

      const responses = await Promise.all(requests);
      console.log('Player stats response:', responses.map((r) => r.data));

      const firstPlayerData = responses[0].data.filter((game: any) => game !== null);
      if (!firstPlayerData.length) {
        setError('No data returned for the first player. Try a different season/week or ID.');
        return;
      }

      const labels = firstPlayerData.map((_: any, idx: number) => `Game ${idx + 1}`);
      const datasets = responses.map((res, idx) => {
        const playerData = res.data.filter((game: any) => game !== null);
        const yardsArray = playerData.map((game: any) => Number(game.passing_yards) || 0);
        return {
          label: `Player ${validPlayerIds[idx]} Passing Stats`,
          data: yardsArray,
        };
      });

      setChartData({ labels, datasets });
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Error fetching stats');
    }
  };

  return (
    <div className="stats-container">
      <h2>Player Passing Stats</h2>
      <form className="stats-form" onSubmit={handleSubmit}>
        {playerIds.map((id, idx) => (
          <label key={idx}>
            Player ID {idx + 1}:
            <input
              type="text"
              value={id}
              onChange={(e) => handlePlayerIdChange(idx, e.target.value)}
              required={idx === 0}
            />
          </label>
        ))}
        {playerIds.length < 3 && (
          <button type="button" onClick={addPlayerField}>
            Add Player
          </button>
        )}
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

export default PlayerPassingStats;
