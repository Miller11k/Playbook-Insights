// Import libraries needed to have information to and from API
import { Request, Response } from 'express'; // Router might not be needed if exported directly
import { printRequestHeaders, printRequestParams, printRequestQuery, printRouteHit } from '../../../helpers/routePrintHelper.js';
import { isValidTeamID } from '../../../helpers/validateHelper.js';
import { teamDBClient } from '../../../config/dbConfig.js';

/**
 * @route GET / (within the router handling defensive stats)
 * @description Retrieves defensive statistics, week, and opponent for a given team's games.
 *
 * @queryparam {string} team - The team abbreviation to retrieve statistics for.
 * @queryparam {number} [season] - (Optional) The season year (1920 onward).
 * @queryparam {number} [week] - (Optional) The week number (1-22).
 * @queryparam {string} [opponent] - (Optional) The opponent team abbreviation.
 *
 * @returns {Object[]} 200 - Array of game objects containing week, opponent_team, and defensive stats.
 * @returns {Object} 400 - Error if the request parameters are missing or invalid.
 * @returns {Object} 404 - Error if no matching records are found.
 * @returns {Object} 500 - Error if there is an issue with the database or server.
 */
export async function getTeamDefensiveStats(req: Request, res: Response): Promise<void> {
    // Assuming this function is mounted on a route like /api/team-defensive-stats or similar
    printRouteHit("GET", req.baseUrl + req.path); // Use req.path or req.baseUrl if applicable
    printRequestParams(req.params);
    printRequestHeaders(req.headers);
    printRequestQuery(req.query);

    try {
        const team = req.query.team; // Get team from query parameters

        // --- Validation ---
        if (!team) {
            res.status(400).json({ error: "Query parameter 'team' is required." });
            return;
        }
        const teamID = (team as string).toUpperCase();
        if (!isValidTeamID(teamID)) {
            res.status(400).json({ error: "Invalid team ID provided." });
            return;
        }
        if (!teamDBClient) {
            console.error("Database client is not initialized for team stats.");
            res.status(500).json({ error: "Database service unavailable." });
            return;
        }

        // --- Build Query ---
        const tableName = `${teamID}_game_logs`;
        const filters: string[] = [];
        const values: any[] = [];
        let paramIndex = 1; // Start parameter index at $1

        // Season Filter
        if (req.query.season) {
            const season = parseInt(req.query.season as string, 10);
            if (isNaN(season) || season < 1920 || season > new Date().getFullYear() + 1) { // Allow current year + 1 for upcoming
                res.status(400).json({ error: "Invalid season year." });
                return;
            }
            filters.push(`season = $${paramIndex++}`);
            values.push(season);
        }

        // Week Filter
        if (req.query.week) {
            const week = parseInt(req.query.week as string, 10);
            if (isNaN(week) || week < 1 || week > 22) { // Standard week range
                res.status(400).json({ error: "Invalid week number (must be 1-22)." });
                return;
            }
            filters.push(`week = $${paramIndex++}`);
            values.push(week);
        }

        // Opponent Filter
        if (req.query.opponent) {
            const opponent = (req.query.opponent as string).toUpperCase();
            if (!isValidTeamID(opponent)) {
                res.status(400).json({ error: "Invalid opponent team ID." });
                return;
            }
            filters.push(`opponent_team = $${paramIndex++}`);
            values.push(opponent);
        }

        // === SQL QUERY MODIFICATION ===
        // Select week, opponent_team, and the defensive_stats JSON blob
        const query = `
            SELECT
                week,
                opponent_team,
                defensive_stats
            FROM "${tableName}"
            ${filters.length > 0 ? "WHERE " + filters.join(" AND ") : ""}
            ORDER BY season ASC, week ASC; -- Add ordering for consistency
        `;
        console.log(`Executing query for ${tableName}: ${query} with values: ${JSON.stringify(values)}`);


        // --- Execute Query ---
        const result = await teamDBClient.query(query, values);

        // --- Handle Results ---
        if (result.rowCount === 0) {
            // It's often better to return an empty array than 404 if the query was valid but found no results
            res.status(200).json([]);
            // Alternatively, keep 404 if preferred:
            // res.status(404).json({ message: "No defensive stats found for the specified criteria." });
            return;
        }

        // === RESPONSE MAPPING MODIFICATION ===
        // Map rows to include week, opponent_team, and spread the defensive_stats object
        const responseData = result.rows.map(row => {
            // Defensive stats are expected to be a JSON object stored in the DB
            // Spread its contents into the main object
            return {
                week: row.week,
                opponent_team: row.opponent_team,
                ...(row.defensive_stats || {}) // Spread the stats, provide empty obj fallback if null/missing
            };
        });

        res.status(200).json(responseData);

    } catch (error: any) {
        console.error("Database query error in getTeamDefensiveStats:", error);
        // Check for specific DB errors if needed (e.g., table not found)
        if (error.code === '42P01') { // PostgreSQL error code for undefined table
             res.status(404).json({ error: `Game logs not found for team '${(req.query.team as string).toUpperCase()}'. Ensure data is ingested.` });
        } else {
             res.status(500).json({ error: "Internal Server Error processing defensive stats request." });
        }
    }
}

export default getTeamDefensiveStats;