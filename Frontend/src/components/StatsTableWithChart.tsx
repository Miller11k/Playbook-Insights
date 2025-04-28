import React, { useState, useMemo } from 'react';
import Chart from './charts/Chart';      // Adjust path if needed
// import './StatsTableWithChart.css'

interface Props {
  data: any[];                          // array of your raw game-log objects
}

interface StatDef {
  abbr: string;
  name: string;
  description: string;
}

// src/components/StatsTableWithChart.tsx
const STAT_DEFINITIONS: Record<string, { abbr: string; name: string; description: string }> = {
  
  // Passing
  passing_air_yards:         { abbr: 'AYA', name: 'Air Yards',            description: 'Yards thrown in the air' },
  passing_yards_after_catch: { abbr: 'YAC', name: 'Yards After Catch',    description: 'Yards gained after the catch' },
  passing_first_downs:       { abbr: '1D',  name: '1st Downs (Pass)',    description: 'First downs via passing' },
  passing_epa:               { abbr: 'EPA', name: 'Pass EPA',            description: 'Expected Points Added (passing)' },
  passing_2pt_conversions:   { abbr: '2PC', name: '2-Pt Pass',           description: 'Two-point pass conversions' },
  receptions:                { abbr: 'REC', name: 'Receptions',           description: 'Number of catches' },
  receiving_yards:           { abbr: 'YDS', name: 'Receiving Yards',     description: 'Yards gained by receptions' },
  receiving_tds:             { abbr: 'TD',  name: 'Receiving Touchdowns',description: 'Touchdowns via receptions' },
  targets:                   { abbr: 'TGT', name: 'Targets',             description: 'Number of throws to receiver' },
  player_id:                 { abbr: 'ID',  name: 'Player ID',           description: 'Unique player identifier' },
  season:                    { abbr: 'Yr',  name: 'Season',             description: 'Calendar year of the season' },
  week:                      { abbr: 'Wk',  name: 'Week',               description: 'Week of the season' },
  opponent_team:             { abbr: 'Opp', name: 'Opponent',            description: 'Opposing team abbreviation' },


  // Rushing
  rushing_fumbles:           { abbr: 'FUM', name: 'Rush Fumbles',        description: 'Fumbles on rushing plays' },
  rushing_fumbles_lost:      { abbr: 'FL',  name: 'Fumbles Lost',        description: 'Fumbles lost on rushes' },
  rushing_first_downs:       { abbr: '1D',  name: '1st Downs (Rush)',    description: 'First downs via rushing' },
  rushing_epa:               { abbr: 'EPA', name: 'Rush EPA',            description: 'Expected Points Added (rushing)' },
  rushing_2pt_conversions:   { abbr: '2PC', name: '2-Pt Rush',           description: 'Two-point rush conversions' },

  // Receiving
  receiving_fumbles:         { abbr: 'FUM', name: 'Rec Fumbles',         description: 'Fumbles on receptions' },
  receiving_fumbles_lost:    { abbr: 'FL',  name: 'Fumbles Lost',        description: 'Fumbles lost after receptions' },
  receiving_air_yards:       { abbr: 'AYA', name: 'Air Yards',           description: 'Yards thrown in the air' },
  receiving_yards_after_catch:{abbr: 'YAC', name:'Yards After Catch',   description: 'Yards gained after catch' },
  receiving_first_downs:     { abbr: '1D',  name:'1st Downs (Rec)',     description: 'First downs via receptions' },
  receiving_epa:             { abbr: 'EPA', name:'Rec EPA',             description: 'Expected Points Added (receiving)' },
  receiving_2pt_conversions: { abbr: '2PC', name:'2-Pt Rec',            description: 'Two-point reception conversions' },

  // Extra
  special_teams_tds: { abbr: 'STTD', name: 'ST TDs',           description: 'Special teams touchdowns' },
};

const StatsTableWithChart: React.FC<Props> = ({ data }) => {
  const [selectedStat, setSelectedStat] = useState<string | null>(null);
  const [filterSeason, setFilterSeason] = useState<number | ''>('');
  const [filterWeek, setFilterWeek] = useState<number | ''>('');

  // 1) Flatten nested JSON objects
  const rows = useMemo(() => {
    return data.map(row => {
      const flat: Record<string, any> = {};
      Object.entries(row).forEach(([k, v]) => {
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          Object.entries(v).forEach(([subk, subv]) => flat[subk] = subv);
        } else {
          flat[k] = v;
        }
      });
      return flat;
    });
  }, [data]);

  if (!rows.length) return null;

  // 2) Derive all column keys, preserving natural order
  const allKeys = useMemo(() => {
    const keys = new Set<string>();
    // seed with these three if present
    ['season','week','opponent_team'].forEach(k => rows[0][k] !== undefined && keys.add(k));
    // then all others
    Object.keys(rows[0]).forEach(k => keys.add(k));
    return Array.from(keys);
  }, [rows]);

  // 3) Gather unique seasons & weeks for filters
  const seasons = useMemo(() =>
    Array.from(new Set(rows.map(r => r.season))).sort((a,b) => (b as number) - (a as number)),
  [rows]);

  const weeks = useMemo(() =>
    Array.from(new Set(rows.map(r => r.week))).sort((a,b) => (a as number) - (b as number)),
  [rows]);

  // 4) Filter rows for chart
  const chartRows = useMemo(() =>
    rows.filter(r =>
      (filterSeason === '' || r.season === filterSeason) &&
      (filterWeek   === '' || r.week   === filterWeek)
    ),
  [rows, filterSeason, filterWeek]);

  // 5) Build Chart.js data when a stat is selected
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
            {allKeys.map(key => {
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
              {allKeys.map(c => <td key={c}>{r[c] ?? '–'}</td>)}
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
