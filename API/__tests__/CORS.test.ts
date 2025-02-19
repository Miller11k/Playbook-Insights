import request from 'supertest';
import express, { Request, Response } from 'express';
import { corsConfig } from '../src/config/cors';

// Initialize Express application
const app = express();

// Apply CORS configuration middleware
app.use(corsConfig);

/**
 * Test route to verify CORS settings.
 * @route GET /test-cors
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
app.get('/test-cors', (req: Request, res: Response) => {
    res.send('CORS Test Passed');
});

/**
 * Test suite for CORS configuration.
 */
describe('CORS Configuration', () => {
    /**
     * Test that requests from allowed origins receive the correct CORS headers.
     */
    it('should allow requests from allowed origins', async () => {
        const response = await request(app)
            .get('/test-cors')
            .set('Origin', 'http://localhost:3000');

        // Check if the Access-Control-Allow-Origin header is set correctly
        expect(response.headers['access-control-allow-origin']).toBe('*');
        expect(response.status).toBe(200);
    });

    /**
     * Test that the server allows the specified HTTP methods in preflight requests.
     */
    it('should allow specified HTTP methods', async () => {
        const response = await request(app)
            .options('/test-cors');

        // Verify that allowed methods are included in the response headers
        expect(response.headers['access-control-allow-methods']).toMatch(/GET|POST|PUT|DELETE|OPTIONS/);
        expect(response.status).toBe(204); // No content response for preflight request
    });
});
