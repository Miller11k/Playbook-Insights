import { Request, Response, Router } from 'express';
import { printRouteHit, printRequestHeaders, printRequestParams, printRequestQuery } from '../../../helpers/routePrintHelper.js';
import { isValidTeamID } from '../../../helpers/validateHelper.js';
import { playerDBClient } from '../../../config/dbConfig.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
    printRouteHit("GET", "/team-roster");
    printRequestParams(req.params);
    printRequestHeaders(req.headers);
    printRequestQuery(req.query);

    try {
        // Read team code from the query parameter 'team'
        const teamCode = (req.query.team as string)?.toUpperCase();
        if (!teamCode) {
            res.status(400).json({ error: "No team code provided" });
            return;
        }

        if (!isValidTeamID(teamCode)) {
            res.status(400).json({ error: "Invalid team code" });
            return;
        }

        if (!playerDBClient) {
            res.status(500).json({ error: "Database client is not initialized." });
            return;
        }

        // Optional filters
        let season: number | undefined;
        let week: number | undefined;
        let opponent: string | undefined;

        if (req.query.season) {
            season = parseInt(req.query.season as string, 10);
            if (isNaN(season) || season < 1920 || season > new Date().getFullYear()) {
                res.status(400).json({ error: "Invalid season. Must be a four-digit year from 1920 onward." });
                return;
            }
        }

        if (req.query.week) {
            week = parseInt(req.query.week as string, 10);
            if (isNaN(week) || week < 1 || week > 22) {
                res.status(400).json({ error: "Invalid week. Must be a number between 1 and 22." });
                return;
            }
        }

        if (req.query.opponent) {
            opponent = (req.query.opponent as string).toUpperCase();
            if (!isValidTeamID(opponent)) {
                res.status(400).json({ error: "Invalid opponent team code." });
                return;
            }
        }

        // Query to get all players whose team (in their basic info JSON) matches the team code.
        const query = `
            SELECT id, info
            FROM player_basic_info
            WHERE info->>'team' = $1
        `;
        const result = await playerDBClient.query(query, [teamCode]);

        if (result.rowCount === 0) {
            res.status(404).json({ error: "No players found for the specified team." });
            return;
        }

        let roster: { [name: string]: string } = {};

        // If no optional filters are provided, return the entire roster.
        if (season === undefined && week === undefined && opponent === undefined) {
            result.rows.forEach((row: any) => {
                roster[row.info.name] = row.id;
            });
            res.status(200).json(roster);
            return;
        }

        // Otherwise, filter the roster to include only players who have a matching game log record.
        const filteredPlayers = await Promise.all(result.rows.map(async (row: any) => {
            const playerID = row.id;
            // Construct the player's game log table name and quote it to handle special characters.
            const rawTableName = `${playerID}_game_logs`;
            const gameLogTable = `"${rawTableName}"`;

            const filters: string[] = [];
            const values: any[] = [];

            if (season !== undefined) {
                filters.push("season = $" + (values.length + 1));
                values.push(season);
            }
            if (week !== undefined) {
                filters.push("week = $" + (values.length + 1));
                values.push(week);
            }
            if (opponent !== undefined) {
                filters.push("opponent_team = $" + (values.length + 1));
                values.push(opponent);
            }

            // Query the player's game log table to see if there is at least one matching record.
            const gameLogQuery = `
                SELECT 1 FROM ${gameLogTable}
                ${filters.length ? "WHERE " + filters.join(" AND ") : ""}
                LIMIT 1;
            `;
            try {
                // Use non-null assertion since we've already checked playerDBClient is not null.
                const gameLogResult = await playerDBClient!.query(gameLogQuery, values);
                if (gameLogResult.rowCount! > 0) {
                    return row;
                } else {
                    return null;
                }
            } catch (err) {
                console.error(`Error querying game logs for player ${playerID}:`, err);
                return null;
            }
        }));

        filteredPlayers.forEach((row: any) => {
            if (row) {
                roster[row.info.name] = row.id;
            }
        });

        if (Object.keys(roster).length === 0) {
            res.status(404).json({ error: "No players found matching the specified criteria." });
        } else {
            res.status(200).json(roster);
        }
    } catch (error) {
        console.error("Database query error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;
