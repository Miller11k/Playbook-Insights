import { Router, Request, Response } from 'express';
import { teamDBClient } from '../../../config/dbConfig.js';
import { printRouteHit, printRequestHeaders, printRequestParams, printRequestQuery } from '../../../helpers/routePrintHelper.js';

const router = Router();

/**
 * @route GET /api/teams/search
 * @description Searches for teams by name or city using raw SQL.
 * @queryparam {string} query - The search term (min length 2).
 * @returns {Array<Object>} 200 - An array of team objects { code, name }.
 * @returns {Object} 400 - Error if 'query' param is missing or too short.
 * @returns {Object} 500 - Internal server error.
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
    printRouteHit("GET", "/search-team");
    printRequestParams(req.params);
    printRequestHeaders(req.headers);
    printRequestQuery(req.query);

    const searchTerm = req.query.query as string;

    if (!searchTerm || searchTerm.trim().length < 2) {
        res.status(400).json({ error: 'Search query must be at least 2 characters long.' });
        return;
    }

    if (!teamDBClient) {
        console.error("Database client (teamDBClient) is not initialized.");
        res.status(500).json({ error: "Database client is not initialized." });
        return;
    }

    try {
        // Search multiple fields within the team_data JSON (adjust paths and ILIKE for your DB)
        const query = `
            SELECT team_abbr, team_data
            FROM team_info
            WHERE
                team_data->>'team_name' ILIKE $1 OR
                team_data->>'team_nick' ILIKE $1 OR
                team_data->>'team_city' ILIKE $1 OR
                team_data->>'team_abbr' ILIKE $1
            LIMIT 15;
        `;
        const values = [`%${searchTerm}%`]; // Add wildcards for LIKE

        const result = await teamDBClient.query(query, values);

        // --- Process Results ---
        const results = result.rows.map(team => {
            // Extract code and a display name (prefer name, fallback to nick/abbr)
            const name = team.team_data?.team_name || team.team_data?.team_nick || team.team_abbr || 'Unknown Team';
            return {
                code: team.team_abbr, // Use team_abbr as the code
                name: name
            };
        });

        if (results.length === 0) {
             console.log(`No teams found matching query: ${searchTerm}`);
        }

        res.status(200).json(results);
        return;

    } catch (error: any) {
        console.error("Error searching teams:", error);
        res.status(500).json({ error: "Internal Server Error", detail: error.message });
        return;
    }
});

export default router;