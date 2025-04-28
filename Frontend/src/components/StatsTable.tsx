import React from 'react';
import './StatsTable.css';

interface StatsTableProps {
  data: any[];           // array of game‐log objects
}

interface StatDef {
  abbr: string;
  name: string;
  description: string;
}

// Map each DB key → NFL abbr + tooltip info
const STAT_DEFINITIONS: Record<string, StatDef> = {
  season:        { abbr: 'Yr',   name: 'Season',              description: 'Calendar year of the season' },
  week:          { abbr: 'Wk',   name: 'Week',                description: 'Week number within the season' },
  opponent_team: { abbr: 'Opp',  name: 'Opponent',            description: 'Opposing team abbreviation' },

  // Passing
  completions:             { abbr: 'CMP',  name: 'Completions',             description: 'Number of completed passes' },
  attempts:                { abbr: 'ATT',  name: 'Attempts',                description: 'Number of pass attempts' },
  passing_yards:           { abbr: 'YDS',  name: 'Passing Yards',           description: 'Total yards gained by passing' },
  passing_tds:             { abbr: 'TD',   name: 'Passing Touchdowns',      description: 'Total passing touchdowns' },
  interceptions:           { abbr: 'INT',  name: 'Interceptions',           description: 'Number of passes intercepted' },
  sacks:                   { abbr: 'SCK',  name: 'Sacks',                  description: 'Times quarterback was sacked' },
  sack_yards:              { abbr: 'SKY',  name: 'Sack Yards',              description: 'Yards lost due to sacks' },
  sack_fumbles:            { abbr: 'FUM',  name: 'Sack Fumbles',            description: 'Fumbles on sacks' },
  sack_fumbles_lost:       { abbr: 'FL',   name: 'Fumbles Lost',           description: 'Fumbles lost after sacks' },
  passing_air_yards:       { abbr: 'AYA',  name: 'Air Yards',              description: 'Yards thrown in the air' },
  passing_yards_after_catch:{abbr: 'YAC', name: 'Yards After Catch',      description: 'Yards gained after catch' },
  passing_first_downs:     { abbr: '1D',   name: 'Passing First Downs',     description: 'First downs via passing' },
  passing_epa:             { abbr: 'EPA',  name: 'Expected Points Added',   description: 'Value over expected points' },
  passing_2pt_conversions: { abbr: '2PC',  name: '2-Pt Conversions',        description: 'Successful two-point attempts' },

  // Rushing
  carries:                { abbr: 'CAR',  name: 'Carries',                description: 'Number of rushing attempts' },
  rushing_yards:          { abbr: 'YDS',  name: 'Rushing Yards',          description: 'Total yards gained by rushing' },
  rushing_tds:            { abbr: 'TD',   name: 'Rushing Touchdowns',     description: 'Touchdowns scored on rushes' },
  rushing_fumbles:        { abbr: 'FUM',  name: 'Rushing Fumbles',        description: 'Fumbles while rushing' },
  rushing_fumbles_lost:   { abbr: 'FL',   name: 'Fumbles Lost',           description: 'Fumbles lost on rushes' },
  rushing_first_downs:    { abbr: '1D',   name: 'Rushing First Downs',    description: 'First downs via rushing' },
  rushing_epa:            { abbr: 'EPA',  name: 'Expected Points Added',   description: 'Rushing efficiency measure' },
  rushing_2pt_conversions:{ abbr: '2PC',  name: '2-Pt Conversions',        description: 'Successful two-point rushes' },

  // Receiving
  receptions:             { abbr: 'REC',  name: 'Receptions',             description: 'Number of catches' },
  targets:                { abbr: 'TGT',  name: 'Targets',               description: 'Number of throws to receiver' },
  receiving_yards:        { abbr: 'YDS',  name: 'Receiving Yards',        description: 'Yards gained by receptions' },
  receiving_tds:          { abbr: 'TD',   name: 'Receiving Touchdowns',   description: 'Touchdowns via receptions' },
  receiving_fumbles:      { abbr: 'FUM',  name: 'Receiving Fumbles',      description: 'Fumbles while receiving' },
  receiving_fumbles_lost: { abbr: 'FL',   name: 'Fumbles Lost',           description: 'Fumbles lost after reception' },
  receiving_air_yards:    { abbr: 'AYA',  name: 'Air Yards',             description: 'Yards thrown in the air' },
  receiving_yards_after_catch:{abbr: 'YAC',name:'Yards After Catch',      description:'Yards gained post-catch' },
  receiving_first_downs:  { abbr: '1D',   name: 'Receiving First Downs',  description: 'First downs via receptions' },
  receiving_epa:          { abbr: 'EPA',  name: 'Expected Points Added',   description: 'Receiving efficiency measure' },
  receiving_2pt_conversions:{abbr:'2PC', name: '2-Pt Conversions',        description:'Two-point catches' },

  // Extra
  special_teams_tds:      { abbr: 'STTD', name: 'Special Teams TDs',      description: 'Touchdowns on special teams' },
};

const StatsTable: React.FC<StatsTableProps> = ({ data }) => {
  if (!data.length) return null;

  // 1) flatten each game entry
  const rows = data.map((row: any) => {
    const flat: Record<string, any> = {};
    Object.entries(row).forEach(([k, v]) => {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        Object.entries(v).forEach(([subk, subv]) => (flat[subk] = subv));
      } else {
        flat[k] = v;
      }
    });
    return flat;
  });

  // 2) pick columns in order
  const allKeys = Array.from(
    new Set(
      // season,week,opp first
      ['season','week','opponent_team']
        .concat(Object.keys(STAT_DEFINITIONS))
        .filter(key => rows[0][key] !== undefined)
    )
  );

  return (
    <div className="stats-table-wrapper">
      <table className="stats-table">
        <thead>
          <tr>
            {allKeys.map(key => {
              const def = STAT_DEFINITIONS[key];
              return (
                <th key={key} title={def ? `${def.name}: ${def.description}` : ''}>
                  {def ? def.abbr : key}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {allKeys.map(c => (
                <td key={c}>{r[c] ?? '–'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StatsTable;
