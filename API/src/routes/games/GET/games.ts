// Import libraries needed to have information to and from API
import { Request, Response, Router } from 'express';
import { logRequest, sendSuccessResponse, sendErrorResponse } from '../../helpers/get_helper';

// Create a new router instance to define and group related routes
const router = Router();

/**
 * GET /games - Retrieve game statistics
 *
 * @async
 * @function
 * @param {Request} req - The HTTP request object.
 * @param {Response} res - The HTTP response object.
 *
 * @description Fetch game statistics with optional filtering by season, week, team, or opponent.
 */
router.get('/games', async (req: Request, res: Response) => {
    logRequest('/games');

    try {
        const { season, week, team, opponent } = req.query;

        // Example validation
        if (season && isNaN(Number(season))) {
            return sendErrorResponse(res, 400, 'Season must be a number');
        }
        if (week && isNaN(Number(week))) {
            return sendErrorResponse(res, 400, 'Week must be a number');
        }
        if (team && typeof team !== 'string') {
            return sendErrorResponse(res, 400, 'Team must be a string');
        }
        if (opponent && typeof opponent !== 'string') {
            return sendErrorResponse(res, 400, 'Opponent must be a string');
        }

        // Mocked response (replace with database call)
        const mockGameStats = [
            {
                season: 2022,
                week: 1,
                team: 'TB',
                opponent: 'DAL',
                team_score: 31,
                opponent_score: 29
            }
        ];

        sendSuccessResponse(res, 200, { games: mockGameStats }, "Game statistics retrieved successfully");
    } catch (error) {
        console.error('Error in /games:', error);
        sendErrorResponse(res, 500, 'Internal Server Error');
    }
});

export default router;
