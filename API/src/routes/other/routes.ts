import { Router } from 'express';

const router = Router();

/**
 * @route /routes
 * Returns a hardcoded JSON list of all available routes and their methods.
 */
router.get('/', (req, res) => {
    const available_routes = {
        routes: [
            {
                route: '/',
                methods: ['GET']
            },
            {
                route: '/routes',
                methods: ['GET']
            }
        ]
    };

    res.json(available_routes);
});

export default router;