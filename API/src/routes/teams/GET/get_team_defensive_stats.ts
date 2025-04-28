// Import libraries needed to have information to and from API
import { Request, Response, Router } from 'express';
import { printRequestHeaders, printRequestParams, printRequestQuery, printRouteHit } from '../../../helpers/routePrintHelper.js';
import { isValidTeamID } from '../../../helpers/validateHelper.js';
import { teamDBClient } from '../../../config/dbConfig.js';
import { filterNullValues } from '../../../helpers/JSONHelper.js';

/**
 * @route GET /defensive-stats
 * @description Retrieves defensive statistics for a given team.
 * 
 * @queryparam {string} team - The team abbreviation to retrieve statistics for.
 * @queryparam {number} [season] - (Optional) The season year (1920 onward).
 * @queryparam {number} [week] - (Optional) The week number (1-22).
 * @queryparam {string} [opponent] - (Optional) The opponent team abbreviation.
 * 
 * @returns {Object[]} 200 - Defensive statistics JSON array.
 * @returns {Object} 400 - Error if the request parameters are missing or invalid.
 * @returns {Object} 404 - Error if no matching records are found.
 * @returns {Object} 500 - Error if there is an issue with the database or server.
 */
export async function getTeamDefensiveStats(req: Request, res: Response): Promise<void> {
    printRouteHit("GET", "/defensive-stats");
    printRequestParams(req.params);
    printRequestHeaders(req.headers);
    printRequestQuery(req.query);

    try {
        if (!req.query.team) {
            res.status(400).json({ error: "No team provided" });
            return;
        }

        const teamID = (req.query.team as string).toUpperCase();

        if (!isValidTeamID(teamID)) {
            res.status(400).json({ error: "Invalid team ID" });
            return;
        }   
        
        if (!teamDBClient) {
            res.status(500).json({ error: "Database client is not initialized." });
            return;
        }

        const tableName = `${teamID}_game_logs`;

        // Query parameters with validation
        const filters: string[] = [];
        const values: any[] = [];

        if (req.query.season) {
            const season = parseInt(req.query.season as string, 10);
            if (isNaN(season) || season < 1920 || season > new Date().getFullYear()) {
                res.status(400).json({ error: "Invalid season. Must be a four-digit year from 1920 onward." });
                return;
            }
            filters.push("season = $"+(values.length+1));
            values.push(season);
        }

        if (req.query.week) {
            const week = parseInt(req.query.week as string, 10);
            if (isNaN(week) || week < 1 || week > 22) {
                res.status(400).json({ error: "Invalid week. Must be a number between 1 and 22." });
                return;
            }
            filters.push("week = $"+(values.length+1));
            values.push(week);
        }

        if (req.query.opponent) {
            const opponent = (req.query.opponent as string).toUpperCase();
            if (!isValidTeamID(opponent)) {
                res.status(400).json({ error: "Invalid opponent team ID." });
                return;
            }
            filters.push("opponent_team = $"+(values.length+1));
            values.push(opponent);
        }

        const query = `
            SELECT
                week,
                opponent_team,
                defensive_stats
            FROM "${tableName}"
            ${filters.length ? "WHERE " + filters.join(" AND ") : ""}
            ORDER BY season ASC, week ASC
        `;
        console.log(`Executing query: ${query} with values: ${JSON.stringify(values)}`);
        const result = await teamDBClient.query(query, values);

        // No rows at all?
        if (result.rows.length === 0) {
        res.status(404).json({ error: "No defensive stats found for the specified criteria." });
        return;
        }

        // Filter out any rows whose stats blob is null
        const rowsWithStats = result.rows.filter(r => r.defensive_stats != null);
        if (rowsWithStats.length === 0) {
        res.status(204).json({ error: "All defensive stats for specified criteria were null." });
        return;
        }

        // Merge week & opponent_team into the stats object
        const responseData = rowsWithStats.map(row => ({
        week:       row.week,
        opponent_team: row.opponent_team,
        ...row.defensive_stats
        }));

        res.status(200).json(responseData);
    } catch (error) {
        console.error("Database query error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export default getTeamDefensiveStats;