import React, { useState, useMemo } from 'react';
import Chart from './charts/Chart';
import './StatsTableWithChart.css';

interface Props {
  data: any[];  // array of your raw game-log objects
}

// Mapping of stat keys to abbreviations and tooltips
const STAT_DEFINITIONS: Record<string, { abbr: string; name: string; description: string }> = {
  // Passing
  passing_air_yards:           { abbr: 'AYA', name: 'Air Yards',            description: 'Yards thrown in the air' },
  passing_yards_after_catch:   { abbr: 'YAC', name: 'Yards After Catch',    description: 'Yards gained after the catch' },
  passing_first_downs:         { abbr: '1D',  name: '1st Downs (Pass)',    description: 'First downs via passing' },
  passing_epa:                 { abbr: 'EPA', name: 'Pass EPA',            description: 'Expected Points Added (passing)' },
  passing_2pt_conversions:     { abbr: '2PC', name: '2-Pt Pass',           description: 'Two-point pass conversions' },

  // Receiving
  receptions:                  { abbr: 'REC', name: 'Receptions',          description: 'Number of catches' },
  targets:                     { abbr: 'TGT', name: 'Targets',             description: 'Number of throws to receiver' },
  receiving_yards:             { abbr: 'YDS', name: 'Receiving Yards',     description: 'Yards gained by receptions' },
  receiving_tds:               { abbr: 'TD',  name: 'Receiving TDs',       description: 'Touchdowns via receptions' },
  receiving_air_yards:         { abbr: 'AYA', name: 'Air Yards (Rec)',     description: 'Yards thrown in the air to receiver' },
  receiving_yards_after_catch: { abbr: 'YAC', name: 'Yards After Catch',   description: 'Yards gained after catch' },
  receiving_first_downs:       { abbr: '1D',  name: '1st Downs (Rec)',     description: 'First downs via receptions' },
  receiving_epa:               { abbr: 'EPA', name: 'Rec EPA',             description: 'Expected Points Added (receiving)' },
  receiving_2pt_conversions:   { abbr: '2PC', name: '2-Pt Rec',            description: 'Two-point reception conversions' },
  receiving_fumbles:           { abbr: 'RFM', name: 'Receiving Fumbles',   description: 'Number of times fumbling the ball after receiving it' },
  receiving_fumbles_lost:      { abbr: 'RFML', name: 'Receiving Fumbles',   description: 'Number of times fumbling the ball after receiving it and the ball being picked up' },

  // Rushing
  carries:                     { abbr: 'CAR', name: 'Carries',            description: 'Number of rushing attempts' },
  rushing_yards:               { abbr: 'YDS', name: 'Rushing Yards',      description: 'Yards gained by rushing' },
  rushing_tds:                 { abbr: 'TD',  name: 'Rushing TDs',        description: 'Touchdowns via rushing' },
  rushing_fumbles:             { abbr: 'FUM', name: 'Rush Fumbles',       description: 'Fumbles on rushing plays' },
  rushing_fumbles_lost:        { abbr: 'FL',  name: 'Fumbles Lost',       description: 'Fumbles lost on rushes' },
  rushing_first_downs:         { abbr: '1D',  name: '1st Downs (Rush)',   description: 'First downs via rushing' },
  rushing_epa:                 { abbr: 'EPA', name: 'Rush EPA',           description: 'Expected Points Added (rushing)' },
  rushing_2pt_conversions:     { abbr: '2PC', name: '2-Pt Rush',          description: 'Two-point rush conversions' },

  // Extras
  special_teams_tds:           { abbr: 'STTD',name: 'ST TDs',            description: 'Special teams touchdowns' },

  // Common metadata
  player_id:                   { abbr: 'ID',   name: 'Player ID',          description: 'Unique player identifier' },
  season:                      { abbr: 'Yr',   name: 'Season',             description: 'Calendar year of the season' },
  week:                        { abbr: 'Wk',   name: 'Week',               description: 'Week of the season' },
  opponent_team:               { abbr: 'Opp',  name: 'Opponent',           description: 'Opposing team abbreviation' },
  season_type:                 { abbr: 'TYP',  name: 'Game Type',          description: 'Type of game (regular or postseason)'},
  team_score:                  { abbr: 'Score',  name: 'Score',          description: 'How many points the team accumulated'},
  opponent_score:              { abbr: 'Opp Score',  name: 'Opponent Score',            description: 'How many points the opposing team accumulated'},
  record:                      { abbr: 'REC',  name: 'Record',                          description: 'The win to loss ratio for the team'},
  completions:                 { abbr: 'CMP',  name: 'Completions',                     description: 'Number of completed passes'},
  attempts:                    { abbr: 'ATT',  name: 'Attempts',                        description: 'Number of attempted passes'},
  passing_yards:               { abbr: 'PYD',  name: 'Passing Yards',                   description: 'Number of passing yards'},
  passing_tds:                 { abbr: 'PTD',  name: 'Passing Touchdowns',              description: 'Number of passing touchdowns'},

}; 

const StatsTableWithChart: React.FC<Props> = ({ data }) => {
  const [selectedStat, setSelectedStat] = useState<string | null>(null);
  const [filterSeason, setFilterSeason] = useState<number | ''>('');
  const [filterWeek, setFilterWeek] = useState<number | ''>('');

  // 1) Flatten nested JSON objects
  const rows = useMemo(
    () => data.map(row => {
      const flat: Record<string, any> = {};
      Object.entries(row).forEach(([k, v]) => {
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          Object.entries(v).forEach(([subk, subv]) => flat[subk] = subv);
        } else {
          flat[k] = v;
        }
      });
      return flat;
    }),
    [data]
  );
  if (!rows.length) return null;

  // 2) Derive all column keys
  const allKeys = useMemo(() => {
    const keys = new Set<string>();
    ['season', 'week', 'opponent_team'].forEach(k => rows[0][k] !== undefined && keys.add(k));
    Object.keys(rows[0]).forEach(k => keys.add(k));
    return Array.from(keys);
  }, [rows]);

  // 2a) Filter out both unwanted columns
  const displayKeys = useMemo(
    () => allKeys.filter(key => key !== 'player_passing_stats' && key !== 'player_rushing_stats'),
    [allKeys]
  );

  // 3) Unique seasons & weeks for filters
  const seasons = useMemo(
    () => Array.from(new Set(rows.map(r => r.season))).sort((a, b) => (b as number) - (a as number)),
    [rows]
  );
  const weeks = useMemo(
    () => Array.from(new Set(rows.map(r => r.week))).sort((a, b) => (a as number) - (b as number)),
    [rows]
  );

  // 4) Filter rows for chart
  const chartRows = useMemo(
    () => rows.filter(r =>
      (filterSeason === '' || r.season === filterSeason) &&
      (filterWeek   === '' || r.week   === filterWeek)
    ),
    [rows, filterSeason, filterWeek]
  );

  // 5) Build chart data
  const chartData = useMemo(() => {
    if (!selectedStat) return null;
    const def = STAT_DEFINITIONS[selectedStat];
    return {
      labels: chartRows.map(r => `W${r.week} vs ${r.opponent_team}`),
      datasets: [{
        label: def?.abbr || selectedStat,
        data: chartRows.map(r => Number(r[selectedStat]) || 0),
      }],
    };
  }, [selectedStat, chartRows]);

  return (
    <div className="stats-with-chart">
      <table className="stats-table">
        <thead>
          <tr>
            {displayKeys.map(key => {
              const def = STAT_DEFINITIONS[key];
              return (
                <th
                  key={key}
                  title={def ? `${def.name}: ${def.description}` : key}
                  onClick={() => setSelectedStat(key)}
                  style={{ cursor: 'pointer', background: selectedStat === key ? 'rgba(255,255,255,0.1)' : undefined }}
                >
                  {def ? def.abbr : key}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {displayKeys.map(c => {
                const val = r[c];
                let display: React.ReactNode;
                if (val == null) display = '–';
                else if (typeof val === 'object') display = JSON.stringify(val);
                else display = val;
                return <td key={c}>{display}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {selectedStat && (
        <div className="chart-section">
          <div className="filters">
            <label>
              Season:
              <select
                value={filterSeason}
                onChange={e => setFilterSeason(e.target.value === '' ? '' : Number(e.target.value))}
              >
                <option value="">All</option>
                {seasons.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
            <label>
              Week:
              <select
                value={filterWeek}
                onChange={e => setFilterWeek(e.target.value === '' ? '' : Number(e.target.value))}
              >
                <option value="">All</option>
                {weeks.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </label>
          </div>
          {chartData && (
            <div className="chart-container">
              <Chart data={chartData} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StatsTableWithChart;