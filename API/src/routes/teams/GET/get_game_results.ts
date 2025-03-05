// Import libraries needed to have information to and from API
import { Request, Response, Router } from 'express';
import { printRequestHeaders, printRequestParams, printRequestQuery, printRouteHit } from '../../../helpers/routePrintHelper.js';
import { isValidTeamID } from '../../../helpers/validateHelper.js';
import { teamDBClient } from '../../../config/dbConfig.js';

// Create a new router instance to define and group related routes
const router = Router();

/**
 * Route handler for fetching game results.
 * @name GET /game-results
 * @function
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {void} Sends JSON response with game results or an error message.
 */
router.get('/', async (req: Request, res: Response) => {
    printRouteHit("GET", "/game-results");
    printRequestParams(req.params);
    printRequestHeaders(req.headers);
    printRequestQuery(req.query);

    // Attempt to fetch game results from the database
    try {
        // Validate query parameters
        if (!req.query.team) {
            res.status(400).json({ error: "No team provided" });
            return;
        }

        const teamID = (req.query.team as string).toUpperCase();
        
        // Validate team ID
        if (!isValidTeamID(teamID)) {
            res.status(400).json({ error: "Invalid team ID" });
            return;
        }   
        
        // Check if the database client is initialized
        if (!teamDBClient) {
            res.status(500).json({ error: "Database client is not initialized." });
            return;
        }

        const tableName = `${teamID}_game_logs`;

        // Query parameters with validation
        const filters: string[] = [];
        const values: any[] = [];

        // Validate and add season to the filter
        if (req.query.season) {
            const season = parseInt(req.query.season as string, 10);
            if (isNaN(season) || season < 1920 || season > new Date().getFullYear()) {
                res.status(400).json({ error: "Invalid season. Must be a four-digit year from 1920 onward." });
                return;
            }
            filters.push("season = $"+(values.length+1));   // Add the filter to the query
            values.push(season);
        }

        // Validate and add week to the filter
        if (req.query.week) {
            const week = parseInt(req.query.week as string, 10);
            if (isNaN(week) || week < 1 || week > 22) {
                res.status(400).json({ error: "Invalid week. Must be a number between 1 and 22." });
                return;
            }
            filters.push("week = $"+(values.length+1));  // Add the filter to the query
            values.push(week);
        }

        // Validate and add opponent to the filter
        if (req.query.opponent) {
            const opponent = (req.query.opponent as string).toUpperCase();
            if (!isValidTeamID(opponent)) {
                res.status(400).json({ error: "Invalid opponent team ID." });
                return;
            }
            filters.push("opponent_team = $"+(values.length+1));    // Add the filter to the query
            values.push(opponent);
        }

        // Set the query to fetch the game results
        const query = `
            SELECT game_result
            FROM "${tableName}" 
            ${filters.length ? "WHERE " + filters.join(" AND ") : ""};
        `;

        const result = await teamDBClient.query(query, values);

        // Return 404 if no results
        if (result.rowCount === 0) {
            res.status(404).json({ error: "No game results found for the specified criteria." });
            return;
        }

        res.status(200).json(result.rows.map(row => row.game_result));
    } catch (error) {
        console.error("Database query error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;