import { IncomingHttpHeaders } from "http";

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

    console.log('*-------------------------------------------*\n');

    return;
}


/**
 * Logs the request headers in a structured format.
 *
 * @param {Record<string, string | string[]>} headers - The request headers object.
 * @returns {void} This function does not return a value.
 */
export function printRequestHeaders(headers: IncomingHttpHeaders): void {
    if (!headers || Object.keys(headers).length === 0) {
        console.log('No Request Headers Provided\n');
        return;
    }

    console.log('Request Headers:');
    for (const [key, value] of Object.entries(headers)) {
        if (value !== undefined) {
            console.log(`  ${key}: ${Array.isArray(value) ? value.join(', ') : value}`);
        }
    }

    console.log('\n');
    return;
}

/**
 * Logs the request parameters in a structured format.
 *
 * @param {Object} params - The request parameters object.
 * @returns {void} This function does not return a value.
 */
export function printRequestParams(params: Record<string, any>): void {

    // Initial check for empty parameters
    if (!params || Object.keys(params).length === 0) {
        console.log('No Request Parameters Provided\n');
        return;
    }

    // Now that we know there are parameters, print them
    console.log('Request Parameters:');
    for (const [key, value] of Object.entries(params)) {
        console.log(`  ${key}: ${value}`);
    }

    console.log('\n');
    return;
}


/**
 * Logs the request query in a structured format.
 *
 * @param {Object} params - The request parameters object.
 * @returns {void} This function does not return a value.
 */
export function printRequestQuery(params: Record<string, any>): void {

    // Initial check for empty query
    if (!params || Object.keys(params).length === 0) {
        console.log('No Request Query Provided\n');
        return;
    }

    // Now that we know there is a query, print it
    console.log('Request Query:');
    for (const [key, value] of Object.entries(params)) {
        console.log(`  ${key}: ${value}`);
    }

    console.log('\n');
    return;
}