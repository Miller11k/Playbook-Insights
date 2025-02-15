// Import libraries needed to have information to and from API
import { Request, Response, Router } from 'express';
import { logRequest, sendSuccessResponse, sendErrorResponse } from '../helpers/get_helper';

// Create a new router instance to define and group related routes
const router = Router();

/**
 * GET /status - Check API status
 *
 * @async
 * @function
 * @param {Request} req - The HTTP request object.
 * @param {Response} res - The HTTP response object.
 *
 * @description Returns an HTML response indicating that the API is running.
 */
router.get('/status', async (req: Request, res: Response) => {
    logRequest('/status');

    try {
        sendSuccessResponse(res, 200, {}, "API is running smoothly 🚀");
    } catch (error) {
        console.error('Error in /status:', error);
        sendErrorResponse(res, 500, 'Internal Server Error');
    }
});

export default router;
