/**
 * @module MainRouter
 * Aggregates and organizes all route definitions for the application.
 */

import { Router } from 'express';

// Import Routes
import statusRoute from './other/status.js';
import routesRoute from './other/routes.js';
import testDBRoute from './other/test-db.js';

import getPlayerInfoRoute from './players/GET/get_player_info.js';
import getTeamInfoRoute from './teams/GET/get_team_info.js';

import getTeamOffensiveStats from './teams/GET/get_team_offensive_stats.js';
import getTeamDefensiveStats from './teams/GET/get_team_defensive_stats.js';
import getTeamSpecialTeamStats from './teams/GET/get_team_special_team_stats.js';
import getGameResults from './teams/GET/get_game_results.js';

import getTeamPassingStats from './teams/GET/get_team_passing_stats.js';
import getTeamRushingStats from './teams/GET/get_team_rushing_stats.js';
import getTeamRecievingStats from './teams/GET/get_team_recieving_stats.js';
import getTeamRecord from './teams/GET/get_team_record.js';
import getTeamRoster from './teams/GET/get_team_roster.js';


import getPlayerRushingStats from './players/GET/get_player_rushing_stats.js';
import getPlayerPassingStats from './players/GET/get_player_passing_stats.js';
import getPlayerExtraData from './players/GET/get_player_extra_data.js';
import getPlayerReceivingStats from './players/GET/get_player_receiving_stats.js';


// Create a router instance to group and manage related user routes
const router = Router();

/**
 * Registers all routes with their respective paths.
 * 
 * @route GET /status - Check API status.
 * @route GET /routes - List all available routes.
 * @route GET /test-db - Test database connection.
 * 
 * @route GET /player-info - Retrieve player information.
 * 
 * @route GET /team-info - Retrieve team information.
 * @route GET /offensive-stats - Retrieve offensive statistics for a team.
 * @route GET /defensive-stats - Retrieve defensive statistics for a team.
 * @route GET /special-team-stats - Retrieve special teams statistics for a team.
 * @route GET /game-results - Retrieve past game results for a team.
 * 
 * @route GET /passing-stats - Retrieve passing statistics for a team.
 * @route GET /rushing-stats - Retrieve rushing statistics for a team.
 * @route GET /recieving-stats - Retrieve receiving statistics for a team.
 * @route GET /team-record - Retrieve win-loss record for a team.
 * @route GET /team-roster - Retrieve team roster.
 * 
 * @route GET /player-rushing-stats - Retrieve rushing statistics for a player.
 * @route GET /player-passing-stats - Retrieve passing statistics for a player.
 * @route GET /player-extra-data - Retrieve extra data for a player.
 * @route GET /player-receiving-stats - Retrieve receiving statistics for a player.
 * 
 */

router.use('/status', statusRoute);
router.use("/routes", routesRoute);
router.use("/test-db", testDBRoute);

router.use("/player-info", getPlayerInfoRoute);

router.use("/team-info", getTeamInfoRoute);
router.use("/offensive-stats", getTeamOffensiveStats);
router.use("/defensive-stats", getTeamDefensiveStats);
router.use("/special-team-stats", getTeamSpecialTeamStats);
router.use("/game-results", getGameResults);

router.use("/passing-stats", getTeamPassingStats);
router.use("/rushing-stats", getTeamRushingStats);
router.use("/recieving-stats", getTeamRecievingStats);
router.use("/team-record", getTeamRecord);
router.use("/team-roster", getTeamRoster);


router.use("/player-rushing-stats", getPlayerRushingStats);
router.use("/player-passing-stats", getPlayerPassingStats);
router.use("/player-extra-data", getPlayerExtraData);
router.use("/player-passing-stats", getPlayerPassingStats);
router.use("/player-receiving-stats", getPlayerReceivingStats);
router.use("/player-rushing-stats", getPlayerRushingStats);

/**
 * Exports the configured Express router for use in the main application.
 * @type {Router}
 */
export default router;