// Import libraries needed to have information to and from API
import { Request, Response, Router } from 'express';
import { logRequest, sendSuccessResponse, sendErrorResponse } from '../../helpers/get_helper';

// Create a new router instance to define and group related routes
const router = Router();

/**
 * GET /teams - Retrieve team statistics
 *
 * @async
 * @function
 * @param {Request} req - The HTTP request object.
 * @param {Response} res - The HTTP response object.
 *
 * @description Fetch team statistics with optional filtering by team ID and season.
 */
router.get('/teams', async (req: Request, res: Response) => {
    logRequest('/teams');

    try {
        const { team_id, season } = req.query;

        // Example validation
        if (team_id && typeof team_id !== 'string') {
            return sendErrorResponse(res, 400, 'Invalid team_id format');
        }
        if (season && isNaN(Number(season))) {
            return sendErrorResponse(res, 400, 'Season must be a number');
        }

        // Mocked response (replace with database call)
        const mockTeamStats = [
            {
                team_id: 'TB',
                team_name: 'Tampa Bay Buccaneers',
                season: 2022,
                wins: 13,
                losses: 4,
                total_points: 450
            }
        ];

        sendSuccessResponse(res, 200, { teams: mockTeamStats }, "Team statistics retrieved successfully");
    } catch (error) {
        console.error('Error in /teams:', error);
        sendErrorResponse(res, 500, 'Internal Server Error');
    }
});

export default router;
