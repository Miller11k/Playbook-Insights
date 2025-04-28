import { Request, Response } from 'express';
import { printRequestHeaders, printRequestParams, printRequestQuery, printRouteHit } from '../../../helpers/routePrintHelper.js';
import { isValidTeamID } from '../../../helpers/validateHelper.js';
import { teamDBClient, playerDBClient } from '../../../config/dbConfig.js';

interface PlayerReceivingStat {
    player_id?: string;
    player_name?: string;
    receiving_yards?: number | string | null;
}

// Interface for the result of our player info query using player_basic_info
interface PlayerInfoQueryResult {
    id: string;
    position: string | null;
}


export async function getTeamReceivingStats(req: Request, res: Response): Promise<void> {
    printRouteHit("GET", "/receiving-stats (or via / with headers)");
    printRequestParams(req.params);
    printRequestHeaders(req.headers);
    printRequestQuery(req.query);

    try {
        const teamQueryParam = req.query.team;
        if (!teamQueryParam) {
            res.status(400).json({ error: "Query parameter 'team' is required." });
            return;
        }
        const teamID = (teamQueryParam as string).toUpperCase();
        console.log(`Processing receiving stats for Team ID: ${teamID}`);

        if (!isValidTeamID(teamID)) {
             res.status(400).json({ error: "Invalid team ID format provided." });
             return;
        }
        if (!teamDBClient || !playerDBClient) {
             res.status(500).json({ error: "Database client(s) are not initialized." });
             return;
        }

        const tableName = `${teamID}_game_logs`;
        console.log(`Targeting table: ${tableName}`);

        // --- Build Query Filters (Restored season/week filters) ---
        const filters: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (req.query.season) {
            const season = parseInt(req.query.season as string, 10);
            if (isNaN(season) || season < 1920 || season > new Date().getFullYear() + 1) {
                res.status(400).json({ error: "Invalid season year provided." });
                return;
            }
            filters.push(`season = $${paramIndex++}`);
            values.push(season);
        }

        if (req.query.week) {
            const week = parseInt(req.query.week as string, 10);
            if (isNaN(week) || week < 1 || week > 22) {
                res.status(400).json({ error: "Invalid week number provided (must be 1-22)." });
                return;
            }
            filters.push(`week = $${paramIndex++}`);
            values.push(week);
        }

        // if (req.query.opponent) { /* ... add opponent filter if needed ... */ }


        // --- Query 1: Get Game Logs with Player Stats ---
        const teamQuery = `
            SELECT season, week, opponent_team, player_recieving_stats -- Verify typo if needed
            FROM "${tableName}"
            ${filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""}
            ORDER BY season ASC, week ASC;
        `;
        console.log("Executing Game Log Query:", teamQuery);
        console.log("With Values:", values); // Check if season/week values appear here
        const gameLogResult = await teamDBClient.query(teamQuery, values);
        console.log(`Game Log Query finished. Rows returned: ${gameLogResult.rows.length}`);

        if (gameLogResult.rows.length === 0) {
            console.log("No game logs found, sending 404.");
            res.status(404).json({ message: "No game logs found for the specified criteria." });
            return;
        }

        // --- Extract Unique Player IDs ---
        const playerIds = new Set<string>();
        gameLogResult.rows.forEach(row => {
             // Use optional chaining and nullish coalescing for safety
            (row.player_recieving_stats ?? []).forEach((player: PlayerReceivingStat) => {
                if (player.player_id) {
                    playerIds.add(player.player_id);
                }
            });
        });
        const uniquePlayerIds = Array.from(playerIds);
        console.log(`Found ${uniquePlayerIds.length} unique player IDs across game logs.`);

        // --- Query 2: Get Player Positions from player_basic_info ---
        const playerPositionMap = new Map<string, string>(); // Map ID to Position (or 'UNKNOWN')
        if (uniquePlayerIds.length > 0) {
            // Query player_basic_info, extract 'position' from the 'info' JSON column
            const playerInfoQuery = `
                SELECT
                    id,                        -- The player ID column
                    info ->> 'position' AS position -- Extract 'position' key as text
                FROM player_basic_info         -- Correct table name
                WHERE id = ANY($1::text[])      -- Correct ID column name
            `;
            console.log("Executing Player Info Query using 'player_basic_info' table.");
            try {
                // Specify QueryResultRow interface for better type safety if needed, using PlayerInfoQueryResult here
                const playerInfoResult = await playerDBClient.query<PlayerInfoQueryResult>(playerInfoQuery, [uniquePlayerIds]);
                console.log(`Player Info Query finished. Found info for ${playerInfoResult.rows.length} players in player_basic_info.`);

                playerInfoResult.rows.forEach((player) => {
                    // player.id and player.position (extracted text) are available
                    if (player.id) {
                       // Store the position, defaulting to 'UNKNOWN' if null/empty
                       playerPositionMap.set(player.id, player.position?.trim() || 'UNKNOWN');
                    }
                });

                // Add players found in logs but *not* in player_basic_info to map as UNKNOWN
                 uniquePlayerIds.forEach(reqId => {
                     if (!playerPositionMap.has(reqId)) {
                         console.log(`Warning: Player ID ${reqId} from game logs not found in player_basic_info or has no position.`);
                         playerPositionMap.set(reqId, 'UNKNOWN');
                     }
                 });

            } catch (playerDbError: any) {
                 console.error("!!! ERROR fetching player positions from player_basic_info:", playerDbError);
                 // Set all positions to UNKNOWN as a fallback if DB fails
                 uniquePlayerIds.forEach(id => playerPositionMap.set(id, 'UNKNOWN'));
                 console.log("Proceeding with UNKNOWN positions for all players due to player DB error.");
            }
        }


        // --- Process Results: Aggregate Positional Yards using Position Map ---
        console.log("Starting data processing loop...");
        let processedData: any[] = [];
        try {
            processedData = gameLogResult.rows.map((row, index) => {
                let wr_yards = 0;
                let te_yards = 0;
                let rb_yards = 0;
                const playerStatsArray = row.player_recieving_stats ?? []; // Default to empty array

                playerStatsArray.forEach((player: PlayerReceivingStat) => {
                    const yards = Number(player.receiving_yards) || 0;
                    // Lookup position from the map we built
                    const position = (player.player_id ? playerPositionMap.get(player.player_id) : 'UNKNOWN')?.toUpperCase() ?? 'UNKNOWN';

                    if (position === 'WR') {
                        wr_yards += yards;
                    } else if (position === 'TE') {
                        te_yards += yards;
                    } else if (position === 'RB' || position === 'HB' || position === 'FB') {
                        rb_yards += yards;
                    }
                });

                return {
                    season: row.season,
                    week: row.week,
                    opponent_team: row.opponent_team,
                    wr_yards: wr_yards,
                    te_yards: te_yards,
                    rb_yards: rb_yards,
                };
            }); // End of .map()
            console.log("Finished data processing loop successfully.");
        } catch (mapError: any) {
            console.error("!!! ERROR during .map() processing:", mapError);
             if (!res.headersSent) {
                res.status(500).json({ error: "Error processing game log data."});
             }
             return; // Exit if map fails
        }


        // --- Send Response ---
        console.log("Attempting to send response...");
        // Log first 2 and last 2 items to check recent data if filtering by season
        const logSample = processedData.length <= 4
                        ? processedData
                        : [...processedData.slice(0, 2), ...processedData.slice(-2)];
        console.log("Sample of final processed data:", JSON.stringify(logSample, null, 2));
        console.log(`Sending ${processedData.length} processed records with status 200.`);

        res.status(200).json(processedData);
        console.log("Response successfully sent.");

    } catch (error: any) {
        console.error("!!! UNCAUGHT ERROR in getTeamReceivingStats:", error);
        if (!res.headersSent) {
           res.status(500).json({ error: "Internal Server Error", details: error.message });
        }
    }
}

export default getTeamReceivingStats;