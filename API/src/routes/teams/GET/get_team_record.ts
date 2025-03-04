// Import libraries and helper functions
import { Request, Response, Router } from 'express';
import { printRequestHeaders, printRequestParams, printRequestQuery, printRouteHit } from '../../../helpers/routePrintHelper.js';
import { isValidTeamID } from '../../../helpers/validateHelper.js';
import { teamDBClient } from '../../../config/dbConfig.js';

// Create a new router instance
const router = Router();

// Define the GET route for fetching the team record
// Note: We use "/" here because the route is mounted at "/team-record"
router.get('/', async (req: Request, res: Response) => {
    // Log the route hit and print request details
    printRouteHit("GET", "/team-record");
    printRequestParams(req.params);
    printRequestHeaders(req.headers);
    printRequestQuery(req.query);

    try {
        // Validate the required 'team' query parameter
        if (!req.query.team) {
            res.status(400).json({ error: "No team provided" });
            return;
        }
        const teamID = (req.query.team as string).toUpperCase();

        // Check that the teamID is valid
        if (!isValidTeamID(teamID)) {
            res.status(400).json({ error: "Invalid team ID" });
            return;
        }

        // Ensure the database client is initialized
        if (!teamDBClient) {
            res.status(500).json({ error: "Database client is not initialized." });
            return;
        }

        // Determine the table name based on the team ID
        const tableName = `"${teamID}_game_logs"`;

        // Build an array for SQL filters and corresponding values
        const filters: string[] = [];
        const values: any[] = [];

        // If a season is provided, validate and add it as a filter
        if (req.query.season) {
            const season = parseInt(req.query.season as string, 10);
            if (isNaN(season) || season < 1920 || season > new Date().getFullYear()) {
                res.status(400).json({ error: "Invalid season. Must be a four-digit year from 1920 onward." });
                return;
            }
            filters.push("season = $" + (values.length + 1));
            values.push(season);
        }

        // If a week is provided, validate and add it as a filter
        if (req.query.week) {
            const week = parseInt(req.query.week as string, 10);
            if (isNaN(week) || week < 1 || week > 22) {
                res.status(400).json({ error: "Invalid week. Must be a number between 1 and 22." });
                return;
            }
            filters.push("week = $" + (values.length + 1));
            values.push(week);
        }

        // If an opponent is provided, validate and add it as a filter
        if (req.query.opponent) {
            const opponent = (req.query.opponent as string).toUpperCase();
            if (!isValidTeamID(opponent)) {
                res.status(400).json({ error: "Invalid opponent team ID." });
                return;
            }
            filters.push("opponent_team = $" + (values.length + 1));
            values.push(opponent);
        }

        // Construct the SQL query to select the game_result column from the game logs table
        const query = `
            SELECT game_result 
            FROM ${tableName} 
            ${filters.length ? "WHERE " + filters.join(" AND ") : ""};
        `;

        // Execute the query
        const result = await teamDBClient.query(query, values);

        // If no rows were found, return a 404 error
        if (result.rowCount === 0) {
            res.status(404).json({ error: "No game results found for the specified criteria." });
            return;
        }

        // Initialize counters for wins, losses, ties and games counted
        let wins = 0;
        let losses = 0;
        let ties = 0;
        let gamesCounted = 0;

        // Process each game result to calculate the record
        for (const row of result.rows) {
            const gameResult = row.game_result;
            // Skip BYE weeks since there is no game played
            if (gameResult === "BYE") {
                continue;
            }
            
            let parsed: any;
            if (typeof gameResult === 'string') {
                // If the string is exactly "[object Object]", it's not valid JSON.
                if (gameResult.trim() === "[object Object]") {
                    console.error("Invalid game_result string encountered:", gameResult);
                    continue;
                }
                try {
                    parsed = JSON.parse(gameResult);
                } catch (err) {
                    console.error("Failed to parse game_result:", gameResult, err);
                    continue;
                }
            } else if (typeof gameResult === 'object') {
                parsed = gameResult;
            } else {
                console.error("Unexpected type for game_result:", gameResult);
                continue;
            }

            // Ensure that team_score and opponent_score are present and numbers
            if (typeof parsed.team_score === 'number' && typeof parsed.opponent_score === 'number') {
                gamesCounted++;
                if (parsed.team_score > parsed.opponent_score) {
                    wins++;
                } else if (parsed.team_score < parsed.opponent_score) {
                    losses++;
                } else {
                    ties++;
                }
            }
        }

        // Return the aggregated record as a JSON response
        res.status(200).json({ wins, losses, ties, gamesCounted });
    } catch (error) {
        console.error("Database query error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;