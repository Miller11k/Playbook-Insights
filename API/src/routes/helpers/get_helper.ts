// helpers.ts

/**
 * Logs request details for debugging.
 * @param {string} route - The API route being accessed.
 */
export function logRequest(route: string) {
    console.log('*-------------------------------------------*');
    console.log(`Endpoint hit: ${route}`);
    console.log('*-------------------------------------------*');
}

/**
 * Sends a standardized error response.
 * @param {Response} res - The HTTP response object.
 * @param {number} statusCode - HTTP status code.
 * @param {string} message - Error message.
 */
export function sendErrorResponse(res: any, statusCode: number, message: string) {
    console.error(`Error: ${message}`);
    res.status(statusCode).json({ error: message });
}

/**
 * Sends a standardized success response.
 * @param {Response} res - The HTTP response object.
 * @param {number} statusCode - HTTP status code.
 * @param {object} data - Response data.
 * @param {string} message - Success message (optional).
 */
export function sendSuccessResponse(res: any, statusCode: number, data: object, message: string = 'Success') {
    res.status(statusCode).json({ message, data });
}

/**
 * Validates required parameters in a request.
 * @param {object} params - Object containing required parameters.
 * @returns {string | null} - Returns an error message if validation fails, otherwise null.
 */
export function validateParams(params: { [key: string]: any }): string | null {
    for (const [key, value] of Object.entries(params)) {
        if (!value) {
            return `Missing required parameter: ${key}`;
        }
    }
    return null;
}
