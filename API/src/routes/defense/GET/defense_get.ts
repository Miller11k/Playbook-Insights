// Import libraries needed to have information to and from API
import { Request, Response, Router } from 'express';
import { logRequest, sendSuccessResponse, sendErrorResponse } from '../helpers/get_helper';

// Create a new router instance to define and group related routes
const router = Router();

/**
 * GET /defense/performance - Retrieve defensive performance data
 *
 * @async
 * @function
 * @param {Request} req - The HTTP request object.
 * @param {Response} res - The HTTP response object.
 *
 * @description Fetch defensive performance metrics with optional filtering by team, position, and number of past games.
 */
router.get('/defense/performance', async (req: Request, res: Response) => {
    logRequest('/defense/performance');

    try {
        const { team_id, position, games } = req.query;

        // Example validation
        if (!team_id || typeof team_id !== 'string') {
            return sendErrorResponse(res, 400, 'team_id is required and must be a string');
        }
        if (position && typeof position !== 'string') {
            return sendErrorResponse(res, 400, 'position must be a string');
        }
        if (games && (isNaN(Number(games)) || Number(games) <= 0)) {
            return sendErrorResponse(res, 400, 'games must be a positive number');
        }

        // Mocked response (replace with database call)
        const mockDefenseStats = [
            {
                team_id: 'TB',
                team_name: 'Tampa Bay Buccaneers',
                position: 'QB',
                games_analyzed: 5,
                passing_yards_allowed: 1020,
                rushing_yards_allowed: 400,
                sacks: 12,
                interceptions: 4
            }
        ];

        sendSuccessResponse(res, 200, { defense: mockDefenseStats }, "Defensive performance retrieved successfully");
    } catch (error) {
        console.error('Error in /defense/performance:', error);
        sendErrorResponse(res, 500, 'Internal Server Error');
    }
});

export default router;
