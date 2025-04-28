/**
 * Formats a given player ID to match the expected format (XX-XXXXXXX).
 *
 * @param {string} playerID - The player ID to format.
 * @returns {string | null} - The formatted player ID if successful, otherwise `null` if formatting is not possible.
 */
export function formatPlayerID(playerID: string): string | null {
    if (!playerID) {
        return null;
    }

    // Remove all non-digit characters
    let digitsOnly = playerID.replace(/\D/g, "");

    // Ensure we have at least 9 digits by padding with leading zeros
    digitsOnly = digitsOnly.padStart(9, "0");

    // Reconstruct the player ID in the expected format: XX-XXXXXXX
    const formattedID = digitsOnly.slice(0, 2) + "-" + digitsOnly.slice(2);

    // Validate that the formatted ID adheres to the required format
    return /^\d{2}-\d{7}$/.test(formattedID) ? formattedID : null;
}