import request from 'supertest';
import express from 'express';
import routesRouter from '../../../src/routes/other/routes'; // Adjust path as needed

/**
 * Initializes an Express application for testing.
 */
const app = express();
app.use(express.json()); // Ensures JSON parsing
app.use('/routes', routesRouter);

describe('Routes Endpoint', () => {
    /**
     * Test case to verify that the /routes endpoint returns a valid JSON response.
     * Ensures the API responds with HTTP 200 and includes expected route information.
     */
    it('should return a list of available routes', async () => {
        // Send a GET request to the /routes endpoint
        const response = await request(app).get('/routes');

        // Assert that the response status code is 200 (OK)
        expect(response.status).toBe(200);

        // Assert that the response body contains the expected routes array
        expect(response.body).toEqual({
            routes: [
                { route: '/status', methods: ['GET'] },
                { route: '/routes', methods: ['GET'] },
                { route: '/players', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
                { route: '/teams', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
                { route: '/defense/performance', methods: ['GET'] },
                { route: '/games', methods: ['GET', 'POST'] },
                { route: '/rosters', methods: ['GET', 'POST', 'PUT', 'DELETE'] }
            ]
        });
    });
});
