// Import libraries needed to have information to and from API
import { Request, Response, Router } from 'express';
import { printRouteHit } from '../../helpers/routePrintHelper.js';
import { playerDBClient, teamDBClient } from '../../config/dbConfig.js';

// Create a new router instance to define and group related routes
const router = Router();

/**
 * GET /routes - Get available routes
 *
 * @async
 * @function
 * @param {Request} req - The HTTP request object.
 * @param {Response} res - The HTTP response object.
 *
 * @description Returns a list of all available API routes and their supported methods.
 */
router.get('/', async (req: Request, res: Response) => {
    printRouteHit('GET', '/test-db');    // Log the route hit

    try {
        if (!teamDBClient || !playerDBClient) {
          res.status(500).json({ error: "Database clients are not initialized." });
          return;
        }
    
        const playerData = await playerDBClient.query('SELECT * FROM player_basic_info LIMIT 5;');
        const teamData = await teamDBClient.query('SELECT * FROM team_info LIMIT 5;');
    
        res.json({
          message: 'Database connections verified.',
          players: playerData.rows,
          teams: teamData.rows,
        });
      } catch (error) {
        console.error('Database query error:', error);
        res.status(500).json({ error: 'Database query failed' });
      }
});

export default router;