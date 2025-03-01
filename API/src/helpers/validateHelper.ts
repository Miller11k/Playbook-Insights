import { teamDBClient, playerDBClient } from "../config/dbConfig.js";

/**
 * Validates a given player ID by checking its format and existence in the database.
 *
 * @param {string} playerID - The player ID to validate.
 * @returns {Promise<boolean>} - A promise resolving to `true` if the ID is valid and exists in the database, otherwise `false`.
 */
export async function isValidPlayerID(playerID: string): Promise<boolean> {
    // If no player ID was given, return false
    if (!playerID) {
        return false;
    }

    // If player ID is too long, return false
    if (playerID.length > 10){
        return false;
    }

    // If player ID contains any unexpected characters, return false
    if ((/[^0-9-]/.test(playerID))) {
        return false;
    }

    // If the player ID is too short or doesn't match the expected format (XX-XXXXXXX), attempt to correct it
    if (playerID.length < 10 || !/^\d{2}-\d{7}$/.test(playerID)) {
        // Remove all non-digit characters to extract only numeric values
        let digitsOnly = playerID.replace(/\D/g, ""); 
    
        // Ensure the extracted number has at least 9 digits by padding with leading zeros
        digitsOnly = digitsOnly.padStart(9, "0");
    
        // Reconstruct the player ID in the expected format: XX-XXXXXXX
        playerID = digitsOnly.slice(0, 2) + "-" + digitsOnly.slice(2);
    }

    // Validate that the reformatted player ID adheres to the required format
    if (!/^\d{2}-\d{7}$/.test(playerID)) {
        return false;
    }

    // Ensure that the database client is available before making queries
    if (!playerDBClient) {
        // Database client is uninitialized, returning false instead of throwing an error
        return false;
    }

    try {
        // Query the database to check if the player ID exists
        const query = "SELECT id FROM player_basic_info WHERE id = $1;";
        const result = await playerDBClient.query(query, [playerID]);

        // If the query returns at least one row, the player ID is valid
        return (result.rowCount !== null) && (result.rowCount > 0);
    } catch (error) {
        // If any database error occurs, return false
        return false;
    }
}


export function isValidTeamID(userInput: string): boolean {
    // Trim any leading or trailing spaces
    const trimmedInput = userInput.trim();

    // Check if input is empty
    if (trimmedInput.length === 0) {
        return false;
    }

    // Check if input is exactly 2 or 3 characters
    if (trimmedInput.length < 2 || trimmedInput.length > 3) {
        return false;
    }

    // Check if input contains only letters (no numbers or special characters)
    if (!/^[a-zA-Z]+$/.test(trimmedInput)) {
        return false;
    }

    // Convert input to uppercase for case-insensitive comparison
    const formattedInput = trimmedInput.toUpperCase();

    // Define the set of valid team IDs
    const teamIDs: Set<string> = new Set([
        "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE",
        "DAL", "DEN", "DET", "GB", "HOU", "IND", "JAX", "KC",
        "LA", "LAC", "LAR", "LV", "MIA", "MIN", "NE", "NO",
        "NYG", "NYJ", "OAK", "PHI", "PIT", "SD", "SEA", "SF",
        "STL", "TB", "TEN", "WAS"
    ]);

    // Check if input exists in the set of valid abbreviations
    return teamIDs.has(formattedInput);
}

export async function areDatabasesUp(): Promise<boolean> {
    return !!teamDBClient && !!playerDBClient;
}