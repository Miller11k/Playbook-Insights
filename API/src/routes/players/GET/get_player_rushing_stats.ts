import { Request, Response, Router } from 'express';
import { printRouteHit, printRequestHeaders, printRequestParams, printRequestQuery } from '../../../helpers/routePrintHelper.js';
import { isValidPlayerID, isValidTeamID } from '../../../helpers/validateHelper.js';
import { playerDBClient } from '../../../config/dbConfig.js';
import { filterNullValues } from '../../../helpers/JSONHelper.js';


export async function getPlayerRushingStats(req: Request, res: Response): Promise<void> {
    printRouteHit("GET", "/player-rushing-stats");
    printRequestParams(req.params);
    printRequestHeaders(req.headers);
    printRequestQuery(req.query);

    try {
        const playerID = req.query.id as string;
        if (!playerID) {
            res.status(400).json({ error: "No player ID provided" });
            return;
        }

        // Validate the player ID using the helper.
        if (!(await isValidPlayerID(playerID))) {
            res.status(400).json({ error: "Invalid player ID" });
            return;
        }

        if (!playerDBClient) {
            res.status(500).json({ error: "Database client is not initialized." });
            return;
        }

        // Construct the table name based on the design.
        // Wrap the table name in double quotes since it may contain special characters.
        const rawTableName = `${playerID}_game_logs`;
        const tableName = `"${rawTableName}"`;

        // Build filters for optional query parameters.
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

        // Construct the SQL query dynamically.
        const query = `
            SELECT rushing_stats, season, week, opponent_team
            FROM ${tableName}
            ${filters.length ? "WHERE " + filters.join(" AND ") : ""}
            ;
        `;

        const result = await playerDBClient.query(query, values);
        const filteredResult = filterNullValues(result.rows, "rushing_stats");

        if ((filteredResult.length === 0) && (result.rows.length != 0)) {
            res.status(204).json({ error: "All player rushing stats found for specified criteria were null." });
            return;
        } else if (result.rows.length === 0) {
            res.status(404).json({ error: "No rushing stats found for the specified criteria." });
            return;
        }

        // Return an array of rushing_stats JSON objects.
        res.status(200).json(filteredResult);
    } catch (error) {
        console.error("Database query error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export default getPlayerRushingStats;