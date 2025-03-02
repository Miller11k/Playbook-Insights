// Import libraries needed to have information to and from API
import { Request, Response, Router } from 'express';
import { printRequestHeaders, printRequestParams, printRequestQuery, printRouteHit } from '../../../helpers/routePrintHelper.js';
import { isValidPlayerID } from '../../../helpers/validateHelper.js';
import { formatPlayerID } from '../../../helpers/formatHelper.js';
import { playerDBClient, teamDBClient } from '../../../config/dbConfig.js';

// Create a new router instance to define and group related routes
const router = Router();

/**
 * @route GET /player-info
 * @description Retrieves basic information about a player from the database.
 * 
 * @queryparam {string} id - The player ID to retrieve information for.
 * 
 * @returns {Object} 200 - Player information JSON.
 * @returns {Object} 400 - Error if no player ID is provided or if the ID is invalid.
 * @returns {Object} 404 - Error if the player is not found.
 * @returns {Object} 500 - Error if there is an issue with the database or server.
 */
router.get('/', async (req: Request, res: Response) => {
    printRouteHit("GET", "/player-info");
    printRequestParams(req.params);
    printRequestHeaders(req.headers);
    printRequestQuery(req.query);

    try {

        if (!req.query.id) {
            res.status(400).json({ error: "No player ID provided" });
            return;
        }
        
        let playerID = req.query.id as string;  

        // Ensure playerID is valid before formatting
        if (!(await isValidPlayerID(playerID))) {
            res.status(400).json({ error: "Invalid player ID" });
            return;
        }

        // Format the player ID
        const formattedID = formatPlayerID(playerID);

        // If formatting fails, return an error response
        if (!formattedID) {
            res.status(400).json({ error: "Unable to format player ID" });
            return;
        }

        playerID = formattedID;

        if (!playerDBClient) {
            res.status(500).json({ error: "Database client is not initialized." });
            return;
        }
        
        const query = "SELECT info FROM player_basic_info WHERE id = $1;";
        const result = await playerDBClient.query(query, [playerID]);

        if (result.rowCount === 0) {
            res.status(404).json({ error: "Player not found" });
            return;
        }

        // Send the `info` JSON stored in the database
        res.status(200).json(result.rows[0].info);

    } catch (error) {
        console.error("Database query error:", error);
        res.status(500).json({ error: "Internal Server Error" });
        return;
    }
});

export default router;
