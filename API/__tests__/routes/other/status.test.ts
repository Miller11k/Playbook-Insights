import request from 'supertest';
import express from 'express';
import statusRoutes from '../../../src/routes/other/status';

/**
 * Initializes an Express application for testing.
 */
const app = express();

// Mount the status route at the '/status' endpoint
app.use('/status', statusRoutes);

describe('Status Route', () => {
    /**
     * Test case to verify that the status route returns a valid response.
     * It ensures the API responds with an HTTP 200 status code and contains
     * the expected HTML content in the response body.
     */
    it('should return a valid status response', async () => {
        // Send a GET request to the /status endpoint
        const response = await request(app).get('/status');

        // Assert that the response status code is 200 (OK)
        expect(response.status).toBe(200);

        // Assert that the response body contains the expected HTML content
        expect(response.text).toContain('<h1>API IS UP</h1>'); // Validate HTML content
    });
});