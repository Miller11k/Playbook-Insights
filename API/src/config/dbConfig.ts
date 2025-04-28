import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pkg;
import type { Client as PGClient } from 'pg';

console.log("[DEBUG] Connecting to database with config:");
console.log(`[DEBUG]   HOST: ${process.env.DB_SERVER_HOSTNAME}`);
console.log(`[DEBUG]   PORT: ${process.env.DB_SERVER_PORT}`);
console.log(`[DEBUG]   USER: ${process.env.DB_SERVER_USERNAME}`);
console.log(`[DEBUG]   TEAM_DB_NAME: ${process.env.TEAM_DB_NAME}`);
console.log(`[DEBUG]   PLAYER_DB_NAME: ${process.env.PLAYER_DB_NAME}\n`);

/**
 * Creates a new PostgreSQL database client with the given database name.
 * 
 * @param {string} databaseName - The name of the database to connect to.
 * @returns {PGClient} - A configured PostgreSQL client instance.
 */
const createDBClient = (databaseName: string): PGClient => {
  console.log(`[DEBUG] createDBClient() called for DB: ${databaseName}`);
  return new Client({
    host: process.env.DB_SERVER_HOSTNAME,
    user: process.env.DB_SERVER_USERNAME?.replace(/"/g, ''),  // Remove quotes if present
    password: process.env.DB_SERVER_PASSWORD?.replace(/"/g, ''),
    database: databaseName.replace(/"/g, ''), // Ensure no extra quotes
    port: parseInt(process.env.DB_SERVER_PORT || '5432', 10),
    ssl: process.env.DB_REQUIRE_SSL === 'true' 
      ? { rejectUnauthorized: false } 
      : undefined,
  });
};

let teamDBClient: PGClient | null = null;
let playerDBClient: PGClient | null = null;

/**
 * Establishes connections to the Team and Player databases.
 * If a connection is already established, it does not create a new one.
 * 
 * @throws {Error} If database connection fails, the application will exit.
 * @returns {Promise<void>} Resolves when both databases are connected.
 */
export const connectDatabases = async (): Promise<void> => {
  console.log('[DEBUG] connectDatabases() invoked...');
  try {
    if (!teamDBClient) {
      console.log('[DEBUG] Creating Team DB Client...');
      teamDBClient = createDBClient(process.env.TEAM_DB_NAME as string);
      await teamDBClient.connect();
      console.log('[DEBUG] Successfully connected to Team Database.\n');
    } else {
      console.log('[DEBUG] Team DB Client already initialized.');
    }

    if (!playerDBClient) {
      console.log('[DEBUG] Creating Player DB Client...');
      playerDBClient = createDBClient(process.env.PLAYER_DB_NAME as string);
      await playerDBClient.connect();
      console.log('[DEBUG] Successfully connected to Player Database.\n');
    } else {
      console.log('[DEBUG] Player DB Client already initialized.');
    }
  } catch (error) {
    console.error('[DEBUG] Database connection error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
};

export { teamDBClient, playerDBClient };