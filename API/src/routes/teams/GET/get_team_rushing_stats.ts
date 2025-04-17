import { Request, Response, Router } from 'express';
import { printRequestHeaders, printRequestParams, printRequestQuery, printRouteHit } from '../../../helpers/routePrintHelper.js';
import { isValidTeamID } from '../../../helpers/validateHelper.js';
import { teamDBClient } from '../../../config/dbConfig.js';

export async function getTeamRushingStats(req: Request, res: Response) {
  printRouteHit("GET", "/rushing-stats");
  printRequestParams(req.params);
  printRequestHeaders(req.headers);
  printRequestQuery(req.query);

  try {
    if (!req.query.team) {
      res.status(400).json({ error: "No team provided" });
      return;
    }

    const teamID = (req.query.team as string).toUpperCase();
    console.log(`Team ID: ${teamID}`);

    if (!isValidTeamID(teamID)) {
      res.status(400).json({ error: "Invalid team ID" });
      return;
    }

    if (!teamDBClient) {
      res.status(500).json({ error: "Database client is not initialized." });
      return;
    }

    const tableName = `${teamID}_game_logs`;
    console.log(`Using table: ${tableName}`);

    const filters: string[] = [];
    const values: any[] = [];

    if (req.query.season) {
      const season = parseInt(req.query.season as string, 10);
      if (isNaN(season) || season < 1920 || season > new Date().getFullYear()) {
        res.status(400).json({ error: "Invalid season. Must be a four-digit year from 1920 onward." });
        return;
      }
      filters.push("season = $" + (values.length + 1));
      values.push(season);
    }

    if (req.query.week) {
      const week = parseInt(req.query.week as string, 10);
      if (isNaN(week) || week < 1 || week > 22) {
        res.status(400).json({ error: "Invalid week. Must be a number between 1 and 22." });
        return;
      }
      filters.push("week = $" + (values.length + 1));
      values.push(week);
    }

    if (req.query.opponent) {
      const opponent = (req.query.opponent as string).toUpperCase();
      if (!isValidTeamID(opponent)) {
        res.status(400).json({ error: "Invalid opponent team ID." });
        return;
      }
      filters.push("opponent_team = $" + (values.length + 1));
      values.push(opponent);
    }

    const teamQuery = `
      SELECT season, week, season_type, opponent_team, game_result,
             json_build_object(
               'carries', offensive_stats->>'carries',
               'rushing_yards', offensive_stats->>'rushing_yards',
               'rushing_tds', offensive_stats->>'rushing_tds'
             ) AS aggregated_rushing_stats,
             player_rushing_stats
      FROM "${tableName}"
      ${filters.length ? "WHERE " + filters.join(" AND ") : ""};
    `;
    console.log("Team Query:", teamQuery);
    console.log("Values:", values);

    const teamResult = await teamDBClient.query(teamQuery, values);
    console.log("Team Query result:", teamResult.rows);

    if (teamResult.rowCount === 0) {
      res.status(404).json({ error: "No rushing stats found for the specified criteria." });
      return;
    }

    res.status(200).json(teamResult.rows);
  } catch (error) {
    console.error("Database query error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

export default getTeamRushingStats;