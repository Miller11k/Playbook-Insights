// Import libraries needed to have information to and from API
import { Request, Response, Router } from 'express';
import { printRequestHeaders, printRequestParams, printRequestQuery, printRouteHit } from '../../../helpers/routePrintHelper.js';
import { isValidPlayerID } from '../../../helpers/validateHelper.js';
import { formatPlayerID } from '../../../helpers/formatHelper.js';
import { playerDBClient, teamDBClient } from '../../../config/dbConfig.js';
import { filterNullValues } from '../../../helpers/JSONHelper.js';
import util from 'util';

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
export async function getPlayerInfo(req: Request, res: Response): Promise<void> {
    printRouteHit("GET", "/player-info");
    printRequestParams(req.params);
    printRequestHeaders(req.headers);
    printRequestQuery(req.query);

    try {
        const rawPlayerID = req.query.id as string; // Get raw ID first
        console.log(`[DEBUG] Received player ID: ${rawPlayerID}`); // Log raw ID

        if (!rawPlayerID) {
            console.log("[WARN] No player ID provided in query.");
            res.status(400).json({ error: "No player ID provided" });
            return;
        }

        let playerID = rawPlayerID;

        // Log validation result
        const isValid = await isValidPlayerID(playerID);
        console.log(`[DEBUG] isValidPlayerID result for '${playerID}': ${isValid}`);
        if (!isValid) {
            console.log(`[WARN] Invalid player ID detected: ${playerID}`);
            res.status(400).json({ error: "Invalid player ID" });
            return;
        }

        // Log formatting result
        const formattedID = formatPlayerID(playerID);
        console.log(`[DEBUG] formatPlayerID result for '${playerID}': ${formattedID}`);
        if (!formattedID) {
            console.log(`[WARN] Unable to format player ID: ${playerID}`);
            res.status(400).json({ error: "Unable to format player ID" });
            return;
        }
        playerID = formattedID; // Use formatted ID from now on
        console.log(`[DEBUG] Using formatted player ID: ${playerID}`);


        if (!playerDBClient) {
            console.error("[ERROR] playerDBClient is not initialized.");
            res.status(500).json({ error: "Database client is not initialized." });
            return;
        }

        // Select id too for verification, just in case
        const query = "SELECT id, info FROM player_basic_info WHERE id = $1;";
        console.log(`[DEBUG] Executing query: ${query} with params: [${playerID}]`);
        const result = await playerDBClient.query(query, [playerID]);
        // Log the raw database result structure deeply
        console.log(`[DEBUG] Raw DB result (Rows: ${result.rows.length}): ${util.inspect(result.rows, { depth: 3 })}`);

        // Check if rows exist before filtering
        if (result.rows.length === 0) {
            console.log(`[INFO] No database rows found for player ID: ${playerID}`);
            res.status(404).json({ error: "No player info found for the specified criteria." });
            return;
        }

        // Assuming filterNullValues checks the 'info' column and removes row if 'info' is null
        // Let's log BEFORE filtering to see the raw info column
        console.log(`[DEBUG] Raw info column value for row 0: ${util.inspect(result.rows[0]?.info, { depth: 2 })}`);

        const filteredResult = filterNullValues(result.rows, "info");
        console.log(`[DEBUG] Filtered result (Rows: ${filteredResult.length}) (after filterNullValues on 'info'): ${util.inspect(filteredResult, { depth: 3 })}`);


        if (filteredResult.length === 0) {
             // This condition implies rows were found, but the 'info' column was null or invalid JSON, leading to filtering
             console.log(`[INFO] Player row found (ID: ${playerID}), but 'info' column was null or filtered out.`);
             // Sending 404 is more appropriate than 204 if the required info is missing
             res.status(404).json({ error: "Player found, but required info is missing or invalid." });
             return;
        }

        // We should have a valid, non-null info object here
        const playerInfo = filteredResult[0].info;
        console.log(`[DEBUG] Extracted player info object: ${JSON.stringify(playerInfo)}`);

        // Check if playerInfo is actually an object before sending
        if (typeof playerInfo !== 'object' || playerInfo === null) {
             console.error(`[ERROR] Extracted 'info' is not a valid object for player ID ${playerID}. Value: ${playerInfo}`);
             res.status(500).json({ error: "Internal server error processing player info." });
             return;
        }

        console.log(`[INFO] Sending 200 OK response with player info for ID: ${playerID}`);
        res.status(200).json(playerInfo); // Send the 'info' object directly


    } catch (error: any) { // Catch block specifically for wider errors
        console.error(`[ERROR] Exception in getPlayerInfo for ID '${req.query.id}':`, error); // Log the actual error object
        res.status(500).json({ error: "Internal Server Error", detail: error.message }); // Add detail if possible
        return; // Explicit return
    }
}

export default getPlayerInfo;
