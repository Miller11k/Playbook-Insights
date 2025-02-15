// Import libraries needed to have information to and from API
import { Request, Response, Router } from 'express';
import { logRequest, sendSuccessResponse, sendErrorResponse, validateParams } from '../helpers/get_helper';

// Create a new router instance to define and group related routes
const router = Router();

/**
 * GET /players - Retrieve player statistics
 *
 * @async
 * @function
 * @param {Request} req - The HTTP request object.
 * @param {Response} res - The HTTP response object.
 *
 * @description Fetch player statistics with optional filtering by player ID, season, week, team, and position.
 */
router.get('/players', async (req: Request, res: Response) => {
    logRequest('/players');

    try {
        const { player_id, season, week, team, position } = req.query;
        
        // Example validation
        if (player_id && typeof player_id !== 'string') {
            return sendErrorResponse(res, 400, 'Invalid player_id format');
        }
        if (season && isNaN(Number(season))) {
            return sendErrorResponse(res, 400, 'Season must be a number');
        }
        if (week && isNaN(Number(week))) {
            return sendErrorResponse(res, 400, 'Week must be a number');
        }
        
        // Mocked response (replace with database call)
        const mockPlayerStats = [
            {
                player_id: '00-0019596',
                player_name: 'Tom Brady',
                season: 2022,
                week: 1,
                team: 'TB',
                passing_yards: 212.0,
                passing_tds: 1
            }
        ];

        sendSuccessResponse(res, 200, { players: mockPlayerStats }, "Player statistics retrieved successfully");
    } catch (error) {
        console.error('Error in /players:', error);
        sendErrorResponse(res, 500, 'Internal Server Error');
    }
});

export default router;
