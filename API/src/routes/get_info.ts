// Import libraries needed to have information to and from API
import { Request, Response, Router } from 'express';
import { printRequestHeaders, printRequestParams, printRequestQuery, printRouteHit } from '../helpers/routePrintHelper.js';
import { isValidTeamID } from '../helpers/validateHelper.js';
import { teamDBClient } from '../config/dbConfig.js';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';

import playerSearchRouter from './players/GET/get_player_names.js';
import teamSearchRouter   from './teams/GET/get_team_names.js';

import { getPlayerExtraData } from './players/GET/get_player_extra_data.js';
import { getPlayerInfo } from './players/GET/get_player_info.js';
import {getPlayerPassingStats} from './players/GET/get_player_passing_stats.js';
import {getPlayerReceivingStats} from './players/GET/get_player_receiving_stats.js';
import {getPlayerRushingStats} from './players/GET/get_player_rushing_stats.js';

import { getGameResults } from './teams/GET/get_game_results.js';
import {getTeamDefensiveStats} from './teams/GET/get_team_defensive_stats.js';
import {getTeamInfo} from './teams/GET/get_team_info.js';
import {getTeamOffensiveStats} from './teams/GET/get_team_offensive_stats.js';
import {getTeamPassingStats} from './teams/GET/get_team_passing_stats.js';
import {getTeamReceivingStats} from './teams/GET/get_team_recieving_stats.js';
import {getTeamRecord} from './teams/GET/get_team_record.js';
import {getTeamRoster} from './teams/GET/get_team_roster.js';
import {getTeamRushingStats} from './teams/GET/get_team_rushing_stats.js';
import {getSpecialTeamsStats} from './teams/GET/get_team_special_team_stats.js';

// Create a new router instance to define and group related routes
const router = Router();

// 1) Player‐name search: GET /search?name=…
router.use('/search', playerSearchRouter);

// 2) Team‐name search: GET /search-team?query=…
router.use('/search-team', teamSearchRouter);

/**
 * Route handler for all data GET requests.
 * @name GET /game-results
 * @function
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {void} Sends JSON response with game results or an error message.
 */
router.get('/', async (req: Request, res: Response) => {

    // console.log("GET /");

    // Determine what is in the request headers (using req.headers)
    const entityType = req.headers['x-entity-type'] ? req.headers['x-entity-type'].toString().toLowerCase() : ''; // Save the entity type ("team" or "player") to a variable
    const statsType = req.headers['x-stats-type'] ? req.headers['x-stats-type'].toString().toLowerCase() : ''; // Save the stats type ("passing", "rushing", etc.) to a variable

    if(!entityType || !statsType){
        if(!entityType){
            res.status(400).json({ error: "Missing required header: x-entity-type" });
            return;
        } else if(!statsType){
            res.status(400).json({ error: "Missing required header: x-stats-type" });
            return;
        }
        // If both headers are missing, return an error
        res.status(400).json({ error: "Missing required headers: x-entity-type and/or x-stats-type" });
            return;
    }

    console.log(`Entity Type: ${entityType}`);
    console.log(`Stats Type: ${statsType}`);

    // Now, we know they have provided the needed headers, but we need to verify the headers are valid

    const validEntities = ['player', 'team'];
    const validPlayerStats = ['extra', 'info', 'passing', 'receiving', 'rushing']
    const validTeamStats = ['results', 'defensive', 'info', 'offensive', 'passing', 'receiving', 'record', 'roster', 'rushing', 'special']

    // Handle logic
    switch (entityType) {
        case 'player':
            // Handle player calls
            switch(statsType){
                case 'extra': return await getPlayerExtraData(req, res);
                case 'info': return await getPlayerInfo(req, res);
                case 'passing': return await getPlayerPassingStats(req, res);
                case 'receiving': return await getPlayerReceivingStats(req, res);
                case 'rushing': return await getPlayerRushingStats(req, res);
                default:    // If the stats type is not valid, return an error
                    res.status(400).json({ error: "Invalid x-stats-type." });
                    return;
            }

        case 'team':
            // Handle team calls
            switch(statsType){
                case 'results': return await getGameResults(req, res);
                case 'defensive': return await getTeamDefensiveStats(req, res);
                case 'info': return await getTeamInfo(req, res);
                case 'offensive': return await getTeamOffensiveStats(req, res);
                case 'passing': return await getTeamPassingStats(req, res);
                case 'receiving': return await getTeamReceivingStats(req, res);
                case 'record': return await getTeamRecord(req, res);
                case 'roster': return await getTeamRoster(req, res);
                case 'rushing': return await getTeamRushingStats(req, res);
                case 'special': return await getSpecialTeamsStats(req, res);
                default:    // If the stats type is not valid, return an error
                    res.status(400).json({ error: "Invalid stats type for team." });
                    return;
            }
        default:
            // If the entity type is not valid, return an error
            res.status(400).json({ error: "Invalid x-entity-type." });
            return;
    }
});

export default router;