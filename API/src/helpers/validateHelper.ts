/**
 * Validates a player ID.
 *
 * @param {string} playerId - The player ID to validate.
 * @returns {string | null} Returns an error message if the player ID is invalid, otherwise null.
 */ 

export function validatePlayerId(playerId: string): string | null {
    if (!playerId) {
        return 'Player ID is required';
    }
    return null;
}