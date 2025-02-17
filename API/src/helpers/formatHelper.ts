/**
 * Logs when a specific API route is hit, displaying the method and endpoint.
 * Ensures method is in uppercase and endpoint starts with a forward slash.
 *
 * @param {string} method - The HTTP method used for the request (e.g., GET, POST, PUT, DELETE).
 * @param {string} endpoint - The API endpoint being accessed.
 * @returns {void} This function does not return a value.
 */
export function printRouteHit(method: string, endpoint: string): void {
    // Convert method to uppercase to standardize format
    method = method.toUpperCase();

    // Ensure endpoint starts with a leading slash for consistency
    if (!endpoint.startsWith("/")) {
        endpoint = `/${endpoint}`;
    }

    // Remove trailing slash if present
    if (endpoint.endsWith("/")) {
        endpoint = endpoint.slice(0, -1);
    }

    // If the route is "/", it should be displayed as "/status" (the root route)
    if (endpoint === "" || endpoint === "/") {
        endpoint = "/status";
    }

    console.log('*-------------------------------------------*');

    // Log the appropriate message based on the HTTP method
    switch (method) {
        case "GET":
            console.log(`GET ${endpoint} endpoint hit`);
            break;
        case "POST":
            console.log(`POST ${endpoint} endpoint hit`);
            break;
        case "PUT":
            console.log(`PUT ${endpoint} endpoint hit`);
            break;
        case "DELETE":
            console.log(`DELETE ${endpoint} endpoint hit`);
            break;
        default:
            console.log(`Unknown ${endpoint} endpoint hit`);
            break;
    }

    console.log('*-------------------------------------------*');

    return;
}