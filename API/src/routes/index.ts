/**
 * @module MainRouter
 * Aggregates and organizes all route definitions for the application.
 */

import { Router } from 'express';

// Import Routes
import statusRoute from './other/status.js';
import routesRoute from './other/routes.js'

// Create a router instance to group and manage related user routes
const router = Router();

/**
 * Basic Routes
 * 
 * @route /routes - List all available routes.
 * @route /status - Check API status.
 */
router.use('/status', statusRoute);
router.use("/routes", routesRoute);

// Export the configured router
export default router;