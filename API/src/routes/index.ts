/**
 * @module MainRouter
 * Aggregates and organizes all route definitions for the application.
 */

import { Router } from 'express';

// Import Routes
import statusRoute from './other/status.js';
import routesRoute from './other/routes.js';
import testDBRoute from './other/test-db.js';

import getInfoRoutes from './get_info.js';
import getStatsRoute from './data/GET/get_stats.js';

import getplayerNames from './players/GET/get_player_names.js';
import getTeamNames from './teams/GET/get_team_names.js';


// Create a router instance to group and manage related user routes
const router = Router();

/**
 * Registers all routes with their respective paths.
 * 
 * @route GET /status - Check API status.
 * @route GET /routes - List all available routes.
 * @route GET /test-db - Test database connection.
 * 
 * @route GET / - Main route for fetching game results and player statistics.
 * 
 */

// --- Other Routes ---
router.use('/status', statusRoute);
router.use("/routes", routesRoute);
router.use("/test-db", testDBRoute);

router.use("/", getInfoRoutes);
router.use("/stats", getStatsRoute);

router.use("/search", getplayerNames);
router.use("/search-team", getTeamNames);

/**
 * Exports the configured Express router for use in the main application.
 * @type {Router}
 */
export default router;
