// src/routes/players/GET/get_player_names.ts
import { Router, Request, Response } from 'express';
// Adjust path to your actual helpers and config
// ** FIX: Add .js extension for ES Module resolution **
import { playerDBClient } from '../../../config/dbConfig.js';
import { printRouteHit, printRequestHeaders, printRequestParams, printRequestQuery } from '../../../helpers/routePrintHelper.js';
// Assuming validation/formatting helpers are not strictly needed for search, but import if used
// import { isValidPlayerID, formatPlayerID } from '../../../helpers/formatHelper.js';

const router = Router();

/**
 * @route GET /search
 * @description Searches for players by name using raw SQL. Mounted via MainRouter at /search.
 * @queryparam {string} name - The search term for the player's name. Minimum length 2.
 * @returns {Array<Object>} 200 - An array of player objects { id, name }.
 * @returns {Object} 400 - Error if 'name' query param is missing or too short.
 * @returns {Object} 500 - Internal server error.
 */
// Add explicit types for req and res
router.get('/', async (req: Request, res: Response): Promise<void> => { // Explicit return type Promise<void>
    // Use the path where the route is mounted in MainRouter
    printRouteHit("GET", "/search");
    printRequestParams(req.params);
    printRequestHeaders(req.headers);
    printRequestQuery(req.query);

    const searchTerm = req.query.name as string;

    if (!searchTerm || searchTerm.trim().length < 2) {
        // Add return after sending response
        res.status(400).json({ error: 'Search term must be at least 2 characters long.' });
        return;
    }

    // This check might be redundant if the import itself fails, but good practice
    if (!playerDBClient) {
        console.error("Database client (playerDBClient) is not initialized (check import).");
        // Add return after sending response
        res.status(500).json({ error: "Database client is not initialized." });
        return;
    }

    try {
        // --- Raw SQL Query ---
        // Adjust JSON access (->>'display_name', ->>'name') and ILIKE based on your DB (PostgreSQL example)
        // Parameterizing LIKE requires concatenating '%' in the value array.
        const query = `
            SELECT id, info
            FROM player_basic_info
            WHERE
                info->>'display_name' ILIKE $1 OR info->>'name' ILIKE $1
            LIMIT 20;
        `;
        const values = [`%${searchTerm}%`]; // Add wildcards for LIKE comparison

        const result = await playerDBClient.query(query, values);

        // --- Process Results ---
        const results = result.rows.map(player => {
            // Adjust access based on your actual JSON structure in 'info'
            const name = player.info?.display_name || player.info?.name || 'Unknown Name';
            return {
                id: player.id,
                name: name
            };
        });

        if (results.length === 0) {
             console.log(`No players found matching term: ${searchTerm}`);
        }

        // Add return after sending response
        res.status(200).json(results);
        return;

    } catch (error: any) {
        console.error("Error searching players:", error);
        // Add return after sending response
        res.status(500).json({ error: "Internal Server Error", detail: error.message });
        return;
    }
});

export default router;