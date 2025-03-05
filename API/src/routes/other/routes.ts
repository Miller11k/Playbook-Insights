// Import libraries needed to have information to and from API
import { Request, Response, Router } from 'express';
import { printRouteHit } from '../../helpers/routePrintHelper.js';

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
    printRouteHit('GET', '/routes');    // Log the route hit

    try {
        const availableRoutes = [
            { route: '/status', methods: ['GET'] },
            { route: '/routes', methods: ['GET'] },
            { route: '/players', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
            { route: '/teams', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
            { route: '/defense/performance', methods: ['GET'] },
            { route: '/games', methods: ['GET', 'POST'] },
            { route: '/rosters', methods: ['GET', 'POST', 'PUT', 'DELETE'] }
        ];

        res.status(200).json({ routes: availableRoutes });
    } catch (error) {
        console.error('Error in /routes:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
