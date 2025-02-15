// Import libraries needed to have information to and from API
import { Request, Response, Router } from 'express';

// Create a new router instance to define and group related routes
const router = Router();

// A GET request is used to retrieve data from the server. 
// It does not modify the server's state and is typically used 
// to fetch resources, query database entries, or return API responses.

// TODO: FILL IN INFORMATION OF DESCRIPTION
/**
 * GET {ROUTE} - {SHORT DESCRIPTION}
 *
 * @async
 * @function
 * @param {Request} req - The HTTP request object.
 * @param {Response} res - The HTTP response object.
 *
 * @description {LONGER DESCRIPTION}
 */
router.get('{ROUTE}', async (req: Request, res: Response) => {

    console.log('*-------------------------------------------*');
    console.log('GET {ROUTE} endpoint hit');
    console.log('*-------------------------------------------*');

    try {
    // Example on how to get data from header
    // const {VARIABLE} = req.headers['{KEY TERM}'];

    // Example on how to data from the body
    // const { {VARIABLE 1}, {VARIABLE 2}, etc.} = req.body;
      

    // Example on how to send response

    // Error codes:
    // 400 - Bad Request: Invalid request parameters
    // 401 - Unauthorized: Authentication required or failed
    // 403 - Forbidden: User does not have permission
    // 404 - Not Found: Resource not found
    // 409 - Conflict: Request conflicts with current state
    // 500 - Internal Server Error: Unexpected server error
    // 502 - Bad Gateway: Invalid response from upstream server
    // 503 - Service Unavailable: Server temporarily overloaded or down
    //
    // ERROR EXAMPLE (RETURNED IN JSON FORMAT):
    // res.status(400).json({ error: 'Bad request' });
    // return;
    //

    // Success codes:
    // 200 - OK: Request successful, returning expected response
    // 201 - Created: Resource successfully created
    // 202 - Accepted: Request accepted but processing not completed
    // 204 - No Content: Request successful but no response body
    //
    // SUCCESS EXAMPLE (RETURNED IN JSON FORMAT):
    // res.status(200).json({ message: 'Success', data: {} });
    // return;

    

    
    } catch (error) {
        console.error('Error in {ROUTE}:', error);

        // Handle errors down here
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;