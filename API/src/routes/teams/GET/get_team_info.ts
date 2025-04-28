// Import libraries needed to have information to and from API
import { Request, Response, Router } from 'express';
import { printRequestHeaders, printRequestParams, printRequestQuery, printRouteHit } from '../../../helpers/routePrintHelper.js';
import { isValidTeamID } from '../../../helpers/validateHelper.js';
import { teamDBClient } from '../../../config/dbConfig.js';
import { filterNullValues } from '../../../helpers/JSONHelper.js';


/**
 * @route GET /team-info
 * @description Retrieves information about a team from the database.
 * 
 * @queryparam {string} team - The team abbreviation to retrieve information for.
 * 
 * @returns {Object} 200 - Team information JSON.
 * @returns {Object} 400 - Error if no team abbreviation is provided or if it is invalid.
 * @returns {Object} 404 - Error if the team is not found.
 * @returns {Object} 500 - Error if there is an issue with the database or server.
 */
export async function getTeamInfo(req: Request, res: Response) {
    printRouteHit("GET", "/team-info");
    printRequestParams(req.params);
    printRequestHeaders(req.headers);
    printRequestQuery(req.query);

    try {
        if (!req.query.team) {
            res.status(400).json({ error: "No team provided" });
            return;
        }

        const teamID = (req.query.team as string).toUpperCase();

        if(!isValidTeamID(teamID)){
            res.status(400).json({ error: "Invalid team ID" });
            return;
        }   
        
        if (!teamDBClient) {
            res.status(500).json({ error: "Database client is not initialized." });
            return;
        }

        const query = "SELECT team_data FROM team_info WHERE team_abbr = $1;";
        const result = await teamDBClient.query(query, [teamID]);
        const filteredResult = filterNullValues(result.rows, "team_data");


        if ((filteredResult.length === 0) && (result.rows.length != 0)) {
            res.status(204).json({ error: "All info found for team was null." });
            return;  
        } else if (result.rows.length === 0) {
            res.status(404).json({ error: "Team not found." });
            return;
        }

        res.status(200).json(filteredResult[0].team_data);
    } catch (error) {
        console.error("Database query error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export default getTeamInfo;