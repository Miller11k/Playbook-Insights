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
import getTeamRecievingStats from './teams/GET/get_team_recieving_stats.js'; // Corrected spelling? receiving vs recieving
import getTeamRecord from './teams/GET/get_team_record.js';
import getTeamRoster from './teams/GET/get_team_roster.js';


import getPlayerRushingStats from './players/GET/get_player_rushing_stats.js';
import getPlayerPassingStats from './players/GET/get_player_passing_stats.js';
import getPlayerExtraData from './players/GET/get_player_extra_data.js';
import getPlayerReceivingStats from './players/GET/get_player_receiving_stats.js';
// Correctly import the search handler (assuming filename is get_player_names.ts/js)
import searchRouteHandler from './players/GET/get_player_names.js'; // Renamed import variable for clarity
import searchTeam from './teams/GET/get_team_names.js'; // Assuming this is the correct import for team search


// Create a router instance to group and manage related user routes
const router = Router();

/**
 * Registers all routes with their respective paths.
 * (Documentation comments remain the same)
 */

// --- Other Routes ---
router.use('/status', statusRoute);
router.use("/routes", routesRoute);
router.use("/test-db", testDBRoute);

// --- Player Info ---
router.use("/player-info", getPlayerInfoRoute);

// --- Team Info & Stats ---
router.use("/team-info", getTeamInfoRoute);
router.use("/offensive-stats", getTeamOffensiveStats);
router.use("/defensive-stats", getTeamDefensiveStats); // Make sure frontend calls this path for defense section
router.use("/special-team-stats", getTeamSpecialTeamStats);
router.use("/game-results", getGameResults);
router.use("/passing-stats", getTeamPassingStats); // Team passing
router.use("/rushing-stats", getTeamRushingStats); // Team rushing
router.use("/receiving-stats", getTeamRecievingStats); // Team receiving (check filename/import spelling)
router.use("/team-record", getTeamRecord);
router.use("/team-roster", getTeamRoster);
// --- Team Search ---
router.use("/search-team", searchTeam); // Assuming this is the correct import for team search

// --- Player Stats ---
// Removed duplicate routes
router.use("/player-rushing-stats", getPlayerRushingStats);
router.use("/player-passing-stats", getPlayerPassingStats);
router.use("/player-extra-data", getPlayerExtraData);
router.use("/player-receiving-stats", getPlayerReceivingStats);

// --- Player Search ---
// ** FIX: Use the correct handler imported for search **
router.use("/search", searchRouteHandler);


/**
 * Exports the configured Express router for use in the main application.
 * @type {Router}
 */
export default router;
